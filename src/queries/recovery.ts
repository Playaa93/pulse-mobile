import { tr } from "@/i18n";
// Recovery `/recovery` (spec §7.2). Ported from Pulse's src/server/queries/recovery.ts.
import type { ChargeDriver } from "@/core/scoring/drivers";
import { addDays } from "@/lib/time";
import {
  type DayRow,
  finite,
  fromReason,
  loadDays,
  none,
  priorStats,
  ok,
  type QueryCtx,
  recoveryBand,
  recoveryMetric,
  todayOf,
  vitalReason,
  trendPoints,
} from "./common";
import type { Contributor, DriverItem, Metric, RecoveryVM } from "./types";

const SUBJECT: Record<ChargeDriver["label"], string> = {
  get HEART_RATE_VARIABILITY() { return tr("breathe.BreatheScreen.hrv_49a6fe"); },
  get RESTING_HEART_RATE() { return tr("lib.dashboard.restingHeartRate"); },
  get RESPIRATORY_RATE() { return tr("lib.dashboard.respiratoryRate"); },
  get SLEEP_QUALITY() { return tr("ui.shells.HomeHeader.sleep"); },
  get SKIN_TEMPERATURE() { return tr("lib.dashboard.skinTemperature"); },
};

/** "HRV above baseline", "Strong night of sleep", … from noop's verdicts. */
export function driverLabel(d: ChargeDriver): string {
  const s = SUBJECT[d.label];
  const v = d.verdict;
  if (v === "STRONG_NIGHT_SUPPORTING") return tr("queries.recovery.strongNightOfSleep");
  if (v === "BELOW_GOOD_NIGHT_LIMITING") return tr("queries.recovery.sleepBelowAGoodNight");
  if (v === "TYPICAL_NIGHT") return tr("queries.recovery.typicalNightOfSleep");
  if (v === "WARMER_THAN_BASELINE_LIMITING") return tr("queries.recovery.skinTemperatureWarmerThanUsual");
  if (v === "COOLER_THAN_BASELINE_LIMITING") return tr("queries.recovery.skinTemperatureCoolerThanUsual");
  if (v === "NEAR_BASELINE" || v === "AT_BASELINE") return tr("queries.recovery.atBaseline", { v0: s });
  if (v === "HRV_SATURATION_LIMITING") return tr("queries.recovery.hrvBelowBaseline");
  if (v.startsWith("SLIGHTLY_ABOVE")) return tr("queries.recovery.slightlyAboveBaseline", { v0: s });
  if (v.startsWith("SLIGHTLY_BELOW")) return tr("queries.recovery.slightlyBelowBaseline", { v0: s });
  if (v.startsWith("ABOVE")) return tr("queries.recovery.aboveBaseline", { v0: s });
  return tr("queries.recovery.belowBaseline", { v0: s });
}

const KEY_OF: Record<ChargeDriver["label"], Contributor["key"]> = {
  HEART_RATE_VARIABILITY: "hrv",
  RESTING_HEART_RATE: "rhr",
  RESPIRATORY_RATE: "resp",
  SLEEP_QUALITY: "sleep",
  SKIN_TEMPERATURE: "skinTemp",
};

export function driverItems(drivers: ChargeDriver[]): DriverItem[] {
  return drivers.map((d) => ({
    key: KEY_OF[d.label],
    label: driverLabel(d),
    delta: d.deltaPoints,
    effect: d.deltaPoints > 0 ? "positive" : d.deltaPoints < 0 ? "negative" : "none",
  }));
}

/** Recovery `/recovery` for `day` (spec §7.2). */
export async function getRecovery(day: string, ctx: QueryCtx): Promise<RecoveryVM> {
  const today = todayOf(ctx);
  const isToday = day === today;
  const rows = await loadDays(ctx, addDays(day, -181), day);
  const row = rows.get(day);
  const recovery = recoveryMetric(row, isToday);
  const r = row?.recovery ?? null;

  const drivers: Metric<DriverItem[]> = r?.value != null ? ok(driverItems(r.drivers), r.provisional) : recovery.reason ? none(recovery.reason, recovery.nightsLeft) : none("no_data");

  let forecast: RecoveryVM["forecast"];
  if (r?.value == null) forecast = fromReason(recovery.reason, isToday, recovery.nightsLeft);
  else if (!r.forecast) forecast = none("calibrating", Math.max(1, r.forecastNightsLeft));
  else forecast = ok({ value: r.forecast.charge, low: r.forecast.low, high: r.forecast.high, band: recoveryBand(r.forecast.charge) });

  return {
    day,
    isToday,
    recovery,
    band: recovery.value != null ? recoveryBand(recovery.value) : null,
    contributors: contributors(row, isToday, rows),
    insight: r?.value != null ? insightOf(r.drivers) : null,
    trend: {
      points: trendPoints(rows, day, (r) => r.recovery?.value, 182, (r) => !!r.recovery?.provisional),
    },
    drivers,
    forecast,
  };
}

/**
 * `rows` (with the 60 days before `row`): the Sleep row's usual range is your own Sleep Performance over them, the
 * "typical night" the Pulse engine's Recovery drivers compare with.
 */
export function contributors(row: DayRow | undefined, isToday: boolean, rows?: Map<string, DayRow>): Contributor[] {
  const r = row?.recovery;
  const pts = (key: Contributor["key"]) => r?.drivers.find((d) => KEY_OF[d.label] === key)?.deltaPoints ?? null;
  const base = (b: { mean: number; sd: number } | null | undefined, ok = true) => (b && ok ? { mean: b.mean, sd: b.sd } : null);
  const usable = (b: { status: string } | null | undefined) => !!b && (b.status === "provisional" || b.status === "trusted");
  const metric = (key: Contributor["key"], v: number | null | undefined, missing: Metric<number>["reason"]): Metric<number> => {
    if (!finite(v)) return none(missing ?? "no_data");
    return ok(v, false, r?.stale.includes(key) ? ["stale_baseline"] : []);
  };
  // An input the score could not use reads "Not measured: left out of today's score" (no_data).
  const missing = r?.value != null ? "no_data" : vitalReason(row, isToday);
  const inputs = r?.inputs;
  const b = r?.baselines;
  return [
    {
      key: "hrv",
      label: tr("lib.dashboard.heartRateVariability"),
      unit: "ms",
      metric: metric("hrv", inputs?.hrv ?? row?.metrics?.hrvMs, r?.value != null ? "no_data" : vitalReason(row, isToday, true)),
      baseline: base(b?.hrv, usable(b?.hrv)),
      points: pts("hrv"),
      direction: "up",
    },
    {
      key: "rhr",
      label: tr("lib.dashboard.restingHeartRate"),
      unit: "bpm",
      metric: metric("rhr", inputs?.rhr ?? row?.sessionRhr, missing),
      baseline: base(b?.rhr, usable(b?.rhr)),
      points: pts("rhr"),
      direction: "down",
    },
    {
      key: "resp",
      label: tr("lib.dashboard.respiratoryRate"),
      unit: "rpm",
      metric: metric("resp", inputs?.resp ?? row?.metrics?.respBpm, missing),
      baseline: base(b?.resp, usable(b?.resp)),
      points: pts("resp"),
      direction: "neutral",
    },
    {
      key: "sleep",
      label: tr("lib.dashboard.sleepPerformance"),
      unit: "%",
      metric: metric("sleep", inputs?.sleepPerf != null ? inputs.sleepPerf * 100 : null, missing),
      baseline: sleepBase(row, rows),
      points: pts("sleep"),
      direction: "up",
    },
    {
      key: "skinTemp",
      label: tr("lib.dashboard.skinTemperature"),
      unit: "°C",
      metric: metric("skinTemp", inputs?.skinTempDev, row?.metrics?.nightlyTempC != null ? "calibrating" : missing),
      // The source's 30-night SD when it gives one, else Pulse's own baseline spread.
      baseline: row?.metrics?.tempSdC ? { mean: 0, sd: row.metrics.tempSdC } : b?.skinTemp && usable(b.skinTemp) ? { mean: 0, sd: b.skinTemp.sd } : null,
      points: pts("skinTemp"),
      direction: "toward_zero",
    },
  ];
}

/** One templated coach line from the biggest movers (spec §5.15 copy rules). */
export function insightOf(drivers: ChargeDriver[]): string {
  const up = drivers.filter((d) => d.deltaPoints > 0).map((d) => d.label);
  const down = drivers.filter((d) => d.deltaPoints < 0).map((d) => d.label);
  const phrase = (l: ChargeDriver["label"], good: boolean) =>
    ({
      HEART_RATE_VARIABILITY: good ? tr("queries.recovery.yourHrvIsAboveYourBaseline") : tr("queries.recovery.yourHrvIsBelowYourBaseline"),
      RESTING_HEART_RATE: good ? tr("queries.recovery.yourRestingHeartRateIsLowerThan") : tr("queries.recovery.yourRestingHeartRateIsHigherThan"),
      RESPIRATORY_RATE: good ? tr("queries.recovery.yourBreathingRateIsSteady") : tr("queries.recovery.yourBreathingRateIsUp"),
      SLEEP_QUALITY: good ? tr("queries.recovery.youSleptWell") : tr("queries.recovery.yourSleepFellShort"),
      SKIN_TEMPERATURE: good ? tr("queries.recovery.yourSkinTemperatureIsNormal") : tr("queries.recovery.yourSkinTemperatureMovedFromYourNormal"),
    })[l];
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  if (up.length && !down.length) return tr("queries.recovery.whichLiftedRecoveryToday", { v0: cap(phrase(up[0], true)) });
  if (down.length && !up.length) return tr("queries.recovery.whichHeldRecoveryBackToday", { v0: cap(phrase(down[0], false)) });
  if (up.length && down.length) return tr("queries.recovery.butTogetherTheyShapedTodaySRecovery", { v0: cap(phrase(up[0], true)), v1: phrase(down[0], false) });
  return tr("queries.recovery.yourSignalsSitCloseToYourBaseline");
}

/** Mean and SD of Sleep Performance over the 60 days before `row`; null without two nights. */
function sleepBase(row: DayRow | undefined, rows: Map<string, DayRow> | undefined): { mean: number; sd: number } | null {
  if (!row || !rows) return null;
  const s = priorStats(rows, row.day, (r) => r.sleep?.performance, 60);
  return s.mean != null && s.sd != null && rows.size > 1 ? { mean: s.mean, sd: s.sd } : null;
}
