import { tr } from "@/i18n";
import { Activity, HeartPulse, Hourglass, RefreshCw, Watch, type LucideIcon } from "lucide-react";

// The single source of reason copy (spec §5.14) and the metric shape every view model uses (§4.8).

export const REASON_CODES = [
  "calibrating",
  "no_hrv_last_night",
  "awaiting_sleep_sync",
  "insufficient_hr_data",
  "band_not_worn",
  "no_data",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

export type MetricTag = "stale_baseline" | "updated";

/** One nullable metric in a view model. `undefined` (the whole metric) means still loading. */
export type Metric<T> = {
  value: T | null;
  reason: ReasonCode | null;
  provisional: boolean;
  tags?: MetricTag[];
  /** For `calibrating`. */
  nightsLeft?: number;
};

type ReasonEntry = { icon: LucideIcon | null; short: string; long: (nightsLeft?: number) => string };

export const REASONS: Record<ReasonCode, ReasonEntry> = {
  calibrating: {
    icon: Hourglass,
    get short() { return tr("lib.reasons.calibrating"); },
    long: (n) =>
      n === undefined ? tr("lib.reasons.calibrating") : tr("reasons.nightsLeft", { count: n }),
  },
  no_hrv_last_night: {
    icon: HeartPulse,
    get short() { return tr("lib.reasons.noHrvLastNight"); },
    long: () => tr("lib.reasons.noHrvInLastNightSSleep"),
  },
  awaiting_sleep_sync: {
    icon: RefreshCw,
    get short() { return tr("lib.reasons.waitingForSleep"); },
    long: () => tr("lib.reasons.waitingForLastNightSSleepTo"),
  },
  insufficient_hr_data: {
    icon: Activity,
    get short() { return tr("lib.reasons.notEnoughData"); },
    long: () => tr("lib.reasons.notEnoughHeartRateData"),
  },
  band_not_worn: { icon: Watch, get short() { return tr("lib.reasons.notWorn"); }, long: () => tr("lib.reasons.noDataBandNotWorn") },
  no_data: { icon: null, short: "--", long: () => tr("lib.reasons.noData") },
};

/** Any unknown or missing code falls back to `no_data`. */
export function normalizeReason(code: string | null | undefined): ReasonCode {
  return (REASON_CODES as readonly string[]).includes(code ?? "") ? (code as ReasonCode) : "no_data";
}

export function reasonCopy(code: string | null | undefined, nightsLeft?: number) {
  const key = normalizeReason(code);
  const r = REASONS[key];
  return { code: key, icon: r.icon, short: r.short, long: r.long(nightsLeft) };
}

/** Tags shown next to a number, with the explanation used in tooltips and info sheets. */
export const TAG_COPY = {
  provisional: {
    get label() { return tr("lib.reasons.provisional"); },
    get explain() { return tr("lib.reasons.basedOnAShortHistoryWhileYour"); },
  },
  stale_baseline: {
    get label() { return tr("lib.reasons.baselineStale"); },
    get explain() { return tr("lib.reasons.yourBaselineHas14NightsOrMore"); },
  },
  updated: { get label() { return tr("lib.reasons.updated"); }, get explain() { return tr("lib.reasons.updatedAfterALateSyncAddedData"); } },
} as const;
