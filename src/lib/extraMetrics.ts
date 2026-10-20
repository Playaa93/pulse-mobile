import { tr } from "@/i18n";
// Google Health daily roll-ups Pulse shows as they come, without scoring them (docs/research/google-health-coverage.md).
// One entry per metric: My Dashboard, Trends and the daily export all read this list, so adding a metric here
// (and its value path in src/server/sources/google/map.ts) is all it takes to show it.
import type { GoodDirection } from "./bands"
import type { FormatKey } from "./format"

export type ExtraMetric = {
  key: string
  label: string
  /** Shown after the value; minutes use h:mm via `format` instead. */
  unit?: string
  format: FormatKey
  direction: GoodDirection
  /** My Dashboard's editor group. Every extra opens its own detail screen, `/metric/<key>`. */
  group: "activity" | "nutrition" | "vitals"
  /** Accrues through the day: today is a gap in trends, not a low bar. */
  partialToday?: boolean
}

export const EXTRA_METRICS = [
  { key: "distance", get label() { return tr("health.dataCheckSummary.distance"); }, unit: "km", format: "decimal2", direction: "up", group: "activity", partialToday: true },
  { key: "floors", get label() { return tr("lib.extraMetrics.floors"); }, format: "grouped", direction: "up", group: "activity", partialToday: true },
  { key: "elevation", get label() { return tr("lib.extraMetrics.elevationGain"); }, unit: "m", format: "int", direction: "up", group: "activity", partialToday: true },
  { key: "active_minutes", get label() { return tr("lib.extraMetrics.activeMinutes"); }, format: "duration", direction: "up", group: "activity", partialToday: true },
  { key: "light_minutes", get label() { return tr("lib.extraMetrics.lightActivity"); }, format: "duration", direction: "up", group: "activity", partialToday: true },
  { key: "azm", get label() { return tr("lib.extraMetrics.activeZoneMinutes"); }, format: "duration", direction: "up", group: "activity", partialToday: true },
  { key: "active_calories", get label() { return tr("lib.extraMetrics.activeCalories"); }, unit: "kcal", format: "grouped", direction: "neutral", group: "activity", partialToday: true },
  { key: "sedentary_minutes", get label() { return tr("lib.extraMetrics.sedentaryTime"); }, format: "duration", direction: "down", group: "activity", partialToday: true },
  { key: "avg_hr", get label() { return tr("lib.extraMetrics.averageHeartRate"); }, unit: "bpm", format: "int", direction: "neutral", group: "activity" },
  { key: "water", get label() { return tr("lib.extraMetrics.water"); }, unit: "ml", format: "grouped", direction: "up", group: "nutrition", partialToday: true },
  { key: "calories_in", get label() { return tr("lib.extraMetrics.caloriesEaten"); }, unit: "kcal", format: "grouped", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "protein", get label() { return tr("lib.extraMetrics.protein"); }, unit: "g", format: "int", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "carbs", get label() { return tr("lib.extraMetrics.carbohydrates"); }, unit: "g", format: "int", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "fat", get label() { return tr("lib.extraMetrics.fat"); }, unit: "g", format: "int", direction: "neutral", group: "nutrition", partialToday: true },
  { key: "glucose", get label() { return tr("lib.extraMetrics.bloodGlucose"); }, unit: "mg/dL", format: "int", direction: "neutral", group: "vitals" },
  { key: "core_temp", get label() { return tr("lib.extraMetrics.coreTemperature"); }, unit: "°C", format: "decimal1", direction: "neutral", group: "vitals" },
  { key: "swim_strokes", get label() { return tr("lib.extraMetrics.swimStrokes"); }, format: "grouped", direction: "up", group: "activity", partialToday: true },
] as const satisfies readonly ExtraMetric[]

export type ExtraKey = (typeof EXTRA_METRICS)[number]["key"]

export const EXTRA_KEYS = EXTRA_METRICS.map((m) => m.key) as ExtraKey[]

export const extraMetric = (key: ExtraKey): ExtraMetric => EXTRA_METRICS.find((m) => m.key === key)!
