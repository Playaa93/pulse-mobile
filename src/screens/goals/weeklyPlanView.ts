import { language, tr } from "@/i18n";
import { PLAN_LIMITS, parsePlanTarget } from "@/core/algorithms/weeklyPlan";
// The Weekly Plan sheet's words (src/screens/goals/WeeklyPlan.tsx; halo src/screens/home/weeklyPlanView.ts): value and
// target text, the status word and its DeltaMark, the line under each target, and Pulse Age's years. Pure, so it is tested without React.
import type { PlanKey, PlanStatus } from "@/core/algorithms/weeklyPlan";
import type { DeltaDir, Tone } from "@/lib/bands";
import { displayUnit, FORMATS, formatValue, MISSING, NBSP } from "@/lib/format";
import type { PlanRow } from "@/queries/weeklyPlan";

/** Each status's word and its DeltaMark, as KeyStatRow marks a value: done up and good, behind and missed down and bad, on pace a grey dot, no data none. */
export const PLAN_STATUS: Record<PlanStatus, { word: string; mark: { dir: DeltaDir; tone: Tone } | null }> = {
  done: { get word() { return tr("common.done"); }, mark: { dir: "up", tone: "good" } },
  on_pace: { get word() { return tr("goals.weeklyPlanView.onPace"); }, mark: { dir: "flat", tone: "neutral" } },
  behind: { get word() { return tr("goals.weeklyPlanView.behind"); }, mark: { dir: "down", tone: "bad" } },
  missed: { get word() { return tr("goals.weeklyPlanView.missed"); }, mark: { dir: "down", tone: "bad" } },
  no_data: { get word() { return tr("lib.reasons.noData"); }, mark: null },
};

const plural = (n: number, one: string, many = `${one}s`) => `${formatValue("grouped", n)}${NBSP}${displayUnit(n === 1 ? one : many)}`;

type Row = Pick<PlanRow, "key" | "value" | "target" | "format" | "status" | "expected" | "streak">;

/** The week's value so far: "80", "7,500", "--". */
export const planValueText = (it: Pick<Row, "value" | "format">) => (it.value === null ? MISSING : formatValue(it.format, it.value));

/** "of 150 min", "of 2 sessions", "of 8,000", "of 80%", "of 5 nights". */
export function planTargetText(it: Pick<Row, "key" | "target" | "format">): string {
  const t = formatValue(it.format, it.target);
  switch (it.key) {
    case "zone13":
    case "zone45":
      return tr("goals.Goals.ofMin", { v0: t, v1: NBSP });
    case "strength":
      return tr("goals.Goals.of", { v0: plural(it.target, "session") });
    case "consistency":
      return tr("goals.weeklyPlanView.of", { v0: t });
    case "sleepNeed":
      return tr("goals.Goals.of", { v0: plural(it.target, "night") });
    default:
      return tr("goals.Goals.of", { v0: t });
  }
}

/** What is left to the target, in the target's words: "70 min", "1 session", "500 steps a day", "2 points", "3 nights". */
function leftText(it: Row, left: number): string {
  switch (it.key) {
    case "zone13":
    case "zone45":
      return `${Math.ceil(left)}${NBSP}min`;
    case "strength":
      return plural(Math.ceil(left), "session");
    case "steps":
      return tr("goals.weeklyPlanView.aDay", { v0: plural(Math.ceil(left), "step") });
    case "consistency":
      return plural(Math.ceil(left), "point");
    case "sleepNeed":
      return plural(Math.ceil(left), "night");
  }
}

/** The line under a target: how it stands, what is left, and its streak of weeks. */
export function planCaption(it: Row): string {
  const n = it.streak.current;
  const left = it.value === null ? it.target : Math.max(0, it.target - it.value);
  switch (it.status) {
    case "done":
      return n > 1 ? tr("goals.weeklyPlanView.doneWeekStreak", { v0: n }) : tr("goals.weeklyPlanView.doneThisWeek");
    case "on_pace":
      return n > 0 ? tr("goals.weeklyPlanView.toGoWeekStreakOnTheLine", { v0: leftText(it, left), v1: n }) : tr("goals.weeklyPlanView.onPaceToGo", { v0: leftText(it, left) });
    case "behind":
      // Totals: how far under an even pace; averages and counts: how far from the target.
      if ((it.key === "zone13" || it.key === "zone45") && it.expected !== null) return tr("goals.weeklyPlanView.behindPace", { v0: leftText(it, it.expected - (it.value ?? 0)) });
      return it.key === "steps" || it.key === "consistency" ? tr("goals.weeklyPlanView.short", { v0: leftText(it, left) }) : tr("goals.weeklyPlanView.toGo", { v0: leftText(it, left) });
    case "missed":
      return it.streak.longest > 1 ? tr("goals.weeklyPlanView.missedBestRunWeeks", { v0: it.streak.longest }) : tr("goals.weeklyPlanView.missedThisWeek");
    case "no_data":
      return tr("goals.weeklyPlanView.noDataYet");
  }
}

/** Pulse Age's years for the habit: "−0.6 yr", "+1.2 yr"; null without a Pulse Age. Negative is younger (good). */
export function ageText(years: number | null): string | null {
  if (years === null) return null;
  const r = Math.round(years * 10) / 10;
  if (r === 0) return `${FORMATS.decimal1(0)}${NBSP}${displayUnit("yr")}`;
  return `${r > 0 ? "+" : "−"}${FORMATS.decimal1(Math.abs(r))}${NBSP}${language() === "fr" && Math.abs(r) >= 2 ? displayUnit("years") : displayUnit("yr")}`;
}

/** Language-aware entry; validation and stored target numbers remain the engine's. */
export function parseWeeklyTarget(key: PlanKey, text: string) {
  const normalized = text.replace(/[\s\u00a0\u202f]/g, "");
  const result = parsePlanTarget(key, language() === "fr" ? normalized.replace(",", ".") : normalized);
  if (!result.error || language() !== "fr") return result;
  const { min, max } = PLAN_LIMITS[key];
  const error = result.error === "Enter a number" ? tr("nutrition.targets.enterANumber")
    : result.error === "Whole numbers only" ? tr("nutrition.targets.wholeNumbersOnly")
    : tr("state.goals.betweenAnd", { v0: FORMATS.grouped(min), v1: FORMATS.grouped(max) });
  return { ...result, error };
}
