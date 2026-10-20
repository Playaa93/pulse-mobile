import { tr } from "@/i18n";
// Health hub and its four detail screens (spec §7.6–7.10). Ported from Pulse's src/server/queries/health.ts.
import { fitnessLevel } from "@/core/algorithms/fitnessLevel";
import { HEALTHSPAN_TERM_COUNT, healthspanConfig, type HealthspanContribution } from "@/core/algorithms/healthspan";
import { minuteMeanHr } from "@/core/algorithms/stress";
import type { LoadStatus } from "@/core/engine/strain";
import { addDays, daysBetween, fractionalYears, localMidnight, wall } from "@/lib/time";
import { acwrTone, dayLabel, formatDay, weekOf } from "./_lib";
import {
  type DayRow,
  dayStartOf,
  finite,
  lastStored,
  loadDays,
  loadSeries,
  maxHrOf,
  meanSd,
  minutePoints,
  ms,
  nightReason,
  none,
  ok,
  type QueryCtx,
  stressNow,
  todayOf,
  vitalReason,
  trendPoints,
  daySpansOf,
  exercisesBetween,
} from "./common";
import { illnessRaised, VITAL_LABEL } from "./home";
import { zoneBounds, zoneNote, zoneRows } from "./strain";
import type {
  ChipTone,
  EcgReading,
  FitnessVM,
  HeartRhythm,
  Measurement,
  HealthHubVM,
  HealthspanContributor,
  HealthspanVM,
  HeartRateLive,
  HeartRateVM,
  Metric,
  MonitorVM,
  StressVM,
  Vital,
  VitalKey,
} from "./types";
import { metricsWithLoggedBody } from "@/data/body";

// ── Hub ─────────────────────────────────────────────────────────────────────

/** Health hub `/health`: today's values (spec §7.6). */
export async function getHealthHub(ctx: QueryCtx): Promise<HealthHubVM> {
  const today = todayOf(ctx);
  const rows = await loadDays(ctx, addDays(today, -35), today);
  const row = rows.get(today);
  const [hsVm, monitor, fit, stressSeries, heartRate] = await Promise.all([
    getHealthspan(today, ctx),
    getMonitor(today, ctx, rows),
    getFitness(ctx),
    loadSeries(ctx, today, "stress"),
    latestHr(ctx),
  ]);
  const hs = hsVm.result;
  // Healthspan updates weekly: compare the shown week's pace with the stored week before it.
  const prevDay = addDays(hsVm.asOf, -7);
  const prevHs = (await loadDays(ctx, prevDay, prevDay)).get(prevDay)?.healthspan;
  const prevPace = prevHs && prevHs.reason === null ? prevHs.paceOfAging : null;
  const st = row?.stress;
  const sameDays = [7, 14, 21, 28].map((k) => rows.get(addDays(today, -k))?.stress?.highMin).filter(finite);
  const tl = fit.trainingLoad.value;
  return {
    day: today,
    healthspan: hs.value ? ok({ pulseAge: hs.value.pulseAge, deltaYears: hs.value.deltaYears, pace: hs.value.pace, paceDelta: prevPace == null || hs.value.pace == null ? null : hs.value.pace - prevPace }, hs.provisional) : none(hs.reason ?? "no_data", hs.nightsLeft),
    monitor: monitor.count.value
      ? ok({ vitals: monitor.vitals.map((v) => ({ key: v.key, short: v.short, status: v.status })), inRange: monitor.count.value.inRange, total: VITALS.length })
      : none(monitor.count.reason ?? "no_data"),
    stress:
      st && st.average != null
        ? ok(
            {
              highMin: st.highMin,
              typicalHighMin: sameDays.length ? meanSd(sameDays).mean : null,
              weekday: formatDay(today, { weekday: "short" }),
              spark: minutePoints(stressSeries, dayStartOf(ctx, today), 2),
            },
            st.provisional,
          )
        : none(row?.s1?.hrCount ? "no_data" : "band_not_worn"),
    fitness: fit.vo2.value
      ? ok({ vo2max: fit.vo2.value.value, category: fit.vo2.value.category, percentile: fit.vo2.value.percentile, acwr: tl?.acwr ?? null, acwrTone: tl?.tone ?? null })
      : none("no_data"),
    heartRate,
  };
}

/** Alias: the task's name for the Health hub query. */
export const getHealth = getHealthHub;

/** The newest stored band reading, whenever it was. */
async function latestHr(ctx: QueryCtx) {
  const r = await ctx.store.hrBounds();
  return r ? (await hrMinutes(ctx, r.last, r.last + 1)).latest : null;
}

// ── Healthspan ──────────────────────────────────────────────────────────────

// The terms and references follow the Pulse engine's Pulse Age (src/core/engine/pulseAge.ts).
const HS_META: Record<string, Omit<HealthspanContributor, "metric" | "target" | "years" | "caption" | "key">> = {
  sleepHours: {
    group: "sleep",
    get label() { return tr("lib.dashboard.hoursOfSleep"); },
    unit: "h",
    domain: [4, 10],
    higherIsBetter: true,
    get explanation() { return tr("queries.health.bothShortAndLongSleepAreLinked"); },
    get source() { return tr("queries.health.populationMortalityStudies"); },
  },
  sri: {
    group: "sleep",
    get label() { return tr("lib.dashboard.sleepConsistency"); },
    unit: "%",
    domain: [0, 100],
    higherIsBetter: true,
    get explanation() { return tr("queries.health.beingAsleepAtTheSameTimesEach"); },
    get source() { return tr("queries.health.populationMortalityStudies"); },
  },
  zone13: {
    group: "strain",
    get label() { return tr("queries.health.moderateActivity"); },
    unit: "min",
    domain: [0, 300],
    higherIsBetter: true,
    get explanation() { return tr("queries.health.moderateActivityIsLinkedToSteeplyLower"); },
    get source() { return tr("queries.health.populationMortalityStudies"); },
  },
  zone45: {
    group: "strain",
    get label() { return tr("queries.health.heartRateZones45"); },
    unit: "min",
    domain: [0, 150],
    higherIsBetter: true,
    get explanation() { return tr("queries.health.vigorousActivityAddsBenefitOnTopOf"); },
    get source() { return tr("queries.health.populationMortalityStudies"); },
  },
  strength: {
    group: "strain",
    get label() { return tr("queries.health.strengthActivityTime"); },
    unit: "min",
    domain: [0, 150],
    higherIsBetter: true,
    get explanation() { return tr("queries.health.muscleStrengtheningWorkStrengthTrainingWeightsCalisthenics"); },
    get source() { return tr("queries.health.populationMortalityStudies"); },
  },
  steps: {
    group: "strain",
    get label() { return tr("queries.health.dailySteps"); },
    unit: "steps",
    domain: [0, 15000],
    higherIsBetter: true,
    get explanation() { return tr("queries.health.moreDailyStepsGoWithLowerMortality"); },
    get source() { return tr("queries.health.populationMortalityStudies"); },
  },
  vo2max: {
    group: "fitness",
    get label() { return tr("health.dataCheckSummary.vo2Max"); },
    unit: "ml/kg/min",
    domain: [15, 70],
    higherIsBetter: true,
    get explanation() { return tr("queries.health.higherCardiorespiratoryFitnessIsOneOfThe"); },
    get source() { return tr("queries.health.populationMortalityStudies"); },
  },
  restingHr: {
    group: "fitness",
    get label() { return tr("lib.dashboard.restingHeartRate"); },
    unit: "bpm",
    domain: [40, 90],
    higherIsBetter: false,
    get explanation() { return tr("queries.health.aHigherRestingHeartRateIsLinked"); },
    get source() { return tr("queries.health.populationMortalityStudies"); },
  },
  leanMass: {
    group: "fitness",
    get label() { return tr("lib.dashboard.leanBodyMass"); },
    unit: "%",
    domain: [50, 95],
    higherIsBetter: true,
    get explanation() { return tr("queries.health.theShareOfYourWeightThatIsn"); },
    get source() { return tr("queries.health.populationMortalityStudies"); },
  },
};
const HS_ORDER = ["sleepHours", "sri", "zone13", "zone45", "strength", "steps", "vo2max", "restingHr", "leanMass"];

const VO2_CAPTION = { get run() { return tr("queries.health.measured"); }, get daily() { return tr("queries.health.fitbitEstimate"); }, get estimate() { return tr("queries.health.estimatedFromRestingHeartRateAndActivity"); } } as const;

/** Healthspan `/health/healthspan` for the ISO week containing `day` (spec §7.7). Updated weekly. */
export async function getHealthspan(day: string, ctx: QueryCtx): Promise<HealthspanVM> {
  const today = todayOf(ctx);
  const [weekStart, weekEnd] = weekOf(day);
  const [last, rows] = await Promise.all([lastStored(ctx, today), loadDays(ctx, addDays(weekEnd, -182), weekEnd)]);
  // A finished week shows its Sunday; the current week shows last Sunday until this one ends.
  const lastSunday = addDays(weekStart, -1);
  const shown = weekEnd <= last ? weekEnd : rows.get(lastSunday)?.healthspan ? lastSunday : last;
  const hs = rows.get(shown)?.healthspan;

  let result: HealthspanVM["result"];
  if (!hs) result = none("no_data");
  else if (hs.reason !== null) result = none("calibrating", Math.max(1, 20 - hs.dataDays));
  else
    result = ok(
      { pulseAge: hs.pulseAge, deltaYears: hs.deltaYears, pace: hs.paceOfAging ?? null, paceDays: hs.paceDays ?? null, paceProvisional: hs.paceProvisional, vo2maxSource: hs.vo2maxSource },
      hs.provisional,
    );

  // Only the current terms; a row stored before lean mass became a body-fat % term (no `paceDays`) leaves it out.
  const current = hs && hs.reason === null && hs.paceDays !== undefined;
  const contributions = hs && hs.reason === null ? hs.contributions.filter((c) => c.key in HS_META && (current || c.key !== "leanMass")) : [];
  const body = current ? hs.bodyComposition : null;
  const contributors: HealthspanContributor[] = HS_ORDER.map((key) => {
    const meta = HS_META[key];
    const c = contributions.find((x) => x.key === key);
    const display = (v: number) => (key === "sri" ? Math.max(0, v) : v);
    const target = c ? display(c.reference) : 0;
    const caption =
      key === "vo2max" && hs?.reason === null && hs.vo2maxSource
        ? VO2_CAPTION[hs.vo2maxSource]
        : key === "leanMass"
          ? c
            ? leanCaption(c, body, hs?.reason === null ? hs.age : 0)
            : tr("queries.health.needsBodyFatASmartScaleOr")
          : undefined;
    const domain: [number, number] = key === "leanMass" && c ? [target - 25, target + 10] : meta.domain;
    return {
      key,
      ...meta,
      domain,
      metric: c ? ok(display(c.value), result.provisional) : none("no_data"),
      target,
      years: c ? c.years : null,
      ...(caption && { caption }),
    };
  });

  const history = [];
  for (let k = 25; k >= 0; k--) {
    const d = addDays(weekEnd, -7 * k);
    const r = rows.get(d)?.healthspan;
    if (d <= last) history.push({ day: d, value: r && r.reason === null ? r.pulseAge : null });
  }

  return {
    day,
    weekStart,
    weekEnd,
    asOf: shown,
    nextUpdateInDays: weekEnd > last ? Math.max(0, daysBetween(today, weekEnd)) : 0,
    age: hs && hs.reason === null ? hs.age : fractionalYears(ctx.profile.birthDate, shown),
    result,
    insight: hs && hs.reason === null ? healthspanInsight(hs.paceOfAging, hs.deltaYears, contributions, hs.termsUsed) : null,
    history,
    contributors,
  };
}

/** Lean body mass's caption: the body composition behind the % (lean and fat mass in kg, and per m² of height). */
function leanCaption(c: HealthspanContribution, b: HealthspanBody | null | undefined, age: number) {
  const parts = [tr("queries.health.bodyFat", { v0: (100 - c.value).toFixed(1) })];
  if (b?.leanKg != null && b.fatKg != null) parts.push(tr("queries.health.kgLeanKgFat", { v0: b.leanKg.toFixed(1), v1: b.fatKg.toFixed(1) }));
  if (b?.ffmi != null && b.fmi != null) parts.push(tr("queries.health.ffmiFmiKgM", { v0: b.ffmi.toFixed(1), v1: b.fmi.toFixed(1) }));
  const note = c.estimated
    ? tr("queries.health.bodyFatEstimatedFromYourBmi")
    : "";
  return `${parts.join(" · ")}.${note}`;
}
type HealthspanBody = Extract<NonNullable<DayRow["healthspan"]>, { reason: null }>["bodyComposition"];

/** `termsUsed`: how many of Pulse Age's 9 inputs it rests on (absent on rows stored before scoring version 10). */
function healthspanInsight(pace: number | null, deltaYears: number, cs: HealthspanContribution[], termsUsed: number | undefined) {
  const title =
    pace == null
      ? deltaYears < -1
        ? tr("more.howItWorksContent.youngerThanYourAge")
        : deltaYears > 1
          ? tr("more.howItWorksContent.olderThanYourAge")
          : tr("queries.health.closeToYourAge")
      : pace < 0.9
        ? tr("queries.health.agingSlower")
        : pace > 1.1
          ? tr("queries.health.agingFaster")
          : tr("queries.health.steadyAndHealthy");
  const best = [...cs].sort((a, b) => a.years - b.years)[0];
  const worst = [...cs].sort((a, b) => b.years - a.years)[0];
  const label = (c: HealthspanContribution) => HS_META[c.key].label.toLowerCase();
  const parts = [
    pace == null
      ? tr("queries.health.paceOfAgingShowsOnceOfThe", { v0: healthspanConfig.paceMinDays })
      : tr("queries.health.yourPaceOfAgingIsXYour", { v0: pace.toFixed(1) }),
  ];
  if (best && best.years < 0) parts.push(tr("queries.health.yourBiggestBoostIsWorthYears", { v0: label(best), v1: Math.abs(best.years).toFixed(1) }));
  if (worst && worst.years > 0) parts.push(tr("queries.health.addsTheMostYears", { v0: HS_META[worst.key].label, v1: worst.years.toFixed(1) }));
  // Say how much of Pulse Age is measured; the engine scales the inputs present to stand for all nine.
  if (termsUsed != null)
    parts.push(
      termsUsed < HEALTHSPAN_TERM_COUNT
        ? tr("queries.health.basedOnOfInputsTheOnesPresent", { v0: termsUsed, v1: HEALTHSPAN_TERM_COUNT, v2: HEALTHSPAN_TERM_COUNT })
        : tr("queries.health.basedOnAllInputs", { v0: HEALTHSPAN_TERM_COUNT }),
    );
  return { title, body: parts.join(" ") };
}

// ── Health Monitor ──────────────────────────────────────────────────────────

const VITALS: { key: VitalKey; short: string; unit: string; signed?: boolean; pick: (r: DayRow) => number | null | undefined }[] = [
  { key: "resp", get short() { return tr("health.HealthScreen.resp"); }, unit: "rpm", pick: (r) => r.metrics?.respBpm },
  // The engine's night values, the ones Health Monitor's band and Recovery use (the daily ones before a scored night).
  { key: "restingHr", get short() { return tr("health.HealthScreen.rhr"); }, unit: "bpm", pick: (r) => r.recovery?.inputs.rhr ?? r.metrics?.rhrBpm ?? r.sessionRhr },
  { key: "hrv", get short() { return tr("breathe.BreatheScreen.hrv_49a6fe"); }, unit: "ms", pick: (r) => r.recovery?.inputs.hrv ?? r.metrics?.hrvMs },
  { key: "skinTempDev", get short() { return tr("health.HealthScreen.temp"); }, unit: "°C", signed: true, pick: (r) => r.recovery?.inputs.skinTempDev },
];

const num = (v: number, dp: number, signed = false) => {
  const s = Math.abs(v).toFixed(dp);
  return signed ? `${v >= 0 ? "+" : "−"}${s}` : v < 0 ? `−${s}` : s;
};

/** Health Monitor `/health/monitor` for `day` (spec §7.8). */
export async function getMonitor(day: string, ctx: QueryCtx, preloaded?: Map<string, DayRow>): Promise<MonitorVM> {
  const today = todayOf(ctx);
  const isToday = day === today;
  const [rows, rhythm, measured] = await Promise.all([
    preloaded?.has(addDays(day, -29)) ? preloaded : loadDays(ctx, addDays(day, -29), day),
    heartRhythm(ctx, day),
    measurements(ctx, day, today),
  ]);
  const row = rows.get(day);
  const hm = row?.healthMonitor;
  const vitals: Vital[] = VITALS.map((v) => {
    const reading = hm && hm.reason === null ? hm.vitals.find((x) => x.key === v.key) : undefined;
    const value = row ? v.pick(row) : null;
    const range = reading?.range ?? null;
    const status = reading?.status ?? "no_data";
    let chip: Vital["chip"] = null;
    if (range && finite(value)) {
      // Ranges always show one decimal, so a whole-number reading never looks equal to its bound.
      const lo = num(range.low, 1, v.signed);
      const hi = num(range.high, 1, v.signed);
      if (v.key === "spo2" && status === "low" && value < 95) chip = { tone: "warning", text: tr("queries.health.below95") };
      else if (status === "in_range") chip = { tone: "optimal", text: v.key === "spo2" ? tr("queries.health.within100", { v0: lo }) : tr("queries.health.within", { v0: lo, v1: hi }) };
      else if (status === "high") chip = { tone: "warning", text: tr("queries.health.elevatedAbove", { v0: hi }) };
      else if (status === "low") chip = { tone: "warning", text: tr("queries.health.lowBelow", { v0: lo }) };
    }
    const reason = v.key === "skinTempDev" && row?.metrics?.nightlyTempC != null ? "calibrating" : vitalReason(row, isToday, v.key === "hrv");
    const tags = hm && hm.reason === null && hm.stale.includes(v.key === "restingHr" ? "rhr" : v.key === "skinTempDev" ? "skinTemp" : v.key) ? (["stale_baseline"] as const) : [];
    return {
      key: v.key,
      label: v.key === "skinTempDev" ? tr("queries.health.skinTemp") : VITAL_LABEL[v.key],
      short: v.short,
      unit: v.unit,
      metric: finite(value) ? ok(value, false, [...tags]) : none(reason),
      range,
      status,
      chip,
      trend: {
        points: trendPoints(rows, day, v.pick, 30),
        baseline: range && v.key !== "spo2" ? { mean: (range.low + range.high) / 2, sd: (range.high - range.low) / 2 } : null,
      },
    };
  });

  let count: MonitorVM["count"];
  if (!hm) count = none(isToday ? "awaiting_sleep_sync" : "band_not_worn");
  else if (hm.reason !== null) count = none(nightReason(hm.reason, isToday));
  else {
    const raised = illnessRaised(hm);
    count = ok({ inRange: hm.inRange, total: VITALS.length, outOfRange: hm.flagged, status: raised ? "illness" : hm.flagged ? "out" : "within" });
  }
  return {
    day,
    isToday,
    count,
    illness: hm && hm.reason === null && illnessRaised(hm) ? { level: hm.illness.level, score: hm.illness.score } : null,
    vitals,
    heartRhythm: rhythm,
    measurements: measured,
  };
}

// ── Heart rhythm and measurements ───────────────────────────────────────────

type EcgCopy = Pick<EcgReading, "label" | "tone" | "explanation">;
/**
 * Google's Electrocardiogram.ResultClassification in the Google Health app's words. Only AFib takes a colour, and
 * a warning one, not red; every inconclusive state stays neutral. Unknown or unspecified codes read as "No result".
 */
export const ECG_RESULT: Record<string, EcgCopy> = {
  NORMAL_SINUS_RHYTHM: { get label() { return tr("queries.health.normalSinusRhythm"); }, tone: "optimal", get explanation() { return tr("queries.health.yourHeartRhythmAppearsNormalAndShows"); } },
  ATRIAL_FIBRILLATION: {
    get label() { return tr("queries.health.atrialFibrillation"); },
    tone: "warning",
    get explanation() { return tr("queries.health.thisReadingShowsSignsOfAtrialFibrillation"); },
  },
  INCONCLUSIVE: { get label() { return tr("queries.health.inconclusive"); }, tone: "neutral", get explanation() { return tr("queries.health.thisReadingCouldnTBeClassifiedOften"); } },
  INCONCLUSIVE_HIGH_HEART_RATE: {
    get label() { return tr("queries.health.inconclusiveHighHeartRate"); },
    tone: "neutral",
    get explanation() { return tr("queries.health.yourHeartRateWasOver120Bpm"); },
  },
  INCONCLUSIVE_LOW_HEART_RATE: { get label() { return tr("queries.health.inconclusiveLowHeartRate"); }, tone: "neutral", get explanation() { return tr("queries.health.yourHeartRateWasUnder50Bpm"); } },
  UNREADABLE: { get label() { return tr("queries.health.poorRecording"); }, tone: "neutral", get explanation() { return tr("queries.health.theSignalWasTooNoisyToRead"); } },
  NOT_ANALYZED: { get label() { return tr("queries.health.notAnalyzed"); }, tone: "neutral", get explanation() { return tr("queries.health.thisRecordingWasSavedButNotClassified"); } },
};
export const NO_RESULT: EcgCopy = { get label() { return tr("queries.health.noResult"); }, tone: "neutral", get explanation() { return tr("queries.health.noRhythmResultCameWithThisRecording"); } };

/**
 * Heart-rhythm records up to `day`, newest first. Only the Google Health API carries them (src/google/sync.ts writes
 * the Store's health records); with Health Connect or demo data the section is honestly empty.
 */
async function heartRhythm(ctx: QueryCtx, day: string): Promise<HeartRhythm> {
  const all = await ctx.store.healthRecords(day);
  const ecg = all
    .filter((r) => r.kind === "ecg")
    .map((r): EcgReading => {
      const d = r.data as { result?: string; avgBpm?: number | null };
      const result = d.result ?? "RESULT_CLASSIFICATION_UNSPECIFIED";
      return { id: r.id, at: ms(r.ts), day: r.day, time: wall(r.ts, ctx.timeZone).time.slice(0, 5), result, ...(ECG_RESULT[result] ?? NO_RESULT), avgBpm: finite(d.avgBpm) ? d.avgBpm : null };
    });
  const irn = all.filter((r) => r.kind === "irn");
  return { ecg, irn: { count: irn.length, latestAt: irn[0] ? ms(irn[0].ts) : null, latestDay: irn[0]?.day ?? null } };
}

const MEASUREMENTS = [
  { key: "weight", get label() { return tr("lib.dashboard.weight"); }, unit: "kg", format: "decimal1", col: "weightKg", always: true },
  { key: "body_fat", get label() { return tr("lib.dashboard.bodyFat"); }, unit: "%", format: "decimal1", col: "bodyFatPct", always: true },
  { key: "glucose", get label() { return tr("lib.extraMetrics.bloodGlucose"); }, unit: "mg/dL", format: "int", col: "glucose", always: false },
  { key: "core_temp", get label() { return tr("lib.extraMetrics.coreTemperature"); }, unit: "°C", format: "decimal1", col: "core_temp", always: false },
] as const;

/** Every reading of each measurement, newest first: a Metrics column, or a daily-values key. */
async function allReadings(ctx: QueryCtx): Promise<{ day: string; value: number }[][]> {
  const [metrics, values] = await Promise.all([metricsWithLoggedBody(ctx.store), ctx.store.dailyValues()]);
  const newest = (a: { day: string }, b: { day: string }) => b.day.localeCompare(a.day);
  return MEASUREMENTS.map((m) => {
    if (m.col === "weightKg" || m.col === "bodyFatPct") {
      const col = m.col;
      return metrics.flatMap((r) => (finite(r[col]) ? [{ day: r.day, value: r[col] }] : [])).sort(newest);
    }
    const key = m.col;
    return values.filter((v) => v.key === key && /^\d{4}-\d{2}-\d{2}$/.test(v.day)).map((v) => ({ day: v.day, value: v.value })).sort(newest);
  });
}

async function measurements(ctx: QueryCtx, day: string, today: string): Promise<Measurement[]> {
  const all = await allReadings(ctx);
  const out: Measurement[] = [];
  for (const [i, m] of MEASUREMENTS.entries()) {
    const rs = all[i];
    if (!m.always && !rs.length) continue;
    const latest = rs.find((r) => r.day <= day);
    const prior = latest ? rs.filter((r) => r.day >= addDays(latest.day, -30) && r.day < latest.day).map((r) => r.value) : [];
    const { mean, sd } = meanSd(prior);
    out.push({
      key: m.key,
      label: m.label,
      unit: m.unit,
      format: m.format,
      metric: latest ? ok(latest.value) : none("no_data"),
      average: mean,
      sd,
      direction: "neutral",
      caption: latest ? dayLabel(latest.day, today) : undefined,
    });
  }
  return out;
}

// ── Stress Monitor ──────────────────────────────────────────────────────────

/** Stress Monitor `/health/stress` for `day` (spec §7.9). */
export async function getStress(day: string, ctx: QueryCtx): Promise<StressVM> {
  const today = todayOf(ctx);
  const isToday = day === today;
  const [rows, series, exs] = await Promise.all([loadDays(ctx, addDays(day, -29), day), loadSeries(ctx, day, "stress"), exercisesBetween(ctx, day, day)]);
  const row = rows.get(day);
  const st = row?.stress;
  const gauge = stressNow(row, isToday);
  const start = dayStartOf(ctx, day);
  const sameStress = [7, 14, 21, 28].map((k) => rows.get(addDays(day, -k))?.stress).filter((x) => !!x && x.average != null);
  const typicalOf = (pick: (x: NonNullable<DayRow["stress"]>) => number) => meanSd(sameStress.map((x) => pick(x!))).mean ?? 0;
  const typical = sameStress.length ? typicalOf((x) => x.highMin) : null;

  const spans = daySpansOf(row, start, exs);
  const scored = st && st.average != null;
  const empty = row?.s1?.hrCount ? "no_data" : "band_not_worn";

  return {
    day,
    isToday,
    gauge,
    insight: scored ? stressInsight(st, ctx.timeZone) : null,
    chart: scored ? ok({ points: minutePoints(series, start, 2), spans, now: isToday && st.latest ? ms(st.latest.ts) : null }, st.provisional) : none(empty),
    levels: scored
      ? ok(
          {
            lowMin: st.lowMin,
            mediumMin: st.mediumMin,
            highMin: st.highMin,
            typicalDeltaMin: typical == null ? null : st.highMin - typical,
            weekday: formatDay(day, { weekday: "long" }),
            typical: sameStress.length ? { lowMin: typicalOf((x) => x.lowMin), mediumMin: typicalOf((x) => x.mediumMin), highMin: typical! } : null,
          },
          st.provisional,
        )
      : none(empty),
    trend: {
      points: trendPoints(rows, day, (r) => r.stress?.average, 30),
    },
  };
}

function stressInsight(st: NonNullable<DayRow["stress"]>, tz: string) {
  const total = st.lowMin + st.mediumMin + st.highMin;
  const top = st.lowMin >= st.mediumMin && st.lowMin >= st.highMin ? "low" : st.mediumMin >= st.highMin ? "medium" : "high";
  const lead = tr("queries.health.mostOfYourTimeWasInStress", { v0: tr(top === "low" ? "health.StressScreen.low" : top === "medium" ? "health.StressScreen.medium" : "health.StressScreen.high").toLocaleLowerCase() });
  if (!total) return null;
  if (st.longestHigh && st.longestHigh.minutes >= 10) {
    const at = wall(st.longestHigh.start, tz).time.slice(0, 5);
    return tr("queries.health.yourLongestHighStressStretchStartedAt", { v0: lead, v1: at, v2: st.longestHigh.minutes });
  }
  return tr("queries.health.youHadNoLongStretchOfHigh", { v0: lead });
}

// ── Fitness ─────────────────────────────────────────────────────────────────

const ACWR_STATUS = { neutral: "detraining", optimal: "optimal", warning: "pushing", alert: "high_risk" } as const satisfies Record<ChipTone, string>;
type LoadChip = NonNullable<FitnessVM["trainingLoad"]["value"]>["status"];
const STATUS_TONE: Record<LoadChip, ChipTone> = { detraining: "neutral", optimal: "optimal", pushing: "warning", high_risk: "alert" };
/** The engine's load statuses on the screen's four chips. */
const CARDIO_STATUS: Record<Exclude<LoadStatus, "calibrating">, LoadChip> = {
  detraining: "detraining",
  maintaining: "optimal",
  peaking: "optimal",
  productive: "optimal",
  fatigued: "pushing",
  overtraining: "high_risk",
};
export const acwrStatus = (acwr: number) => {
  const tone = acwrTone(acwr);
  return { status: ACWR_STATUS[tone], tone };
};

/** Fitness `/health/fitness`: latest values (spec §7.10). */
export async function getFitness(ctx: QueryCtx): Promise<FitnessVM> {
  const today = todayOf(ctx);
  const last = await lastStored(ctx, today);
  const rows = await loadDays(ctx, addDays(last, -181), last);
  const row = rows.get(last);
  const f = row?.fitness;
  const decade = (age: number) => {
    const lo = Math.min(70, Math.max(20, Math.floor(age / 10) * 10));
    return `${lo}-${lo + 9}`;
  };
  // Mobile: Fitness Age and Pulse's own VO2 max estimate (from resting HR and activity) on the newest day that has one.
  const estDay = [...rows.keys()].sort().reverse().find((d) => d >= addDays(last, -6) && rows.get(d)?.healthspan?.fitnessEstimate);
  const est = estDay ? rows.get(estDay)!.healthspan!.fitnessEstimate! : null;
  const estAge = estDay ? fractionalYears(ctx.profile.birthDate, estDay) : 0;
  const vo2: FitnessVM["vo2"] =
    f && f.reason === null
      ? ok({ value: f.vo2max, source: f.source, sourceDay: f.sourceDay, percentile: f.percentile, category: f.category, ageBand: decade(f.age), sex: ctx.profile.sex }, f.source === "daily")
      : est && estDay
        ? ok({ value: est.vo2max, source: "estimate", sourceDay: estDay, ...fitnessLevel(est.vo2max, estAge, ctx.profile.sex), ageBand: decade(estAge), sex: ctx.profile.sex }, true)
        : none("no_data");
  const fitnessAge: FitnessVM["fitnessAge"] =
    est && estDay
      ? ok({ fitnessAge: est.fitnessAge, age: estAge, vo2max: est.vo2max, method: est.method, activityIndex: est.activityIndex, restingHr: est.restingHr, day: estDay })
      : none("no_data");
  // Cardio Load on the Pulse engine (training_load.cardio): the ratio and its status, mapped onto the screen's chips.
  const cardio = row?.trainingLoad?.cardio;
  const trainingLoad: Metric<NonNullable<FitnessVM["trainingLoad"]["value"]>> =
    cardio && cardio.status !== "calibrating" && cardio.ratio != null
      ? ok({ acwr: cardio.ratio, status: CARDIO_STATUS[cardio.status], tone: STATUS_TONE[CARDIO_STATUS[cardio.status]] })
      : none("calibrating");
  const load = Array.from({ length: 90 }, (_, k) => {
    const d = addDays(last, k - 89);
    const t = rows.get(d)?.trainingLoad?.cardio;
    return { day: d, ctl: t?.ctl ?? null, atl: t?.atl ?? null, tsb: t ? t.ctl - t.atl : null };
  });
  // Measured and Fitbit values; with none in the window, Pulse's own estimate.
  const measured = trendPoints(rows, last, (r) => r.metrics?.vo2maxRun ?? r.metrics?.vo2maxDaily);
  return {
    vo2,
    fitnessAge,
    trend: {
      points: measured.some((p) => p.value !== null) ? measured : trendPoints(rows, last, (r) => r.healthspan?.fitnessEstimate?.vo2max, 182, () => true),
    },
    trainingLoad,
    load,
    loadReason: load.some((p) => p.ctl != null) ? null : { reason: "calibrating" },
  };
}

// ── Heart rate ──────────────────────────────────────────────────────────────

/**
 * The band's heart rate over [from, to) unix seconds (minute-aligned) as minute means, a null for a minute without a
 * sample so the chart leaves a gap, plus the newest raw sample in the range. Reads only that window.
 */
export async function hrMinutes(ctx: QueryCtx, from: number, to: number): Promise<HeartRateLive> {
  const hr = await ctx.store.readHr(from, to);
  const last = hr.at(-1);
  return {
    points: minuteMeanHr(hr, from, to).map((v, m) => ({ t: ms(from + m * 60), v: v === null ? null : Math.round(v) })),
    latest: last ? { t: ms(last.ts), bpm: last.bpm } : null,
  };
}

/** Heart rate `/health/heart-rate?d=`: the day's minutes (today up to now), resting heart rate and time in zones. */
export async function getHeartRate(day: string, ctx: QueryCtx): Promise<HeartRateVM> {
  const isToday = day === todayOf(ctx);
  const start = localMidnight(day, ctx.timeZone);
  const end = localMidnight(addDays(day, 1), ctx.timeZone);
  const to = isToday ? Math.min(end, Math.floor(ctx.now / 60) * 60 + 60) : end;
  const [hr, rows] = await Promise.all([hrMinutes(ctx, start, to), loadDays(ctx, day, day)]);
  const row = rows.get(day);
  return {
    day,
    isToday,
    end: ms(end),
    ...hr,
    restingHr: row?.metrics?.rhrBpm ?? null,
    zoneBands: row?.s1 ? zoneBounds(row.s1.zoneLower) : [],
    maxHr: row?.s1?.maxHr ?? maxHrOf(ctx),
    zones: zoneRows(row),
    zoneNote: zoneNote(row, ctx),
  };
}
