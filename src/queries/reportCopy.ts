// Translated report prose is supplied to the pure assessment engine as explicit input.
import type { AssessKey, AssessmentCopy } from "@/core/algorithms/reports";
import { minutesText } from "@/core/algorithms/reports";
import { tr } from "@/i18n";
import { FORMATS, hmm } from "@/lib/format";

export const reportCopy: AssessmentCopy = {
  decline(key, delta, target) {
    const count = Math.round(delta);
    switch (key) {
      case "recovery": return tr("report.decline.recovery", { count });
      case "sleepPerf": return tr("report.decline.sleep", { count });
      case "hrv": return tr("report.decline.hrv", { count });
      case "rhr": return tr("report.decline.rhr", { count });
      case "slept": return tr("report.decline.slept", { duration: minutesText(delta), earlier: minutesText(Math.ceil(delta / 5) * 5) });
      case "consistency": return tr("report.decline.consistency", { count });
      case "zone13": return tr("report.decline.moderate", { count });
      case "zone45": return tr("report.decline.vigorous", { count });
      case "strength": return tr("report.decline.strength", { count: target ?? 2 });
      case "steps": return tr("report.decline.steps", { steps: FORMATS.grouped(delta) });
      case "strain": return "";
    }
  },
  gap(key, value, sleep, targets) {
    switch (key) {
      case "slept": return tr("report.gap.sleep", { slept: hmm(sleep.sleptMin!), need: hmm(sleep.needMin!), earlier: minutesText(Math.ceil((sleep.needMin! - sleep.sleptMin!) / 5) * 5) });
      case "consistency": return tr("report.gap.consistency", { value: FORMATS.int(value) });
      case "zone13": return tr("report.gap.moderate", { value: FORMATS.int(value), target: targets.zone13, count: Math.max(1, Math.ceil((targets.zone13 - value) / 30)) });
      case "zone45": return tr("report.gap.vigorous", { value: FORMATS.int(value), target: targets.zone45 });
      case "strength": return tr("report.gap.strength", { value: FORMATS.decimal1(value), target: targets.strength });
      case "steps": return tr("report.gap.steps", { value: FORMATS.grouped(value), target: FORMATS.grouped(targets.steps) });
      default: return "";
    }
  },
  rise(stat, kind) {
    const delta = Math.abs(stat.delta ?? 0);
    const names: Record<AssessKey, string> = {
      recovery: tr("ui.shells.HomeHeader.recovery"), strain: tr("ui.shells.HomeHeader.strain"),
      sleepPerf: tr("queries.trendView.sleepPerformance"), hrv: tr("breathe.BreatheScreen.hrv_49a6fe"),
      rhr: tr("lib.dashboard.restingHeartRate"), slept: tr("ui.shells.HomeHeader.sleep"),
      consistency: tr("lib.dashboard.sleepConsistency"), zone13: tr("queries.health.moderateActivity"),
      zone45: tr("queries.reports.vigorousActivity"), strength: tr("queries.reports.strengthSessions"),
      steps: tr("health.dataCheckSummary.steps"),
    };
    const amount: Record<AssessKey, string> = {
      recovery: `${FORMATS.int(delta)} pts`, strain: `${FORMATS.int(delta)} pts`, sleepPerf: `${FORMATS.int(delta)} pts`,
      hrv: `${FORMATS.int(delta)} ms`, rhr: `${FORMATS.int(delta)} bpm`, slept: minutesText(delta),
      consistency: `${FORMATS.int(delta)} pts`, zone13: tr("report.minutesWeekly", { count: Math.round(delta) }),
      zone45: tr("report.minutesWeekly", { count: Math.round(delta) }), strength: tr("report.sessionsWeekly", { value: FORMATS.decimal1(delta) }),
      steps: tr("report.stepsDaily", { value: FORMATS.grouped(delta) }),
    };
    return tr("report.rise", { name: names[stat.key], direction: tr((stat.delta ?? 0) > 0 ? "report.increase" : "report.decrease"), amount: amount[stat.key], period: tr(kind === "week" ? "report.previousWeek" : "report.previousMonth") });
  },
  early: (days, kind) => tr("report.early", { count: days, period: tr(kind === "week" ? "report.thisWeek" : "report.thisMonth") }),
  sparsePrevious: (days, kind) => tr("report.sparsePrevious", { count: days, period: tr(kind === "week" ? "report.previousWeek" : "report.previousMonth") }),
  steady: (kind) => tr("report.steady", { period: tr(kind === "week" ? "report.previousWeek" : "report.previousMonth") }),
};
