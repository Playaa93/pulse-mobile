import { tr, type TranslationKey } from "@/i18n";
import type { InfoContent } from "./InfoButton";

// Keep the original title as a stable lookup for existing callers. Translated card
// titles resolve to the same explanation when the language changes.
export const CARD_INFO: readonly { sourceTitle: string; title: TranslationKey; body: TranslationKey }[] = [
  {
    "sourceTitle": "Stress",
    "title": "cardInfo.title.stress",
    "body": "cardInfo.body.stress"
  },
  {
    "sourceTitle": "Hours of sleep",
    "title": "lib.dashboard.hoursOfSleep",
    "body": "cardInfo.body.hours.of.sleep"
  },
  {
    "sourceTitle": "Stress Monitor",
    "title": "lib.dashboard.stressMonitor",
    "body": "cardInfo.body.stress.monitor"
  },
  {
    "sourceTitle": "Health Monitor",
    "title": "settings.NotificationsSection.healthMonitor",
    "body": "cardInfo.body.health.monitor"
  },
  {
    "sourceTitle": "Healthspan",
    "title": "health.HealthScreen.healthspan",
    "body": "cardInfo.body.healthspan"
  },
  {
    "sourceTitle": "Fitness",
    "title": "health.FirstAge.fitness",
    "body": "cardInfo.body.fitness"
  },
  {
    "sourceTitle": "Heart rate",
    "title": "queries.chart.heartRate",
    "body": "cardInfo.body.heart.rate"
  },
  {
    "sourceTitle": "Heart rate variability",
    "title": "lib.dashboard.heartRateVariability",
    "body": "cardInfo.body.heart.rate.variability"
  },
  {
    "sourceTitle": "Resting heart rate",
    "title": "lib.dashboard.restingHeartRate",
    "body": "cardInfo.body.resting.heart.rate"
  },
  {
    "sourceTitle": "Respiratory rate",
    "title": "lib.dashboard.respiratoryRate",
    "body": "cardInfo.body.respiratory.rate"
  },
  {
    "sourceTitle": "Blood oxygen",
    "title": "lib.dashboard.bloodOxygen",
    "body": "cardInfo.body.blood.oxygen"
  },
  {
    "sourceTitle": "Skin temperature",
    "title": "lib.dashboard.skinTemperature",
    "body": "cardInfo.body.skin.temperature"
  },
  {
    "sourceTitle": "Sleep performance",
    "title": "lib.dashboard.sleepPerformance",
    "body": "cardInfo.body.sleep.performance"
  },
  {
    "sourceTitle": "Recovery",
    "title": "ui.shells.HomeHeader.recovery",
    "body": "cardInfo.body.recovery"
  },
  {
    "sourceTitle": "Strain",
    "title": "ui.shells.HomeHeader.strain",
    "body": "cardInfo.body.strain"
  },
  {
    "sourceTitle": "Calories",
    "title": "health.dataCheckSummary.calories",
    "body": "cardInfo.body.calories"
  },
  {
    "sourceTitle": "Steps",
    "title": "health.dataCheckSummary.steps",
    "body": "cardInfo.body.steps"
  },
  {
    "sourceTitle": "Weight",
    "title": "lib.dashboard.weight",
    "body": "cardInfo.body.weight"
  },
  {
    "sourceTitle": "Body fat",
    "title": "lib.dashboard.bodyFat",
    "body": "cardInfo.body.body.fat"
  },
  {
    "sourceTitle": "Distance",
    "title": "health.dataCheckSummary.distance",
    "body": "cardInfo.body.distance"
  },
  {
    "sourceTitle": "Floors",
    "title": "lib.extraMetrics.floors",
    "body": "cardInfo.body.floors"
  },
  {
    "sourceTitle": "Elevation gain",
    "title": "lib.extraMetrics.elevationGain",
    "body": "cardInfo.body.elevation.gain"
  },
  {
    "sourceTitle": "Active minutes",
    "title": "lib.extraMetrics.activeMinutes",
    "body": "cardInfo.body.active.minutes"
  },
  {
    "sourceTitle": "Light activity",
    "title": "lib.extraMetrics.lightActivity",
    "body": "cardInfo.body.light.activity"
  },
  {
    "sourceTitle": "Active Zone Minutes",
    "title": "lib.extraMetrics.activeZoneMinutes",
    "body": "cardInfo.body.active.zone.minutes"
  },
  {
    "sourceTitle": "Active calories",
    "title": "lib.extraMetrics.activeCalories",
    "body": "cardInfo.body.active.calories"
  },
  {
    "sourceTitle": "Sedentary time",
    "title": "lib.extraMetrics.sedentaryTime",
    "body": "cardInfo.body.sedentary.time"
  },
  {
    "sourceTitle": "Average heart rate",
    "title": "lib.extraMetrics.averageHeartRate",
    "body": "cardInfo.body.average.heart.rate"
  },
  {
    "sourceTitle": "Water",
    "title": "lib.extraMetrics.water",
    "body": "cardInfo.body.water"
  },
  {
    "sourceTitle": "Calories eaten",
    "title": "lib.extraMetrics.caloriesEaten",
    "body": "cardInfo.body.calories.eaten"
  },
  {
    "sourceTitle": "Protein",
    "title": "lib.extraMetrics.protein",
    "body": "cardInfo.body.protein"
  },
  {
    "sourceTitle": "Carbohydrates",
    "title": "lib.extraMetrics.carbohydrates",
    "body": "cardInfo.body.carbohydrates"
  },
  {
    "sourceTitle": "Fat",
    "title": "lib.extraMetrics.fat",
    "body": "cardInfo.body.fat"
  },
  {
    "sourceTitle": "Blood glucose",
    "title": "lib.extraMetrics.bloodGlucose",
    "body": "cardInfo.body.blood.glucose"
  },
  {
    "sourceTitle": "Core temperature",
    "title": "lib.extraMetrics.coreTemperature",
    "body": "cardInfo.body.core.temperature"
  },
  {
    "sourceTitle": "Swim strokes",
    "title": "lib.extraMetrics.swimStrokes",
    "body": "cardInfo.body.swim.strokes"
  },
  {
    "sourceTitle": "Recovery trend",
    "title": "cardInfo.title.recovery.trend",
    "body": "cardInfo.body.recovery.trend"
  },
  {
    "sourceTitle": "What shaped it",
    "title": "cardInfo.title.what.shaped.it",
    "body": "cardInfo.body.what.shaped.it"
  },
  {
    "sourceTitle": "Tomorrow’s forecast",
    "title": "cardInfo.title.tomorrow.s.forecast",
    "body": "cardInfo.body.tomorrow.s.forecast"
  },
  {
    "sourceTitle": "Time in zones",
    "title": "activity.ActivityScreen.timeInZones",
    "body": "cardInfo.body.time.in.zones"
  },
  {
    "sourceTitle": "Activities",
    "title": "queries.home.activities",
    "body": "cardInfo.body.activities"
  },
  {
    "sourceTitle": "Last night’s sleep",
    "title": "queries.home.lastNightSSleep",
    "body": "cardInfo.body.last.night.s.sleep"
  },
  {
    "sourceTitle": "Hours vs. needed",
    "title": "queries.sleep.hoursVsNeeded",
    "body": "cardInfo.body.hours.vs.needed"
  },
  {
    "sourceTitle": "Sleep consistency",
    "title": "lib.dashboard.sleepConsistency",
    "body": "cardInfo.body.sleep.consistency"
  },
  {
    "sourceTitle": "Restorative sleep",
    "title": "queries.chart.restorativeSleep",
    "body": "cardInfo.body.restorative.sleep"
  },
  {
    "sourceTitle": "Sleep efficiency",
    "title": "queries.chart.sleepEfficiency",
    "body": "cardInfo.body.sleep.efficiency"
  },
  {
    "sourceTitle": "Sleep debt",
    "title": "lib.dashboard.sleepDebt",
    "body": "cardInfo.body.sleep.debt"
  },
  {
    "sourceTitle": "Restorative sleep (%)",
    "title": "lib.dashboard.restorativeSleep",
    "body": "cardInfo.body.restorative.sleep"
  },
  {
    "sourceTitle": "Restorative sleep (hours)",
    "title": "lib.dashboard.restorativeSleepHours",
    "body": "cardInfo.body.restorative.sleep.hours"
  },
  {
    "sourceTitle": "Day strain",
    "title": "lib.dashboard.dayStrain",
    "body": "cardInfo.body.day.strain"
  },
  {
    "sourceTitle": "HR zones 1-3 (weekly)",
    "title": "lib.dashboard.hrZones13Weekly",
    "body": "cardInfo.body.hr.zones.1.3.weekly"
  },
  {
    "sourceTitle": "HR zones 4-5 (weekly)",
    "title": "lib.dashboard.hrZones45Weekly",
    "body": "cardInfo.body.hr.zones.4.5.weekly"
  },
  {
    "sourceTitle": "HR zones all (weekly)",
    "title": "lib.dashboard.hrZonesAllWeekly",
    "body": "cardInfo.body.hr.zones.all.weekly"
  },
  {
    "sourceTitle": "Strength activity time (weekly)",
    "title": "lib.dashboard.strengthActivityTimeWeekly",
    "body": "cardInfo.body.strength.activity.time.weekly"
  },
  {
    "sourceTitle": "VO2 max",
    "title": "health.dataCheckSummary.vo2Max",
    "body": "cardInfo.body.vo2.max"
  },
  {
    "sourceTitle": "Lean body mass",
    "title": "lib.dashboard.leanBodyMass",
    "body": "cardInfo.body.lean.body.mass"
  },
  {
    "sourceTitle": "Pace of Aging",
    "title": "health.HealthScreen.paceOfAging",
    "body": "cardInfo.body.pace.of.aging"
  },
  {
    "sourceTitle": "Pulse Age history",
    "title": "cardInfo.title.pulse.age.history",
    "body": "cardInfo.body.pulse.age.history"
  },
  {
    "sourceTitle": "Percentile",
    "title": "health.FitnessScreen.percentile",
    "body": "cardInfo.body.percentile"
  },
  {
    "sourceTitle": "VO2 max trend",
    "title": "health.FitnessScreen.vo2MaxTrend",
    "body": "cardInfo.body.vo2.max.trend"
  },
  {
    "sourceTitle": "Training load",
    "title": "health.FitnessScreen.trainingLoad",
    "body": "cardInfo.body.training.load"
  },
  {
    "sourceTitle": "Fitness, fatigue and form",
    "title": "health.FitnessScreen.fitnessFatigueAndForm",
    "body": "cardInfo.body.fitness.fatigue.and.form"
  },
  {
    "sourceTitle": "Recovery breakdown",
    "title": "cardInfo.title.recovery.breakdown",
    "body": "cardInfo.body.recovery.breakdown"
  },
  {
    "sourceTitle": "Averages",
    "title": "cardInfo.title.averages",
    "body": "cardInfo.body.averages"
  },
  {
    "sourceTitle": "Training balance",
    "title": "cardInfo.title.training.balance",
    "body": "cardInfo.body.training.balance"
  },
  {
    "sourceTitle": "Top journal effects",
    "title": "cardInfo.title.top.journal.effects",
    "body": "cardInfo.body.top.journal.effects"
  },
  {
    "sourceTitle": "Best and worst day",
    "title": "cardInfo.title.best.and.worst.day",
    "body": "cardInfo.body.best.and.worst.day"
  },
  {
    "sourceTitle": "History",
    "title": "cardInfo.title.history",
    "body": "cardInfo.body.history"
  },
  {
    "sourceTitle": "By weekday",
    "title": "cardInfo.title.by.weekday",
    "body": "cardInfo.body.by.weekday"
  },
  {
    "sourceTitle": "Minutes by intensity",
    "title": "cardInfo.title.minutes.by.intensity",
    "body": "cardInfo.body.minutes.by.intensity"
  },
  {
    "sourceTitle": "Workouts",
    "title": "activity.ActivitiesScreen.workouts",
    "body": "cardInfo.body.workouts"
  },
  {
    "sourceTitle": "Logged entries",
    "title": "cardInfo.title.logged.entries",
    "body": "cardInfo.body.logged.entries"
  },
  {
    "sourceTitle": "Eaten vs. burned",
    "title": "cardInfo.title.eaten.vs.burned",
    "body": "cardInfo.body.eaten.vs.burned"
  },
  {
    "sourceTitle": "Macros",
    "title": "cardInfo.title.macros",
    "body": "cardInfo.body.macros"
  },
  {
    "sourceTitle": "Readings",
    "title": "cardInfo.title.readings",
    "body": "cardInfo.body.readings"
  },
  {
    "sourceTitle": "Unusual days",
    "title": "cardInfo.title.unusual.days",
    "body": "cardInfo.body.unusual.days"
  },
  {
    "sourceTitle": "Movement by hour",
    "title": "cardInfo.title.movement.by.hour",
    "body": "cardInfo.body.movement.by.hour"
  },
  {
    "sourceTitle": "Steps by hour",
    "title": "cardInfo.title.steps.by.hour",
    "body": "cardInfo.body.steps.by.hour"
  },
  {
    "sourceTitle": "This week",
    "title": "cardInfo.title.this.week",
    "body": "cardInfo.body.this.week"
  },
  {
    "sourceTitle": "Last 7 days",
    "title": "cardInfo.title.last.7.days",
    "body": "cardInfo.body.last.7.days"
  },
  {
    "sourceTitle": "Last 30 days",
    "title": "activity.ActivitiesScreen.last30Days",
    "body": "cardInfo.body.last.30.days"
  },
  {
    "sourceTitle": "Last 6 months",
    "title": "cardInfo.title.last.6.months",
    "body": "cardInfo.body.last.6.months"
  },
  {
    "sourceTitle": "Last 12 months",
    "title": "cardInfo.title.last.12.months",
    "body": "cardInfo.body.last.12.months"
  }
];

export function cardInfo(title: string): InfoContent | undefined {
  const entry = CARD_INFO.find((item) => item.sourceTitle === title || tr(item.title) === title);
  return entry ? { title: tr(entry.title), body: tr(entry.body) } : undefined;
}
