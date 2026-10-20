import { tr } from "@/i18n";
// Mobile: Activity Cost and detected activities for the Activities and Activity screens, Insights and the coach. Activity
// Cost is stage 2's stored result (src/core/algorithms/activityCost.ts) with the screens' names; the wording lives here
// so every surface says the same thing.
import { activityCostConfig, barelyMoves } from "@/core/algorithms/activityCost";
import type { DetectedActivity, DetectedKind } from "@/core/algorithms/autoWorkout";
import { ACTIVITY_NAME, ms, type QueryCtx } from "./common";
import { FORMATS } from "./_lib";
import type { ActivityCostEntry, ActivityCostVM, ActivityKind, DetectedItem } from "./types";

/** Every kind's Activity Cost, measured kinds first; null before stage 2 has stored one. */
export async function getActivityCost(ctx: QueryCtx): Promise<ActivityCostVM | null> {
  const r = await ctx.store.getActivityCost();
  if (!r) return null;
  return {
    baseline: r.baseline,
    baselineKind: r.baselineKind,
    minSessions: activityCostConfig.minSessions,
    items: r.items.map((i) => ({ ...i, kind: i.kind as ActivityKind, name: ACTIVITY_NAME[i.kind as ActivityKind] ?? ACTIVITY_NAME.workout })),
  };
}

const PLURAL: Record<ActivityKind, string> = { get run() { return tr("activity.runs"); }, get ride() { return tr("activity.rides"); }, get walk() { return tr("activity.walks"); }, get strength() { return tr("queries.activityCost.strengthSessions"); }, get workout() { return tr("activity.workouts"); } };
const GERUND: Record<ActivityKind, string> = { get run() { return tr("activity.running"); }, get ride() { return tr("activity.cycling"); }, get walk() { return tr("activity.walking"); }, get strength() { return tr("queries.activityCost.strengthTraining"); }, get workout() { return tr("queries.activityCost.aWorkout"); } };
const AGAINST: Record<ActivityCostVM["baselineKind"], string> = { get rest() { return tr("queries.activityCost.yourRestDays"); }, get all() { return tr("queries.activityCost.yourAverage"); } };

/** "−8%", "+3%": the change in next-morning Recovery; null when not measured. */
export const costValue = (e: ActivityCostEntry) => (e.reason === null ? `${FORMATS.signedInt(e.change)}%` : null);

/** Which way the change goes, for its colour: a cost, a lift, or barely any. */
export const costTone = (e: ActivityCostEntry): "cost" | "lift" | "flat" =>
  e.reason !== null || barelyMoves(e.change) ? "flat" : e.change < 0 ? "cost" : "lift";

/** The bounce-back: "Back in about 2 days", or what the change means when there is nothing to bounce back from. */
export function bounceText(e: ActivityCostEntry): string {
  if (e.reason !== null) return tr("queries.activityCost.notEnoughDataYet");
  if (barelyMoves(e.change)) return tr("queries.activityCost.barelyMovesNextMorningRecovery");
  if (e.change > 0) return tr("queries.activityCost.higherRecoveryTheNextMorning");
  if (e.daysToBaseline === null) return tr("queries.activityCost.notBackToBaselineWithinAWeek");
  return e.daysToBaseline === 1 ? tr("queries.activityCost.backToBaselineTheNextMorning") : tr("queries.activityCost.backToBaselineInAboutDays", { v0: e.daysToBaseline });
}

/** The row caption: the bounce-back and how many workouts it rests on, or how many more it needs. */
export function costCaption(e: ActivityCostEntry, minSessions: number): string {
  if (e.reason !== null) return tr("queries.activityCost.notEnoughDataYetOf", { v0: e.sessions, v1: minSessions, v2: PLURAL[e.kind] });
  return tr("queries.activityCost.text", { v0: bounceText(e), v1: e.sessions, v2: PLURAL[e.kind], v3: e.confidence === "building" ? tr("queries.activityCost.earlyEstimate") : "" });
}

/** One plain sentence for the Activity screen and the coach. */
export function costSentence(e: ActivityCostEntry, vm: Pick<ActivityCostVM, "baselineKind" | "minSessions">): string {
  const after = tr("queries.activityCost.after", { v0: GERUND[e.kind] });
  if (e.reason !== null)
    return tr("queries.activityCost.pulseNeedsWithARecoveryTheNext", { v0: vm.minSessions, v1: PLURAL[e.kind], v2: e.sessions });
  const against = AGAINST[vm.baselineKind];
  if (barelyMoves(e.change)) return tr("queries.activityCost.yourNextMorningRecoveryIsAboutThe", { v0: after, v1: against });
  const pts = Math.round(Math.abs(e.change));
  if (e.change > 0) return tr("queries.activityCost.yourRecoveryTheNextMorningAveragesAbove", { v0: after, v1: pts, v2: against });
  const head = tr("queries.activityCost.yourRecoveryTheNextMorningAveragesBelow", { v0: after, v1: pts, v2: against });
  if (e.daysToBaseline === null) return tr("queries.activityCost.andIsStillLowerAWeekLater", { v0: head });
  if (e.daysToBaseline === 1) return tr("queries.activityCost.closeEnoughToCountAsRecovered", { v0: head });
  return tr("queries.activityCost.andTakesAboutDaysToComeBack", { v0: head, v1: e.daysToBaseline });
}

/** "Measured against your rest days (64%)". */
export const baselineText = (vm: Pick<ActivityCostVM, "baseline" | "baselineKind">) =>
  vm.baseline === null ? null : tr("queries.activityCost.measuredAgainst", { v0: AGAINST[vm.baselineKind], v1: FORMATS.int(vm.baseline) });

/** The coach's digest (get_activities): each kind's change in Recovery points and bounce-back, or why it isn't measured. */
export function costDigest(vm: ActivityCostVM) {
  return {
    unit: tr("queries.activityCost.recoveryPercentagePoints"),
    baseline: vm.baseline === null ? null : Math.round(vm.baseline),
    baselineIs: vm.baselineKind === "rest" ? tr("queries.activityCost.meanRecoveryOnDaysWithNoWorkout") : tr("queries.activityCost.meanRecoveryOverEveryDayTooFew"),
    kinds: vm.items.map((e) =>
      e.reason === null
        ? { activity: e.name, workoutsMeasured: e.sessions, nextMorningChange: Math.round(e.change), daysToBaseline: e.daysToBaseline, confidence: e.confidence, summary: costSentence(e, vm), reason: null }
        : { activity: e.name, workoutsMeasured: e.sessions, needed: vm.minSessions, reason: e.reason },
    ),
  };
}

export const DETECTED_LABEL: Record<DetectedKind, string> = { get walk() { return tr("queries.activityCost.walking"); }, get run() { return tr("queries.activityCost.running"); }, get cardio() { return tr("queries.activityCost.otherCardio"); } };

/** A stored detected window as the screens show it. */
export const detectedItem = (d: DetectedActivity): DetectedItem => ({
  kind: d.kind,
  label: DETECTED_LABEL[d.kind],
  start: ms(d.start),
  end: ms(d.end),
  avgHr: d.avgHr,
  maxHr: d.maxHr,
  // A detected window has no engine units, so no strain on the percent scale.
  strain: null,
  steps: d.steps,
});
