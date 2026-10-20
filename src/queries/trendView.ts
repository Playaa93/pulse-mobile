import { language, tr } from "@/i18n";
import { deltaTone, type GoodDirection, type Tone } from "@/lib/bands";
import { FEATURES } from "@/lib/features";
import { formatDay, formatValue, type FormatKey } from "@/lib/format";
import {
  bandCounts,
  mean,
  monthSegments,
  periodLabel,
  periodWindow,
  relativeChange,
  verdict,
  weeklyTotals,
  type BreakdownBand,
  type MonthSegment,
  type TrendAgg,
  type TrendViewBar,
  type TrendViewRange,
} from "@/lib/trend";
import { addDays, localMinutes } from "@/lib/time";
import { activityKind, exercisesBetween, finite, firstDay, loadDays, meanSd, todayOf, dayStrainOf, type DayRow, type ExerciseRow, type QueryCtx } from "./common";

// The Trend View `/trend/[key]` (spec §11 R29): one metric over a W / M / 6M window that steps back through time,
// against the window before it, with a verdict, a breakdown and an explainer.

export type TrendViewGroup = "recovery" | "sleep" | "strain" | "health";
export type TrendViewChart = "bars" | "line" | "stack" | "range" | "pair";

type Ctx = { strength: Map<string, { min: number; byType: Record<string, number> }>; tz: string; rows: Map<string, DayRow> };

type Def = {
  group: TrendViewGroup;
  /** The dropdown's name ("Heart Rate Variability"). */
  label: string;
  /** The Weekly Trends card's title when it differs ("Hours vs. Needed (hours)"). */
  card?: string;
  /** The verdict's name ("HRV"). */
  short: string;
  unit?: string;
  format: FormatKey;
  direction: GoodDirection;
  colorBy: "band" | "strain" | "sleep" | "single" | "stress";
  chart: TrendViewChart;
  agg: TrendAgg;
  pick: (r: DayRow, x: Ctx) => number | null | undefined;
  /** `stack`: the day's parts by series key; `range`: bed and wake as minutes from midnight (bed negative before it);
   * `pair`: the two lines' values. */
  parts?: (r: DayRow, x: Ctx) => Record<string, number> | null;
  /** Series keys bottom first, for `stack` charts and part breakdowns. */
  series?: readonly { key: string; label: string }[];
  /** Day counts by band: highest band first. Values are compared after rounding to `round` decimals. */
  bands?: { title: string; round?: number; list: readonly (BreakdownBand & { detail: string })[] };
  /** Part totals ("HR Zones Breakdown"): sums each series, or the strength minutes by activity type. */
  partBreakdown?: "series" | "strength";
  /** Shades the personal typical range (mean ± 1 σ over the 60 days to the window's end). */
  typical?: boolean;
  /** Accrues through the day: today's value is drawn but left out of the average. */
  partialToday?: boolean;
  /** Fixed axis floor and ceiling. */
  domain?: [number, number];
  footnote?: string;
  /** Buttons under the chart: "Add activity" (zones, strength) and the goal button's label (behind `FEATURES.goals`). */
  actions?: { addActivity?: boolean; goal?: string };
  flag?: keyof typeof FEATURES;
  about: { title: string; body: readonly string[] };
};

const SLEEP_BANDS = (title: string, optimal: number, sufficient: number) => ({
  title,
  list: [
    { key: "optimal", label: tr("queries.trendView.optimal"), min: optimal, detail: `${optimal}%+` },
    { key: "sufficient", label: tr("queries.trendView.sufficient"), min: sufficient, detail: `${sufficient}-${optimal - 1}%` },
    { key: "poor", label: tr("queries.training.poor"), min: -Infinity, detail: `<${sufficient}%` },
  ],
});

const zoneMin = (r: DayRow, i: number) => (r.s1 && r.s1.hrCount > 0 ? r.s1.zoneSeconds[i] / 60 : null);
const zoneParts = (from: number, to: number) => (r: DayRow) => {
  if (!r.s1 || r.s1.hrCount === 0) return null;
  return Object.fromEntries(Array.from({ length: to - from }, (_, k) => [`z${from + k + 1}`, r.s1!.zoneSeconds[from + k] / 60]));
};
export const zoneSum = (from: number, to: number) => (r: DayRow) => {
  const xs = Array.from({ length: to - from }, (_, k) => zoneMin(r, from + k));
  return xs.every(finite) ? xs.reduce((a, b) => a + b, 0) : null;
};
const zoneSeries = (from: number, to: number) => Array.from({ length: to - from }, (_, k) => ({ key: `z${from + k + 1}`, label: tr("queries.trendView.zone", { v0: from + k + 1 }) }));
export const worn = (r: DayRow) => (r.s1?.hrCount ?? 0) > 0;
/** The night's need: the plan made the evening before, else the baseline need (as the Sleep page reads it). */
const needMin = (r: DayRow, x: Ctx) => {
  if (!r.sleep) return null;
  const plan = x.rows.get(addDays(r.day, -1))?.sleepPlanner;
  return plan && plan.reason === null ? plan.needMin : r.sleep.needHours * 60;
};

export const TREND_VIEW = {
  recovery: {
    group: "recovery", get label() { return tr("ui.shells.HomeHeader.recovery"); }, get short() { return tr("ui.shells.HomeHeader.recovery"); }, unit: "%", format: "int", direction: "up", colorBy: "band", chart: "bars", agg: "daily",
    pick: (r) => r.recovery?.value, domain: [0, 100],
    bands: { get title() { return tr("queries.trendView.recoveryBreakdownDays"); }, list: [
      { key: "green", get label() { return tr("lib.bands.green"); }, min: 67, detail: "67%+" },
      { key: "yellow", get label() { return tr("lib.bands.yellow"); }, min: 34, detail: "34-66%" },
      { key: "red", get label() { return tr("lib.bands.red"); }, min: -Infinity, detail: "<34%" },
    ] },
    about: { get title() { return tr("queries.trendView.whatIsRecovery"); }, get body() { return [
      tr("queries.trendView.recoveryIsHowReadyYourBodyIs"),
      tr("queries.trendView.pulseScoresItEachMorningFromYour"),
      tr("queries.trendView.green67AndUpMeansYouAre"),
    ]; } },
  },
  hrv: {
    group: "recovery", get label() { return tr("queries.trendView.heartRateVariability"); }, get short() { return tr("breathe.BreatheScreen.hrv_49a6fe"); }, unit: "ms", format: "int", direction: "up", colorBy: "single", chart: "line", agg: "daily",
    pick: (r) => r.metrics?.hrvMs, typical: true,
    about: { get title() { return tr("queries.trendView.whatIsHeartRateVariability"); }, get body() { return [
      tr("queries.trendView.heartRateVariabilityHrvIsTheVariation"),
      tr("queries.trendView.aHigherHrvUsuallyMeansYourNervous"),
      tr("queries.trendView.hrvDiffersALotFromPersonTo"),
    ]; } },
  },
  rhr: {
    group: "recovery", get label() { return tr("queries.trendView.restingHeartRate"); }, get short() { return tr("health.HealthScreen.rhr"); }, unit: "bpm", format: "int", direction: "down", colorBy: "single", chart: "line", agg: "daily",
    pick: (r) => r.metrics?.rhrBpm ?? r.sessionRhr, typical: true,
    about: { get title() { return tr("queries.trendView.whatIsRestingHeartRate"); }, get body() { return [
      tr("queries.trendView.restingHeartRateRhrIsHowMany"),
      tr("queries.trendView.aLowerRhrGenerallyReflectsBetterFitness"),
    ]; } },
  },
  resp: {
    group: "recovery", get label() { return tr("queries.trendView.respiratoryRate"); }, get short() { return tr("queries.trendView.respiratoryRate_3587e9"); }, unit: "rpm", format: "decimal1", direction: "down", colorBy: "single", chart: "line", agg: "daily",
    pick: (r) => r.metrics?.respBpm, typical: true,
    about: { get title() { return tr("queries.trendView.whatIsRespiratoryRate"); }, get body() { return [
      tr("queries.trendView.respiratoryRateIsHowManyBreathsYou"),
      tr("queries.trendView.itIsOneOfTheMostStable"),
    ]; } },
  },
  sleep: {
    group: "sleep", get label() { return tr("queries.trendView.sleepPerformance"); }, get short() { return tr("queries.trendView.sleepPerformance"); }, unit: "%", format: "int", direction: "up", colorBy: "sleep", chart: "bars", agg: "daily",
    pick: (r) => r.sleep?.performance, domain: [0, 100], get bands() { return SLEEP_BANDS(tr("queries.trendView.sleepPerformanceBreakdownDays"), 85, 70); },
    about: { get title() { return tr("queries.trendView.whatIsSleepPerformance"); }, get body() { return [
      tr("queries.trendView.sleepPerformanceComparesTheSleepYouGot"),
      tr("queries.trendView.yourNeedRisesWithYesterdaySStrain"),
    ]; } },
  },
  hours: {
    group: "sleep", get label() { return tr("queries.trendView.hoursOfSleep"); }, get card() { return tr("queries.trendView.hoursVsNeededHours"); }, get short() { return tr("queries.trendView.hoursOfSleep_5a70be"); }, format: "duration", direction: "up", colorBy: "sleep", chart: "pair", agg: "daily",
    pick: (r) => r.sleep?.main?.asleepMin,
    parts: (r, x) => {
      const need = needMin(r, x);
      return r.sleep?.main && need !== null ? { asleep: r.sleep.main.asleepMin, need } : null;
    },
    series: [{ key: "asleep", get label() { return tr("lib.dashboard.hoursOfSleep"); } }, { key: "need", get label() { return tr("queries.trendView.sleepNeeded"); } }],
    about: { get title() { return tr("queries.trendView.whatIsHoursOfSleep"); }, get body() { return [
      tr("queries.trendView.hoursOfSleepIsTheTimeYou"),
      tr("queries.trendView.mostAdultsNeedBetweenSevenAndNine"),
    ]; } },
  },
  hours_need: {
    group: "sleep", get label() { return tr("queries.trendView.hoursVsNeeded_2673f3"); }, get card() { return tr("queries.trendView.hoursVsNeeded"); }, get short() { return tr("queries.trendView.hoursVsNeeded_f047cc"); }, unit: "%", format: "int", direction: "up", colorBy: "sleep", chart: "bars", agg: "daily",
    pick: (r, x) => {
      const need = needMin(r, x);
      return r.sleep?.main && need ? (r.sleep.main.asleepMin / need) * 100 : null;
    },
    domain: [0, 100], get bands() { return SLEEP_BANDS(tr("queries.trendView.hoursVsNeededBreakdownDays"), 85, 70); },
    about: { get title() { return tr("queries.trendView.whatIsHoursVsNeeded"); }, get body() { return [
      tr("queries.trendView.hoursVsNeededIsTheSleepYou"),
      tr("queries.trendView.yourNeedIsABaselinePlusExtra"),
    ]; } },
  },
  restorative: {
    group: "sleep", get label() { return tr("queries.trendView.restorativeSleep"); }, get short() { return tr("queries.trendView.restorativeSleep_dd323c"); }, format: "duration", direction: "up", colorBy: "sleep", chart: "stack", agg: "daily",
    pick: (r) => (r.sleep?.main?.deepMin != null && r.sleep.main.remMin != null ? r.sleep.main.deepMin + r.sleep.main.remMin : null),
    parts: (r) => (r.sleep?.main?.deepMin != null && r.sleep.main.remMin != null ? { deep: r.sleep.main.deepMin, rem: r.sleep.main.remMin } : null),
    series: [{ key: "rem", get label() { return tr("queries.mobileExtras.rem"); } }, { key: "deep", get label() { return tr("queries.trendView.swsDeep"); } }],
    about: { get title() { return tr("queries.trendView.whatIsRestorativeSleep"); }, get body() { return [
      tr("queries.trendView.restorativeSleepIsTheTimeYouSpend"),
      tr("queries.trendView.deepSleepComesMostlyEarlyInThe"),
    ]; } },
  },
  consistency: {
    group: "sleep", get label() { return tr("queries.trendView.sleepConsistency"); }, get short() { return tr("queries.trendView.sleepConsistency"); }, unit: "%", format: "int", direction: "up", colorBy: "sleep", chart: "bars", agg: "daily",
    pick: (r) => r.sleep?.consistency, domain: [0, 100], get bands() { return SLEEP_BANDS(tr("queries.trendView.sleepConsistencyBreakdownDays"), 80, 70); },
    about: { get title() { return tr("queries.trendView.whatIsSleepConsistency"); }, get body() { return [
      tr("queries.trendView.sleepConsistencyMeasuresHowCloselyYourSleep"),
      tr("queries.trendView.goingToBedAndWakingAtSimilar"),
    ]; } },
  },
  efficiency: {
    group: "sleep", get label() { return tr("queries.trendView.sleepEfficiency"); }, get short() { return tr("queries.trendView.sleepEfficiency"); }, unit: "%", format: "int", direction: "up", colorBy: "sleep", chart: "line", agg: "daily",
    pick: (r) => (r.sleep?.main ? r.sleep.main.efficiency * 100 : null), get bands() { return SLEEP_BANDS(tr("queries.trendView.sleepEfficiencyBreakdownDays"), 90, 80); },
    about: { get title() { return tr("queries.trendView.whatIsSleepEfficiency"); }, get body() { return [
      tr("queries.trendView.sleepEfficiencyIsTheShareOfYour"),
      tr("queries.trendView.above85IsGenerallyConsideredGoodLong"),
      tr("queries.trendView.betterEfficiencyMeansMoreOfTheNight"),
    ]; } },
  },
  time_in_bed: {
    group: "sleep", get label() { return tr("queries.trendView.timeInBed"); }, get short() { return tr("queries.trendView.timeInBed_089ad5"); }, format: "duration", direction: "neutral", colorBy: "sleep", chart: "range", agg: "daily",
    pick: (r) => r.sleep?.main?.inBedMin,
    parts: (r, x) => {
      const m = r.sleep?.main;
      if (!m) return null;
      const bed = localMinutes(m.start, x.tz);
      return { bed: bed > 720 ? bed - 1440 : bed, wake: localMinutes(m.end, x.tz) };
    },
    about: { get title() { return tr("queries.trendView.whatIsTimeInBed"); }, get body() { return [
      tr("queries.trendView.timeInBedRunsFromWhenYour"),
      tr("queries.trendView.eachBarSpansYourBedtimeToYour"),
    ]; } },
  },
  sleep_stress: {
    group: "sleep", get label() { return tr("queries.trendView.sleepStress"); }, get short() { return tr("queries.trendView.timeInHighStress"); }, format: "duration", direction: "down", colorBy: "stress", chart: "stack", agg: "daily",
    pick: () => null, flag: "sleepStress",
    series: [{ key: "low", get label() { return tr("health.StressScreen.low"); } }, { key: "medium", get label() { return tr("queries.trendView.medium"); } }, { key: "high", get label() { return tr("more.howItWorksContent.high"); } }],
    about: { get title() { return tr("queries.trendView.whatIsSleepStress"); }, get body() { return [
      tr("queries.trendView.sleepStressIsHowMuchOfThe"),
    ]; } },
  },
  strain: {
    group: "strain", get label() { return tr("queries.trendView.dayStrain"); }, get card() { return tr("ui.shells.HomeHeader.strain"); }, get short() { return tr("queries.trendView.dayStrain"); }, unit: "%", format: "int", direction: "neutral", colorBy: "strain", chart: "bars", agg: "daily",
    pick: (r) => dayStrainOf(r.s1), partialToday: true, domain: [0, 100],
    bands: { get title() { return tr("queries.trendView.strainBreakdownDays"); }, round: 0, list: [
      { key: "all_out", get label() { return tr("queries.trendView.allOut"); }, min: 80, detail: ">79%" },
      { key: "strenuous", get label() { return tr("queries.trendView.strenuous"); }, min: 61, detail: "61-79%" },
      { key: "moderate", get label() { return tr("queries.training.moderate"); }, min: 41, detail: "41-60%" },
      { key: "light", get label() { return tr("ui.metrics.SleepStages.light"); }, min: -Infinity, detail: "≤40%" },
    ] },
    about: { get title() { return tr("queries.trendView.whatIsDayStrain"); }, get body() { return [
      tr("queries.trendView.dayStrainIsTheDaySLoad"),
      tr("queries.trendView.itBuildsFromTheTimeYouSpend"),
    ]; } },
  },
  zones13: {
    group: "strain", get label() { return tr("queries.trendView.heartRateZones13"); }, get card() { return tr("queries.trendView.hrZones13"); }, get short() { return tr("queries.trendView.timeInHrZones13"); }, format: "duration", direction: "up", colorBy: "single", chart: "stack", agg: "weekly",
    pick: zoneSum(0, 3), parts: zoneParts(0, 3), series: zoneSeries(0, 3), partBreakdown: "series", partialToday: true,
    get footnote() { return tr("queries.trendView.zoneTimeIsDerivedFromYourHeart"); },
    actions: { addActivity: true, get goal() { return tr("queries.trendView.setAHrZonesGoalInWeekly"); } },
    about: { get title() { return tr("queries.trendView.whatAreHeartRateZones13"); }, get body() { return [
      tr("queries.trendView.zones1To3CoverLightTo"),
      tr("queries.trendView.timeHereBuildsYourAerobicBaseAnd"),
    ]; } },
  },
  zones45: {
    group: "strain", get label() { return tr("queries.trendView.heartRateZones45"); }, get card() { return tr("queries.trendView.hrZones45"); }, get short() { return tr("queries.trendView.timeInHrZones45"); }, format: "duration", direction: "up", colorBy: "single", chart: "stack", agg: "weekly",
    pick: zoneSum(3, 5), parts: zoneParts(3, 5), series: zoneSeries(3, 5), partBreakdown: "series", partialToday: true,
    get footnote() { return tr("queries.trendView.zoneTimeIsDerivedFromYourHeart"); },
    actions: { addActivity: true, get goal() { return tr("queries.trendView.updateYourHrZones45Goal"); } },
    about: { get title() { return tr("queries.trendView.whatAreHeartRateZones45"); }, get body() { return [
      tr("queries.trendView.zones4And5AreHardEffort"),
      tr("queries.trendView.aLittleTimeHereEachWeekRaises"),
    ]; } },
  },
  strength: {
    group: "strain", get label() { return tr("queries.trendView.strengthActivityTime"); }, get short() { return tr("queries.trendView.strengthActivityTime_5a94a7"); }, format: "duration", direction: "up", colorBy: "single", chart: "bars", agg: "weekly",
    pick: (r, x) => (worn(r) || x.strength.has(r.day) ? (x.strength.get(r.day)?.min ?? 0) : null), partBreakdown: "strength", partialToday: true,
    get footnote() { return tr("queries.trendView.strengthActivityTimeIsDerivedFromYour"); },
    actions: { addActivity: true, get goal() { return tr("queries.trendView.setAGoalInWeeklyPlan"); } },
    about: { get title() { return tr("queries.trendView.whatIsStrengthActivityTime"); }, get body() { return [
      tr("queries.trendView.strengthActivityTimeIsTheTimeYou"),
      tr("queries.trendView.regularStrengthWorkBuildsMuscleAndBone"),
    ]; } },
  },
  steps: {
    group: "strain", get label() { return tr("health.dataCheckSummary.steps"); }, get short() { return tr("queries.trendView.steps"); }, format: "grouped", direction: "up", colorBy: "single", chart: "bars", agg: "daily",
    pick: (r) => r.metrics?.steps, partialToday: true,
    actions: { get goal() { return tr("queries.trendView.updateYourDailyStepGoal"); } },
    about: { get title() { return tr("queries.trendView.whatAreSteps"); }, get body() { return [
      tr("queries.trendView.stepsAreCountedByYourFitbitThrough"),
    ]; } },
  },
  calories: {
    group: "strain", get label() { return tr("health.dataCheckSummary.calories"); }, get short() { return tr("format.unit.calories"); }, unit: "kcal", format: "grouped", direction: "neutral", colorBy: "single", chart: "bars", agg: "daily",
    pick: (r) => r.metrics?.calories, partialToday: true,
    about: { get title() { return tr("queries.trendView.whatAreCalories"); }, get body() { return [
      tr("queries.trendView.caloriesAreEverythingYouBurnedInThe"),
    ]; } },
  },
  vo2max: {
    group: "health", get label() { return tr("queries.trendView.vo2Max"); }, get short() { return tr("health.dataCheckSummary.vo2Max"); }, unit: "ml/kg/min", format: "decimal1", direction: "up", colorBy: "single", chart: "line", agg: "daily",
    pick: (r) => (r.fitness?.reason === null ? r.fitness.vo2max : null), typical: true,
    about: { get title() { return tr("queries.trendView.whatIsVo2Max"); }, get body() { return [
      tr("queries.trendView.vo2MaxIsTheMostOxygenYour"),
      tr("queries.trendView.itIsOneOfTheStrongestSigns"),
    ]; } },
  },
  lean_mass: {
    group: "health", get label() { return tr("queries.trendView.leanBodyMass"); }, get short() { return tr("queries.trendView.leanBodyMass_aae434"); }, unit: "kg", format: "decimal1", direction: "up", colorBy: "single", chart: "line", agg: "daily",
    pick: (r) => (r.metrics?.weightKg != null && r.metrics.bodyFatPct != null ? r.metrics.weightKg * (1 - r.metrics.bodyFatPct / 100) : null),
    about: { get title() { return tr("queries.trendView.whatIsLeanBodyMass"); }, get body() { return [
      tr("queries.trendView.leanBodyMassIsYourWeightMinus"),
      tr("queries.trendView.moreLeanMassForYourHeightIs"),
    ]; } },
  },
} as const satisfies Record<string, Def>;

export type TrendViewKey = keyof typeof TREND_VIEW;
export const isTrendViewKey = (k: string): k is TrendViewKey => k in TREND_VIEW && !flagOff(k as TrendViewKey);
const def = (k: TrendViewKey): Def => TREND_VIEW[k];
const flagOff = (k: TrendViewKey) => {
  const f = def(k).flag;
  return f !== undefined && !FEATURES[f];
};

export type TrendViewVM = {
  key: TrendViewKey;
  label: string;
  /** The Weekly Trends card's title. */
  card: string;
  unit?: string;
  format: FormatKey;
  direction: GoodDirection;
  colorBy: Def["colorBy"];
  chart: TrendViewChart;
  agg: TrendAgg;
  series?: readonly { key: string; label: string }[];
  domain?: [number, number];
  /** The dropdown: the other metrics of the same screen. */
  options: { key: TrendViewKey; label: string }[];
  range: TrendViewRange;
  offset: number;
  from: string;
  to: string;
  period: string;
  /** Older data exists before `from`. */
  canPrev: boolean;
  /** "Average", "Weekly total", "Avg. weekly total". */
  caption: string;
  value: number | null;
  prior: number | null;
  /** Whole-percent change against the prior window. */
  change: number | null;
  tone: Tone;
  verdict: string;
  /** W and M: one bar per day (per week for weekly totals in M); 6M: the days (weeks) behind the month segments. */
  bars: TrendViewBar[];
  segments: MonthSegment[] | null;
  typical: [number, number] | null;
  breakdown: { title: string; unit: "days" | "duration"; items: { key: string; label: string; detail?: string; value: number }[] } | null;
  footnote: string | null;
  actions: NonNullable<Def["actions"]>;
  about: Def["about"];
};

const wholeMonths = (segs: MonthSegment[]) => {
  const out = segs[0] && !segs[0].from.endsWith("-01") ? segs.slice(1) : segs;
  return out.map((s, i) => (i === 0 ? { ...s, change: null } : s));
};

const PRIOR_WORD: Record<TrendViewRange, string> = { w: "week", m: "month", get "6m"() { return tr("queries.trendView.6Months"); } };
export const priorLabel = (r: TrendViewRange) => tr("queries.trendView.vsPrior", { v0: PRIOR_WORD[r] });

const typeName = (e: ExerciseRow) => {
  if (e.name) return e.name;
  if (language() === "fr") {
    if (/HIGH_INTENSITY_INTERVAL/.test(e.type)) return tr("exercise.hiit");
    if (/CALISTHENICS/.test(e.type)) return tr("exercise.calisthenics");
    if (/WEIGHT/.test(e.type)) return tr("exercise.weightlifting");
    if (/STRENGTH/.test(e.type)) return tr("exercise.strength");
  }
  return e.type.toLowerCase().replace(/(^|_)(\w)/g, (_, s: string, c: string) => `${s ? " " : ""}${c.toUpperCase()}`);
};

export async function getTrendView(key: TrendViewKey, end: string, range: TrendViewRange, offset: number, ctx: QueryCtx): Promise<TrendViewVM> {
  const m = def(key);
  const today = todayOf(ctx);
  const win = periodWindow(end, range, offset, m.agg);
  const prior = periodWindow(end, range, offset + 1, m.agg);
  // The typical range looks back 60 days from the window's end, so it may reach before the prior window.
  const loadFrom = m.typical ? (addDays(win.to, -59) < prior.from ? addDays(win.to, -59) : prior.from) : prior.from;
  const [rows, first, exs] = await Promise.all([
    loadDays(ctx, addDays(loadFrom, -1), win.to),
    firstDay(ctx),
    m.partBreakdown === "strength" ? exercisesBetween(ctx, prior.from, win.to) : Promise.resolve([] as ExerciseRow[]),
  ]);
  const strength: Ctx["strength"] = new Map();
  for (const e of exs) {
    if (activityKind(e.type) !== "strength") continue;
    const s = strength.get(e.day) ?? { min: 0, byType: {} };
    const min = (e.endTs - e.startTs) / 60;
    s.min += min;
    s.byType[typeName(e)] = (s.byType[typeName(e)] ?? 0) + min;
    strength.set(e.day, s);
  }
  const x: Ctx = { strength, tz: ctx.timeZone, rows };

  const day = (d: string) => {
    const r = rows.get(d);
    const v = r ? m.pick(r, x) : null;
    return {
      day: d,
      value: finite(v) ? v : null,
      ...(m.partialToday && d === today && { provisional: true }),
      ...(m.parts && { parts: r && finite(v) ? m.parts(r, x) : null }),
    };
  };
  const span = (from: string, to: string) => {
    const out = [];
    for (let d = from; d <= to; d = addDays(d, 1)) out.push(day(d));
    return out;
  };
  const cur = span(win.from, win.to);
  const old = span(prior.from, prior.to);
  // Today's running total is drawn, not averaged.
  const settled = (ps: typeof cur) => (m.agg === "weekly" ? ps : ps.map((p) => (p.provisional ? { ...p, value: null } : p)));

  const headline = (ps: typeof cur) => (m.agg === "weekly" ? mean(weeklyTotals(ps).map((w) => w.value)) : mean(ps.map((p) => p.value)));
  const value = headline(settled(cur));
  const priorValue = headline(old);
  const change = relativeChange(value, priorValue);
  const tone: Tone = value === null || priorValue === null || change === 0 ? "neutral" : deltaTone(m.direction, value, priorValue).tone;

  const typicalStats = m.typical ? meanSd(span(addDays(win.to, -59), win.to).map((p) => p.value)) : null;
  const typical: [number, number] | null =
    typicalStats?.mean != null && typicalStats.sd !== undefined ? [typicalStats.mean - typicalStats.sd, typicalStats.mean + typicalStats.sd] : null;

  const fmt = (v: number) => `${formatValue(m.format, v)}${m.unit === "%" ? "%" : ""}`;
  const weeklyBars = m.agg === "weekly" && range !== "w";
  // A bed-to-wake bar carries two clock labels, which only fit a few dozen bars: M draws one per whole week, 6M one per whole month.
  const rangeBars = m.chart === "range" && range !== "w";
  const bars: TrendViewBar[] = weeklyBars
    ? weeklyTotals(cur).map((w, i, all) => {
        const days = cur.filter((p) => p.day >= w.from && p.day <= w.to);
        const parts = m.series && days.some((p) => p.parts) ? Object.fromEntries(m.series.map((s) => [s.key, days.reduce((a, p) => a + (p.parts?.[s.key] ?? 0), 0)])) : undefined;
        return { from: w.from, to: w.to, value: w.value, ...(i === all.length - 1 && days.some((p) => p.provisional) && { provisional: true }), ...(parts && { parts }) };
      })
    : rangeBars
      ? (range === "m" ? weeklyTotals(cur).filter((w) => addDays(w.from, 6) === w.to) : wholeMonths(monthSegments(cur))).map(({ from, to }) => {
          const days = cur.flatMap((p) => (p.day >= from && p.day <= to && "parts" in p && p.parts ? [{ value: p.value, bed: p.parts.bed, wake: p.parts.wake }] : []));
          return { from, to, value: mean(days.map((d) => d.value)), parts: days.length ? { bed: mean(days.map((d) => d.bed))!, wake: mean(days.map((d) => d.wake))! } : null };
        })
    : cur.map((p) => ({ from: p.day, to: p.day, value: p.value, ...(p.provisional && { provisional: true }), ...("parts" in p && { parts: p.parts }) }));

  const b = m.bands;
  const k = 10 ** (b?.round ?? 0);
  const values = settled(cur).map((p) => (p.value === null ? null : b?.round !== undefined ? Math.round(p.value * k) / k : p.value));
  const weeks = Math.max(1, weeklyTotals(cur).length);
  const perWeek = (total: number) => (range === "w" ? total : total / weeks);
  const breakdown: TrendViewVM["breakdown"] = b
    ? { title: b.title, unit: "days", items: bandCounts(values, b.list).map((c) => ({ key: c.key, label: c.label, detail: c.detail, value: c.count })) }
    : m.partBreakdown === "series" && m.series
      ? {
          title: tr("queries.trendView.hrZonesBreakdown", { v0: range === "w" ? tr("queries.trendView.weeklyTotal_d2b3c6") : tr("queries.trendView.avgWeeklyTotal_ea7c51") }),
          unit: "duration",
          items: [...m.series].reverse().map((s) => ({ key: s.key, label: s.label, value: perWeek(settled(cur).reduce((a, p) => a + (p.parts?.[s.key] ?? 0), 0)) })),
        }
      : m.partBreakdown === "strength"
        ? {
            title: tr("queries.trendView.strengthActivityBreakdown", { v0: range === "w" ? tr("queries.trendView.weeklyTotal_d2b3c6") : tr("queries.trendView.avgWeeklyTotal_ea7c51") }),
            unit: "duration",
            items: Object.entries(
              cur.reduce<Record<string, number>>((acc, p) => {
                for (const [t, v] of Object.entries(strength.get(p.day)?.byType ?? {})) acc[t] = (acc[t] ?? 0) + v;
                return acc;
              }, {}),
            )
              .sort((a, c) => c[1] - a[1])
              .map(([t, v]) => ({ key: t, label: t, value: perWeek(v) })),
          }
        : null;

  const todayNote = m.partialToday && m.agg === "daily" && win.to >= today && win.from <= today ? tr("queries.trendView.averageDoesNotIncludeToday", { v0: formatDay(today, { month: "short", day: "numeric" }) }) : null;

  return {
    key,
    label: m.label,
    card: m.card ?? m.label,
    ...(m.unit && { unit: m.unit }),
    format: m.format,
    direction: m.direction,
    colorBy: m.colorBy,
    chart: m.chart,
    agg: m.agg,
    ...(m.series && { series: m.series }),
    ...(m.domain && { domain: m.domain }),
    options: (Object.keys(TREND_VIEW) as TrendViewKey[]).filter((o) => def(o).group === m.group && !flagOff(o)).map((o) => ({ key: o, label: def(o).label })),
    range,
    offset,
    from: win.from,
    to: win.to,
    period: periodLabel(win.from, win.to),
    canPrev: first !== null && first < win.from,
    caption: m.agg === "weekly" ? (range === "w" ? tr("queries.trendView.weeklyTotal") : tr("queries.trendView.avgWeeklyTotal")) : tr("health.HeartRateScreen.average"),
    value,
    prior: priorValue,
    change,
    tone,
    verdict: verdict({ label: m.short, range, agg: m.agg, now: value, prior: priorValue, fmt, typical }),
    bars,
    segments: range === "6m" && !rangeBars ? wholeMonths(monthSegments(settled(cur), m.agg)) : null,
    typical,
    breakdown,
    footnote: [m.footnote, todayNote].filter(Boolean).join(" ") || null,
    actions: m.actions ?? {},
    about: m.about,
  };
}

/** Weekly Trends (spec §11 R32): each metric's 7 days ending on `day`, the same view model as its Trend View's W. */
export const getWeeklyTrends = (keys: readonly TrendViewKey[], day: string, ctx: QueryCtx) =>
  Promise.all(keys.filter((k) => !flagOff(k)).map((k) => getTrendView(k, day, "w", 0, ctx)));
