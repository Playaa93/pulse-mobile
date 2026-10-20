import { tr } from "@/i18n";
import type { ReadType } from "@/health/connect";

/** Health Connect's record types as Settings lists them. */
export const HEALTH_RECORD_LABEL: Record<ReadType, string> = {
  get SleepSession() { return tr("ui.shells.HomeHeader.sleep"); },
  get HeartRate() { return tr("queries.chart.heartRate"); },
  get RestingHeartRate() { return tr("lib.dashboard.restingHeartRate"); },
  get HeartRateVariabilityRmssd() { return tr("lib.dashboard.heartRateVariability"); },
  get RespiratoryRate() { return tr("lib.dashboard.respiratoryRate"); },
  get OxygenSaturation() { return tr("lib.dashboard.bloodOxygen"); },
  get SkinTemperature() { return tr("lib.dashboard.skinTemperature"); },
  get Steps() { return tr("health.dataCheckSummary.steps"); },
  get Distance() { return tr("health.dataCheckSummary.distance"); },
  get ExerciseSession() { return tr("settings.DataSource.exercise"); },
  get TotalCaloriesBurned() { return tr("health.dataCheckSummary.calories"); },
  get ActiveCaloriesBurned() { return tr("lib.extraMetrics.activeCalories"); },
  get Vo2Max() { return tr("health.dataCheckSummary.vo2Max"); },
  get Weight() { return tr("lib.dashboard.weight"); },
  get BodyFat() { return tr("lib.dashboard.bodyFat"); },
  get FloorsClimbed() { return tr("lib.extraMetrics.floors"); },
  get ElevationGained() { return tr("lib.extraMetrics.elevationGain"); },
  get Hydration() { return tr("lib.extraMetrics.water"); },
  get Nutrition() { return tr("journal.WeekCard.food"); },
  get BloodGlucose() { return tr("lib.extraMetrics.bloodGlucose"); },
  get BodyTemperature() { return tr("settings.DataSource.bodyTemperature"); },
  get MenstruationPeriod() { return tr("settings.DataSource.periods"); },
  get MenstruationFlow() { return tr("settings.DataSource.periodFlow"); },
  get IntermenstrualBleeding() { return tr("queries.log.spotting"); },
  get OvulationTest() { return tr("settings.DataSource.ovulationTests"); },
};
