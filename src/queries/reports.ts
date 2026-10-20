import { behaviorLabel } from "@/lib/behaviors";
import { displayUnit } from "@/lib/format";
import { reportCopy } from "./reportCopy";
import { tr, language } from "@/i18n";
// Reports (spec §7.13): one ISO week or calendar month, and the archive of every period with data. Ported from Pulse's
// src/server/queries/reports.ts; the web's `reports` table reads are Store reads (`store.getReports()`, which the
// pipeline's stage 2 rewrites on every run), and the VM shapes are the web's, verbatim. A phone addition rides along:
// the Performance Assessment (`performance`, after WHOOP's), computed here from the stored days of the period and the
// one before it, so the stored reports are unchanged.
import { assessPeriod, periodBounds, previousPeriod, type AssessKey, type Assessment, type AssessmentDay, type Report } from "@/core/algorithms/reports";
import { PLAN_DEFAULTS, type PlanTargets } from "@/core/algorithms/weeklyPlan";
import type { ReportRow } from "@/data/store";
import { DEFAULT_JOURNAL_TAGS } from "@/data/seed";
import { FORMATS, hmm } from "./_lib";
import { type DayRow, exercisesBetween, finite, loadDays, none, ok, type QueryCtx, dayStrainOf } from "./common";
import { latestReport } from "./home";
import type { DriverItem, KeyStat, Metric, ReportVM, StackedSegment } from "./types";
import { planDays } from "./weeklyPlan";

/** The web's `like('____-W__')` and `like('____-__')`. */
export const WEEK_PERIOD = /^\d{4}-W\d{2}$/;
export const MONTH_PERIOD = /^\d{4}-\d{2}$/;
const patternOf = (kind: "week" | "month") => (kind === "week" ? WEEK_PERIOD : MONTH_PERIOD);

/** Every stored report, ascending by period (the Store's order). */
const allReports = (ctx: QueryCtx): Promise<ReportRow[]> => ctx.store.getReports();

const readReport = (rows: ReportRow[], period: string) => rows.find((r) => r.period === period)?.data ?? null;

/** The nearest same-kind period before (`dir` -1) or after (+1) `period`, or null. */
function neighbour(rows: ReportRow[], pattern: RegExp, period: string, dir: -1 | 1): string | null {
  const same = rows.filter((r) => pattern.test(r.period)).map((r) => r.period);
  if (dir < 0) return same.filter((p) => p < period).sort().at(-1) ?? null;
  return same.filter((p) => p > period).sort()[0] ?? null;
}

/** Training Load's status (the Pulse engine's) as the report's training balance. */
const BALANCE = {
  maintaining: { status: "balanced", get word() { return tr("queries.reports.balanced"); }, get line() { return tr("queries.reports.yourTrainingHeldSteadyWithWhatYour"); } },
  peaking: { status: "balanced", get word() { return tr("queries.reports.balanced"); }, get line() { return tr("queries.reports.yourFitnessKeptClimbingAtAPace"); } },
  productive: { status: "balanced", get word() { return tr("queries.reports.balanced"); }, get line() { return tr("queries.reports.yourFatigueRanALittleAboveYour"); } },
  fatigued: { status: "overreaching", get word() { return tr("more.howItWorksContent.overreaching"); }, get line() { return tr("queries.reports.yourFatigueRanAboveYourFitnessWhile"); } },
  overtraining: { status: "overreaching", get word() { return tr("more.howItWorksContent.overreaching"); }, get line() { return tr("queries.reports.yourFatigueJumpedWellAboveYourFitness"); } },
  detraining: { status: "undertrained", get word() { return tr("queries.reports.undertrained"); }, get line() { return tr("queries.reports.yourFitnessWasFallingItSlowlyFades"); } },
} as const;

/** Reports `/reports/[period]` (spec §7.13); null for a period with no data. `targets`: the Weekly Plan's. */
export async function getReport(period: string, ctx: QueryCtx, targets: PlanTargets = PLAN_DEFAULTS.targets): Promise<ReportPageVM | null> {
  const all = await allReports(ctx);
  const r = readReport(all, period);
  if (!r || r.days === 0) return null;
  const kind = r.kind;
  const pattern = patternOf(kind);
  const prev = neighbour(all, pattern, period, -1);
  const next = neighbour(all, pattern, period, 1);
  const before = periodBounds(previousPeriod(period));
  const [both, exs, latestWeek, latestMonth, labels] = await Promise.all([
    loadDays(ctx, before.start, r.end),
    exercisesBetween(ctx, before.start, r.end),
    latestReport(ctx, "week"),
    latestReport(ctx, "month"),
    tagLabels(ctx),
  ]);
  const rows = new Map([...both].filter(([day]) => day >= r.start));
  const prevReport = prev ? readReport(all, prev) : null;

  const avg = (v: number | null): Metric<number> => (finite(v) ? ok(v) : none("no_data"));
  const word = tr(kind === "week" ? "period.week" : "period.month");
  const stat = (key: string, label: string, v: number | null, prevV: number | null | undefined, unit: string | undefined, direction: KeyStat["direction"]): KeyStat => ({
    key,
    label,
    metric: avg(v),
    ...(unit && { unit }),
    average: finite(prevV) ? prevV : null,
    direction,
  });
  const a = r.averages;
  const pa = prevReport?.averages;

  const bands: StackedSegment[] = [
    { key: "green", label: tr("queries.reports.green67100"), count: r.bands.green, color: "recovery-green" },
    { key: "yellow", label: tr("queries.reports.yellow3466"), count: r.bands.yellow, color: "recovery-yellow" },
    { key: "red", label: tr("queries.reports.red033"), count: r.bands.red, color: "recovery-red" },
  ];
  const scored = r.bands.green + r.bands.yellow + r.bands.red;

  let inTarget = 0;
  let withTarget = 0;
  for (const row of rows.values()) {
    const t = row.strainTarget;
    const s = dayStrainOf(row.s1);
    if (t?.reason === null && s != null) {
      withTarget++;
      if (s >= t.low && s <= t.high) inTarget++;
    }
  }
  const tb = r.trainingBalance ? BALANCE[r.trainingBalance.status as keyof typeof BALANCE] : null;
  const strainOf = (day: string) => dayStrainOf(rows.get(day)?.s1);

  const impacts: DriverItem[] = r.topImpacts.map((t) => ({
    key: t.tag,
    label: labels.get(t.tag) ?? t.tag,
    delta: t.effects.recovery.delta!,
    effect: t.effects.recovery.label === "positive" ? "positive" : "negative",
    yes: t.effects.recovery.nYes,
    no: t.effects.recovery.nNo,
    ci: [t.effects.recovery.ciLow!, t.effects.recovery.ciHigh!],
  }));

  return {
    period,
    kind,
    start: r.start,
    end: r.end,
    partial: r.partial,
    prev,
    next,
    latestWeek: latestWeek?.period ?? null,
    latestMonth: latestMonth?.period ?? null,
    dials: [
      { key: "sleep", label: tr("reports.ReportScreen.avgSleep"), metric: avg(a.sleepPerf), delta: r.deltas.sleepPerf },
      { key: "recovery", label: tr("reports.ReportScreen.avgRecovery"), metric: avg(a.recovery), delta: r.deltas.recovery },
      { key: "strain", label: tr("activity.ActivitiesScreen.avgStrain"), metric: avg(a.strain), delta: r.deltas.strain },
    ],
    insight: insightOf(r, word, inTarget, withTarget),
    bands: scored ? ok(bands) : none("no_data"),
    averages: [
      stat("recovery", tr("ui.shells.HomeHeader.recovery"), a.recovery, pa?.recovery, "%", "up"),
      stat("strain", tr("lib.dashboard.dayStrain"), a.strain, pa?.strain, "%", "neutral"),
      stat("sleepPerf", tr("lib.dashboard.sleepPerformance"), a.sleepPerf, pa?.sleepPerf, "%", "up"),
      stat("sleepHours", tr("lib.dashboard.hoursOfSleep"), a.sleepHours, pa?.sleepHours, "h", "up"),
      stat("consistency", tr("lib.dashboard.sleepConsistency"), r.sleepConsistency, prevReport?.sleepConsistency, "%", "up"),
      stat("hrv", tr("lib.dashboard.heartRateVariability"), a.hrv, pa?.hrv, "ms", "up"),
      stat("rhr", tr("lib.dashboard.restingHeartRate"), a.rhr, pa?.rhr, "bpm", "down"),
    ],
    trainingBalance: r.trainingBalance && tb ? ok({ status: tb.status, word: tb.word, acwr: r.trainingBalance.acwr, line: tb.line }) : none("no_data"),
    topImpacts: impacts,
    performance: performanceOf(assessPeriod(...assessmentDays(both, exs, r.start, before.start), kind, targets, language() === "fr" ? reportCopy : undefined), targets),
    bestWorst:
      r.best && r.worst && scored >= 2
        ? [
            { label: tr("reports.ReportScreen.bestDay"), day: r.best.day, recovery: r.best.recovery, strain: strainOf(r.best.day) },
            { label: tr("queries.reports.worstDay"), day: r.worst.day, recovery: r.worst.recovery, strain: strainOf(r.worst.day) },
          ]
        : null,
  };
}

// ── Performance assessment (phone addition) ─────────────────────────────────

/** One of the biggest changes: "Sleep consistency", "−12%". */
export type ReportChange = { key: AssessKey; label: string; text: string; better: boolean };

export type PerformanceVM = {
  /** 1–2 plain-language focus points, most salient first. */
  focus: string[];
  /** Up to 2 each, the largest first. */
  improved: ReportChange[];
  declined: ReportChange[];
  /** Hours slept, sleep need, nights at need and consistency, against the period before. */
  sleep: KeyStat[];
  /** Moderate and vigorous minutes and strength sessions a week, daily steps, against the period before. */
  activity: KeyStat[];
};

export type ReportPageVM = ReportVM & { performance: PerformanceVM };

const NBSP = "\u00a0";

/** How each assessment metric is named and how its change prints. */
const CHANGE: Record<AssessKey, { label: string; text: (d: number) => string }> = {
  recovery: { get label() { return tr("ui.shells.HomeHeader.recovery"); }, text: (d) => `${FORMATS.signedInt(d)}%` },
  strain: { get label() { return tr("lib.dashboard.dayStrain"); }, text: (d) => `${FORMATS.signedInt(d)}%` },
  sleepPerf: { get label() { return tr("lib.dashboard.sleepPerformance"); }, text: (d) => `${FORMATS.signedInt(d)}%` },
  hrv: { get label() { return tr("lib.dashboard.heartRateVariability"); }, text: (d) => `${FORMATS.signedInt(d)}${NBSP}ms` },
  rhr: { get label() { return tr("lib.dashboard.restingHeartRate"); }, text: (d) => `${FORMATS.signedInt(d)}${NBSP}bpm` },
  slept: { get label() { return tr("queries.reports.hoursSlept"); }, text: (d) => `${d > 0 ? "+" : "−"}${hmm(Math.abs(d))}` },
  consistency: { get label() { return tr("lib.dashboard.sleepConsistency"); }, text: (d) => `${FORMATS.signedInt(d)}%` },
  zone13: { get label() { return tr("queries.health.moderateActivity"); }, text: (d) => tr("queries.reports.minAWeek", { v0: FORMATS.signedInt(d), v1: NBSP }) },
  zone45: { get label() { return tr("queries.reports.vigorousActivity"); }, text: (d) => tr("queries.reports.minAWeek", { v0: FORMATS.signedInt(d), v1: NBSP }) },
  strength: { get label() { return tr("queries.reports.strengthSessions"); }, text: (d) => tr("queries.reports.aWeek", { v0: FORMATS.signed1(d) }) },
  steps: { get label() { return tr("queries.health.dailySteps"); }, text: (d) => `${d > 0 ? "+" : ""}${FORMATS.grouped(d)}` },
};

/** The stored days as assessment days: the period's (from `start`) and the period before's (`prevStart` up to `start`). */
function assessmentDays(rows: Map<string, DayRow>, exs: Parameters<typeof planDays>[1], start: string, prevStart: string): [AssessmentDay[], AssessmentDay[]] {
  const plan = new Map(planDays(rows, exs).map((d) => [d.day, d]));
  const cur: AssessmentDay[] = [];
  const prev: AssessmentDay[] = [];
  for (const row of rows.values()) {
    if (row.day < prevStart) continue;
    const day: AssessmentDay = {
      ...plan.get(row.day)!,
      recovery: finite(row.recovery?.value) ? row.recovery.value : null,
      strain: dayStrainOf(row.s1),
      sleepPerf: finite(row.sleep?.performance) ? row.sleep.performance : null,
      hrv: finite(row.recovery?.inputs.hrv) ? row.recovery.inputs.hrv : null,
      // As the stored report's days take it (src/pipeline/scores.ts recordOutcomes).
      rhr: finite(row.recovery?.inputs.rhr) ? row.recovery.inputs.rhr : finite(row.metrics?.rhrBpm) ? row.metrics.rhrBpm : null,
    };
    (row.day >= start ? cur : prev).push(day);
  }
  return [cur, prev];
}

const valueMetric = (v: number | null): Metric<number> => (finite(v) ? ok(v) : none("no_data"));

function performanceOf(a: Assessment, t: PlanTargets): PerformanceVM {
  const s = a.stats;
  const change = (st: Assessment["improved"][number], better: boolean): ReportChange => ({ key: st.key, label: CHANGE[st.key].label, text: CHANGE[st.key].text(st.delta!), better });
  const vs = (key: AssessKey, label: string, unit: string | undefined, format: KeyStat["format"], caption?: string): KeyStat => ({
    key,
    label,
    metric: valueMetric(s[key].value),
    ...(unit && { unit }),
    average: s[key].previous,
    direction: "up",
    ...(format && { format }),
    ...(caption && { caption }),
  });
  const whole = (k: AssessKey) => [s[k].value, s[k].previous].every((v) => v === null || Math.abs(v - Math.round(v)) < 0.05);
  const { sleptMin, needMin, nightsMet, nights } = a.sleep;
  return {
    focus: a.focus,
    improved: a.improved.map((x) => change(x, true)),
    declined: a.declined.map((x) => change(x, false)),
    sleep: [
      vs("slept", tr("queries.reports.hoursSlept"), undefined, "duration", needMin === null ? undefined : tr("queries.reports.needANight", { v0: hmm(needMin) })),
      {
        key: "nightsMet",
        label: tr("queries.reports.nightsAtSleepNeed"),
        metric: nights ? ok(nightsMet) : none("no_data"),
        ...(nights > 0 && { unit: tr("goals.Goals.of", { v0: nights }) }),
        average: null,
        direction: "none",
        format: "int",
        ...(sleptMin !== null && needMin !== null && { caption: sleptMin >= needMin ? tr("queries.reports.youCoveredYourNeedOnAverage") : tr("queries.reports.shortANightOnAverage", { v0: hmm(needMin - sleptMin) }) }),
      },
      vs("consistency", tr("lib.dashboard.sleepConsistency"), "%", "int", tr("queries.reports.target", { v0: t.consistency })),
    ],
    activity: [
      vs("zone13", tr("queries.health.moderateActivity"), "min", "grouped", tr("queries.reports.zones13AWeekTarget", { v0: t.zone13 })),
      vs("zone45", tr("queries.reports.vigorousActivity"), "min", "grouped", tr("queries.reports.zones45AWeekTarget", { v0: t.zone45 })),
      vs("strength", tr("queries.reports.strengthSessions"), undefined, whole("strength") ? "int" : "decimal1", tr("queries.reports.aWeekTarget", { v0: t.strength })),
      vs("steps", tr("queries.health.dailySteps"), undefined, "grouped", tr("queries.reports.targetADay", { v0: FORMATS.grouped(t.steps) })),
    ],
  };
}

/**
 * Behaviour labels by tag (the web's `journal_tags` read). The Journal inserts the default rows the first time it reads
 * them, so until then the defaults' own labels stand in; a tag with no row shows by its key, as on the web.
 */
async function tagLabels(ctx: QueryCtx): Promise<Map<string, string>> {
  const rows = await ctx.store.journalTags();
  return new Map<string, string>([...DEFAULT_JOURNAL_TAGS.map((t) => [t.tag, behaviorLabel(t.tag, t.label)] as const), ...rows.map((r) => [r.tag, behaviorLabel(r.tag, r.label)] as const)]);
}

function insightOf(r: Report, word: string, inTarget: number, withTarget: number): string | null {
  if (r.averages.recovery == null) return null;
  const scored = r.bands.green + r.bands.yellow + r.bands.red;
  const mood = r.bands.red > r.bands.green ? tr("queries.reports.aDemanding") : r.bands.green * 2 >= scored ? tr("queries.reports.aStrong") : tr("queries.reports.aBalanced");
  const parts = [tr("queries.reports.green", { v0: mood, v1: word, v2: r.bands.green, v3: displayUnit(r.bands.green === 1 ? "day" : "days") })];
  if (withTarget) parts[0] += tr("report.inTarget", { met: inTarget, count: withTarget });
  parts[0] += ".";
  if (r.deltas.sleepPerf != null && Math.abs(r.deltas.sleepPerf) >= 3) {
    parts.push(tr("queries.reports.sleepPerformancePointsFromLast", { v0: r.deltas.sleepPerf > 0 ? tr("report.rose") : tr("report.dipped"), v1: Math.abs(Math.round(r.deltas.sleepPerf)), v2: word }));
  }
  return parts.join(" ");
}

/** One period in the archive: its dates and the three headline averages (null where none). */
export type ReportListItem = {
  period: string;
  start: string;
  end: string;
  partial: boolean;
  recovery: number | null;
  strain: number | null;
  sleepPerf: number | null;
};
export type ReportArchiveVM = { weeks: ReportListItem[]; months: ReportListItem[] };

/** Reports archive `/reports` (More): every week and month that has data, newest first. */
export async function getReportArchive(ctx: QueryCtx): Promise<ReportArchiveVM> {
  const rows = [...(await allReports(ctx))].sort((a, b) => (a.period < b.period ? 1 : a.period > b.period ? -1 : 0));
  const out: ReportArchiveVM = { weeks: [], months: [] };
  for (const row of rows) {
    const r = row.data;
    if (!r.days) continue;
    const a = r.averages;
    (r.kind === "week" ? out.weeks : out.months).push({
      period: row.period,
      start: r.start,
      end: r.end,
      partial: r.partial,
      recovery: finite(a.recovery) ? a.recovery : null,
      strain: finite(a.strain) ? a.strain : null,
      sleepPerf: finite(a.sleepPerf) ? a.sleepPerf : null,
    });
  }
  return out;
}
