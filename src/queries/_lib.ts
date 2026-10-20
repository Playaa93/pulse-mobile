import type { FormatKey } from "@/lib/format";
import { tr } from "@/i18n";
// The few helpers the queries need from Pulse's src/lib/{format,bands,url,extraMetrics,dashboard}.ts and
// src/lib/log.ts, copied here so src/queries depends on nothing outside src/core, src/lib/time and src/lib/reasons
// (the UI's own port of those libs is written separately). Keep each function identical to the web's.
import { acwrBand, type AcwrBand } from "@/core/scoring/readiness";

// Share the display formatters so UI and query-generated text use the same locale.
export { FORMATS, hmm, formatDay, DAY, dayLabel, clock, type FormatKey } from "@/lib/format";

// ── url.ts ──────────────────────────────────────────────────────────────────

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Monday and Sunday of the ISO week containing `day`. */
export function weekOf(day: string): [string, string] {
  const t = Date.parse(`${day}T00:00:00Z`);
  const back = (new Date(t).getUTCDay() + 6) % 7; // Monday 0 … Sunday 6
  const mon = t - back * 86_400_000;
  return [iso(mon), iso(mon + 6 * 86_400_000)];
}

export const RANGES = ["w", "m", "6m", "1y"] as const;
export type TrendRange = (typeof RANGES)[number];
export const RANGE_DAYS: Record<TrendRange, number> = { w: 7, m: 30, "6m": 182, "1y": 365 };

/** A metric's own detail screen (Steps, Distance, Weight, …): `/metric/steps`. The mobile router maps it to a route. */
export const metricHref = (key: string) => `/metric/${key}`;

// ── bands.ts ────────────────────────────────────────────────────────────────

export type RecoveryBand = "green" | "yellow" | "red";

/** ≥ 67 green, 34-66 yellow, below 34 red. */
export function recoveryBand(value: number): RecoveryBand {
  if (value >= 67) return "green";
  if (value >= 34) return "yellow";
  return "red";
}

export type StressLevel = "low" | "medium" | "high";
export function stressLevel(value: number): StressLevel {
  if (value >= 60) return "high";
  if (value >= 30) return "medium";
  return "low";
}

/** Which way is good. `neutral` still shows the arrow direction, never a good/bad tone. */
export type GoodDirection = "up" | "down" | "neutral" | "toward_zero";

export type ChipTone = "optimal" | "warning" | "alert" | "neutral";

const ACWR_TONE: Record<AcwrBand, ChipTone> = { LOAD_RAMPING_DOWN: "neutral", LOAD_SWEET_SPOT: "optimal", LOAD_BUILDING_FAST: "warning", LOAD_SPIKING: "alert" };

/** Training load (ACWR) chip tone, on Garmin's 2026 bands: below 0.8 neutral, [0.8, 1.5) optimal, [1.5, 2.0) warning, then alert. */
export const acwrTone = (acwr: number): ChipTone => ACWR_TONE[acwrBand(acwr)];

// ── extraMetrics.ts ─────────────────────────────────────────────────────────

export type ExtraMetric = {
  key: string;
  label: string;
  /** Shown after the value; minutes use h:mm via `format` instead. */
  unit?: string;
  format: FormatKey;
  direction: GoodDirection;
  /** My Dashboard's editor group. Every extra opens its own detail screen, `/metric/<key>`. */
  group: "activity" | "nutrition" | "vitals";
  /** Accrues through the day: today is a gap in trends, not a low bar. */
  partialToday?: boolean;
  /**
   * mobile: where the number comes from when it is not the source's own roll-up. Health Connect carries no activity
   * minutes, Active Zone Minutes or daily average heart rate, so the sync derives them from the band's heart rate and
   * steps (src/health/derive.ts), approximating Fitbit's rules; the metric screen shows this note as the source.
   */
  note?: string;
};

const derivedNote = () =>
  tr("queries.fromAGoogleAccountFitbitSOwn");

export const EXTRA_METRICS = [
  { key: "distance", get label() { return tr("health.dataCheckSummary.distance"); }, unit: "km", format: "decimal2", direction: "up", group: "activity", partialToday: true },
  { key: "floors", get label() { return tr("lib.extraMetrics.floors"); }, format: "grouped", direction: "up", group: "activity", partialToday: true },
  { key: "elevation", get label() { return tr("lib.extraMetrics.elevationGain"); }, unit: "m", format: "int", direction: "up", group: "activity", partialToday: true },
  { key: "active_minutes", get label() { return tr("lib.extraMetrics.activeMinutes"); }, format: "duration", direction: "up", group: "activity", partialToday: true, get note() { return derivedNote(); } },
  { key: "light_minutes", get label() { return tr("lib.extraMetrics.lightActivity"); }, format: "duration", direction: "up", group: "activity", partialToday: true, get note() { return derivedNote(); } },
  { key: "azm", get label() { return tr("lib.extraMetrics.activeZoneMinutes"); }, format: "duration", direction: "up", group: "activity", partialToday: true, get note() { return derivedNote(); } },
  { key: "active_calories", get label() { return tr("lib.extraMetrics.activeCalories"); }, unit: "kcal", format: "grouped", direction: "neutral", group: "activity", partialToday: true },
  { key: "sedentary_minutes", get label() { return tr("lib.extraMetrics.sedentaryTime"); }, format: "duration", direction: "down", group: "activity", partialToday: true, get note() { return derivedNote(); } },
  // Today's is the samples so far (in the morning mostly the night's), not the day's average: "so far", like Stress's.
  { key: "avg_hr", get label() { return tr("lib.extraMetrics.averageHeartRate"); }, unit: "bpm", format: "int", direction: "neutral", group: "activity", partialToday: true, get note() { return derivedNote(); } },
  { key: "water", get label() { return tr("lib.extraMetrics.water"); }, unit: "ml", format: "grouped", direction: "up", group: "nutrition", partialToday: true },
  { key: "calories_in", get label() { return tr("lib.extraMetrics.caloriesEaten"); }, unit: "kcal", format: "grouped", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "protein", get label() { return tr("lib.extraMetrics.protein"); }, unit: "g", format: "int", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "carbs", get label() { return tr("lib.extraMetrics.carbohydrates"); }, unit: "g", format: "int", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "fat", get label() { return tr("lib.extraMetrics.fat"); }, unit: "g", format: "int", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "glucose", get label() { return tr("lib.extraMetrics.bloodGlucose"); }, unit: "mg/dL", format: "int", direction: "neutral", group: "vitals" },
  { key: "core_temp", get label() { return tr("lib.extraMetrics.coreTemperature"); }, unit: "°C", format: "decimal1", direction: "neutral", group: "vitals" },
  { key: "swim_strokes", get label() { return tr("lib.extraMetrics.swimStrokes"); }, format: "grouped", direction: "up", group: "activity", partialToday: true },
] as const satisfies readonly ExtraMetric[];

export type ExtraKey = (typeof EXTRA_METRICS)[number]["key"];
export const EXTRA_KEYS = EXTRA_METRICS.map((m) => m.key) as ExtraKey[];
export const extraMetric = (key: ExtraKey): ExtraMetric => EXTRA_METRICS.find((m) => m.key === key)!;

// ── dashboard.ts ────────────────────────────────────────────────────────────

export const DASHBOARD_GROUPS = [
  { key: "recovery", get label() { return tr("lib.dashboard.recoverySleep"); } },
  { key: "activity", get label() { return tr("lib.dashboard.activity"); } },
  { key: "body", get label() { return tr("lib.dashboard.body"); } },
  { key: "nutrition", get label() { return tr("lib.behaviors.nutrition"); } },
  { key: "vitals", get label() { return tr("lib.dashboard.vitals"); } },
] as const;
export type DashboardGroup = (typeof DASHBOARD_GROUPS)[number]["key"];

/** The eight v1 rows; their units and reasons live in the Home query (`keyStats`). */
const CORE = [
  { key: "hrv", get label() { return tr("lib.dashboard.heartRateVariability"); }, group: "recovery" },
  { key: "rhr", get label() { return tr("lib.dashboard.restingHeartRate"); }, group: "recovery" },
  { key: "resp", get label() { return tr("lib.dashboard.respiratoryRate"); }, group: "vitals" },
  { key: "sleep", get label() { return tr("lib.dashboard.sleepPerformance"); }, group: "recovery" },
  { key: "calories", get label() { return tr("health.dataCheckSummary.calories"); }, group: "activity" },
  { key: "steps", get label() { return tr("health.dataCheckSummary.steps"); }, group: "activity" },
  { key: "spo2", get label() { return tr("lib.dashboard.bloodOxygen"); }, group: "vitals" },
  { key: "skin", get label() { return tr("lib.dashboard.skinTemperature"); }, group: "vitals" },
] as const;

/** Weight and body-fat readings; each opens its detail screen. */
export const BODY_METRICS = [
  { key: "weight", get label() { return tr("lib.dashboard.weight"); }, unit: "kg", format: "decimal1", direction: "neutral", href: metricHref("weight") },
  { key: "body_fat", get label() { return tr("lib.dashboard.bodyFat"); }, unit: "%", format: "decimal1", direction: "neutral", href: metricHref("body_fat") },
] as const satisfies readonly { key: string; label: string; unit: string; format: FormatKey; direction: GoodDirection; href: string }[];
export type BodyKey = (typeof BODY_METRICS)[number]["key"];

export type DashboardKey = (typeof CORE)[number]["key"] | BodyKey | ExtraKey;

const ALL: { key: DashboardKey; label: string; group: DashboardGroup }[] = [
  ...CORE,
  ...BODY_METRICS.map((m) => ({ key: m.key, get label() { return m.label; }, group: "body" as const })),
  ...EXTRA_METRICS.map((m) => ({ key: m.key, get label() { return m.label; }, group: m.group })),
];

/** Every metric, in editor order: by group, then catalogue order within it. */
export const DASHBOARD_METRICS = DASHBOARD_GROUPS.flatMap((g) => ALL.filter((m) => m.group === g.key));

export const DASHBOARD_LABEL = Object.defineProperties({}, Object.fromEntries(ALL.map((m) => [m.key, { enumerable: true, get: () => m.label }]))) as Record<DashboardKey, string>;

export const isDashboardKey = (k: string): k is DashboardKey => Object.prototype.hasOwnProperty.call(DASHBOARD_LABEL, k);

/** The default list: the v1 rows in their v1 order. */
export const DASHBOARD_DEFAULT: DashboardKey[] = CORE.map((m) => m.key);

/** The default for an account that has never synced heart rate (phone only, no band): what its phone counts. */
export const PHONE_DEFAULT: DashboardKey[] = ["steps", "distance", "calories", "active_minutes", "active_calories", "floors"];

/** Phone Home's lead card (spec §11 CD2): what a phone records without a band. */
export const PHONE_STATS: DashboardKey[] = ["steps", "distance", "calories", "active_minutes"];

// ── log.ts (types only: the metric screen's "entries" section shape) ────────

export const LOG_TYPES = ["hydration-log", "nutrition-log", "weight", "body-fat", "oxygen-saturation", "moods", "symptoms", "menstrual-period", "ovulation-test"] as const;
export type LogType = (typeof LOG_TYPES)[number];

/**
 * One entry logged from Pulse, as the metric screen lists it. mobile: `source` says whether it was logged in Pulse or
 * read from Health Connect (logged in Fitbit); the latter are shown read-only.
 */
export type LoggedEntry = { id: string; type: LogType; ts: number; day: string; title: string; detail: string; atGoogle: boolean; source: "pulse" | "health_connect" };
