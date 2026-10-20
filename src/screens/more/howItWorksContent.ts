import { tr } from "@/i18n";
// "How Pulse works" (More): one explainer per score, written from src/core and docs/algorithms. Every number here
// is the code's; when the code changes, change this file.
export type HowRow = { term: string; detail: string }
export type HowSection = { title: string; paragraphs?: string[]; rows?: HowRow[] }
export type ScoreDoc = {
  /** URL segment: /more/how-it-works/<slug>. */
  slug: string
  /** Display name, e.g. "Recovery", "Pulse Age". */
  name: string
  /** One short sentence (max ~70 characters) shown as the page intro and as a caption. */
  summary: string
  /** The in-app screen where the score lives, e.g. "/recovery", "/health/healthspan"; null if none. */
  href: string | null
  /** In this order: "What goes in", "How it is weighted", "What the bands mean", optionally "A worked example" (real numbers run through the code), "Limits". Omit a section only if it truly does not apply (say so in Limits instead). */
  sections: HowSection[]
}
export const SCORE_DOCS: ScoreDoc[] = [
  {
    slug: "recovery",
    get name() { return tr("ui.shells.HomeHeader.recovery"); },
    get summary() { return tr("more.howItWorksContent.howReadyYourBodyIsToTake"); },
    href: "/recovery",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.pulseScoresRecoveryEachMorningFromLast"),
        ]; },
        rows: [
          { get term() { return tr("lib.dashboard.heartRateVariability"); }, get detail() { return tr("more.howItWorksContent.theMeanOfFitbitSHrvReadings"); } },
          { get term() { return tr("lib.dashboard.restingHeartRate"); }, get detail() { return tr("more.howItWorksContent.yourMeanHeartRateWhileYouSlept"); } },
          { get term() { return tr("queries.trendView.sleepPerformance"); }, get detail() { return tr("more.howItWorksContent.lastNightSSleepPerformance0To"); } },
          { get term() { return tr("lib.dashboard.respiratoryRate"); }, get detail() { return tr("more.howItWorksContent.breathsPerMinuteAsleepInRpmHigher"); } },
          { get term() { return tr("lib.dashboard.skinTemperature"); }, get detail() { return tr("more.howItWorksContent.lastNightAgainstYourSkinTemperatureBaseline"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.hrvAndRestingHeartRateAreEach"),
        ]; },
        rows: [
          { get term() { return tr("breathe.BreatheScreen.hrv_49a6fe"); }, detail: "40%" },
          { get term() { return tr("lib.dashboard.restingHeartRate"); }, detail: "30%" },
          { get term() { return tr("queries.trendView.sleepPerformance"); }, detail: "30%" },
          { get term() { return tr("lib.dashboard.respiratoryRate"); }, get detail() { return tr("more.howItWorksContent.thenUpTo10PointsUpOr"); } },
          { get term() { return tr("lib.dashboard.skinTemperature"); }, get detail() { return tr("more.howItWorksContent.thenUpTo30PointsDownWhen"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        get paragraphs() { return [tr("more.howItWorksContent.theResultIsKeptBetween1And")]; },
        rows: [
          { term: "67-100%", get detail() { return tr("more.howItWorksContent.greenYourBodyIsPrimedForStrain"); } },
          { term: "34-66%", get detail() { return tr("more.howItWorksContent.yellowYouAreMaintainingModerateStrainFits"); } },
          { term: "1-33%", get detail() { return tr("more.howItWorksContent.redYourBodyNeedsRest"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.recoveryShowsFromYourSecondNightOnce"),
        ]; },
      },
    ],
  },
  {
    slug: "strain",
    get name() { return tr("ui.shells.HomeHeader.strain"); },
    get summary() { return tr("more.howItWorksContent.theLoadOfYourDayAsA"); },
    href: "/strain",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.heartRateWhileAwake"); }, get detail() { return tr("more.howItWorksContent.minuteAveragesOutsideSleepAndRecordedWorkouts"); } },
          { get term() { return tr("activity.ActivitiesScreen.workouts"); }, get detail() { return tr("more.howItWorksContent.everyHeartRateReadingDuringARecorded"); } },
          { get term() { return tr("health.dataCheckSummary.steps"); }, get detail() { return tr("more.howItWorksContent.theStepsYouTakeWhileAwakeOutside"); } },
          { get term() { return tr("onboarding.ProfileForm.maxHeartRate"); }, get detail() { return tr("more.howItWorksContent.theValueInSettingsElse220Your"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.eachSecondOfHeartRateEarnsUnits"),
        ]; },
        rows: [
          { get term() { return tr("workout.LiveWorkoutScreen.belowZone1"); }, get detail() { return tr("more.howItWorksContent.0To1UnitASecondWorkouts"); } },
          { term: "Zone 1", get detail() { return tr("more.howItWorksContent.2UnitsASecond"); } },
          { term: "Zone 2", get detail() { return tr("more.howItWorksContent.3To4UnitsASecond"); } },
          { term: "Zone 3", get detail() { return tr("more.howItWorksContent.4To7UnitsASecond"); } },
          { term: "Zone 4", get detail() { return tr("more.howItWorksContent.7To12UnitsASecond"); } },
          { term: "Zone 5", get detail() { return tr("more.howItWorksContent.12To20UnitsASecond"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.strain16AtanSteps700066"),
        ]; },
        rows: [
          { get term() { return tr("more.howItWorksContent.upTo40"); }, get detail() { return tr("ui.metrics.SleepStages.light"); } },
          { term: "41-60%", get detail() { return tr("more.howItWorksContent.moderate"); } },
          { term: "61-79%", get detail() { return tr("more.howItWorksContent.strenuous"); } },
          { get term() { return tr("more.howItWorksContent.80AndUp"); }, get detail() { return tr("more.howItWorksContent.allOut"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.strainNeedsHeartRateOrStepsFor"),
          tr("more.howItWorksContent.heartRateMissesEffortThatBarelyRaises"),
        ]; },
      },
    ],
  },
  {
    slug: "strain-target",
    get name() { return tr("info.strainTarget"); },
    get summary() { return tr("more.howItWorksContent.aStrainRangeForTodaySetBy"); },
    href: "/strain",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.todaySRecovery"); }, get detail() { return tr("more.howItWorksContent.movesAndWidensTheRangeWithoutA"); } },
          { get term() { return tr("more.howItWorksContent.yourLast14DaysOfStrain"); }, get detail() { return tr("more.howItWorksContent.foldedIntoABaseTheNewestDays"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.theBaseStartsAtTheOldestDay"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.belowTheRange"); }, get detail() { return tr("more.howItWorksContent.aLighterDayThanYourBodyCan"); } },
          { get term() { return tr("more.howItWorksContent.insideTheRange"); }, get detail() { return tr("more.howItWorksContent.trainingBuildsFitnessWithoutDiggingARecovery"); } },
          { get term() { return tr("more.howItWorksContent.aboveTheRange"); }, get detail() { return tr("more.howItWorksContent.moreStrainThanTodaySRecoverySuggests"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.aWorkedExample"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.take14DaysOfPastStrainOldest"),
          tr("more.howItWorksContent.todaySRecoveryIs72SoThe"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.withFewerThan14DaysOfStrain"),
        ]; },
      },
    ],
  },
  {
    slug: "sleep",
    get name() { return tr("queries.trendView.sleepPerformance"); },
    get summary() { return tr("more.howItWorksContent.howWellLastNightSSleepMet"); },
    href: "/sleep",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("coach.Evidence.timeAsleep"); }, get detail() { return tr("more.howItWorksContent.yourMainSleepAgainstTonightSSleep"); } },
          { get term() { return tr("more.howItWorksContent.deepSleep"); }, get detail() { return tr("more.howItWorksContent.deepSleepAsAShareOfYour"); } },
          { get term() { return tr("more.howItWorksContent.remSleep"); }, get detail() { return tr("more.howItWorksContent.remSleepAsAShareOfYour"); } },
          { get term() { return tr("more.howItWorksContent.heartRateDip"); }, get detail() { return tr("more.howItWorksContent.howFarYourHeartRateFellWhile"); } },
          { get term() { return tr("more.howItWorksContent.efficiency"); }, get detail() { return tr("more.howItWorksContent.timeAsleepAsAShareOfTime"); } },
          { get term() { return tr("more.howItWorksContent.continuity"); }, get detail() { return tr("more.howItWorksContent.howFewTimesYouWokeDuringThe"); } },
        ],
        get paragraphs() { return [
          tr("more.howItWorksContent.yourSleepNeedIsA75"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.eachPartIsScoredAgainstItsTarget"),
        ]; },
        rows: [
          { get term() { return tr("more.howItWorksContent.timeAsleep35"); }, get detail() { return tr("more.howItWorksContent.fullMarksAt100OfYourNeed"); } },
          { get term() { return tr("more.howItWorksContent.deepSleep20"); }, get detail() { return tr("more.howItWorksContent.fullMarksAtAbout15OfYour"); } },
          { get term() { return tr("more.howItWorksContent.remSleep20"); }, get detail() { return tr("more.howItWorksContent.fullMarksAt20OfYourNeed"); } },
          { get term() { return tr("more.howItWorksContent.heartRateDip10"); }, get detail() { return tr("more.howItWorksContent.fullMarksAtADipOfAbout"); } },
          { get term() { return tr("more.howItWorksContent.efficiency75"); }, get detail() { return tr("more.howItWorksContent.fullMarksAt97FallsOffQuickly"); } },
          { get term() { return tr("more.howItWorksContent.continuity75"); }, get detail() { return tr("more.howItWorksContent.fullMarksUpTo5WakeUps"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { term: "85-100%", get detail() { return tr("queries.trendView.optimal"); } },
          { term: "70-84%", get detail() { return tr("queries.trendView.sufficient"); } },
          { term: "0-69%", get detail() { return tr("queries.training.poor"); } },
        ],
        get paragraphs() { return [
          tr("more.howItWorksContent.theKeyStatisticsUseTheirOwnMarks"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.sleepPerformanceScoresTheMainSleepOnly"),
        ]; },
      },
    ],
  },
  {
    slug: "sleep-planner",
    get name() { return tr("sleep.planner"); },
    get summary() { return tr("more.howItWorksContent.tonightSSleepNeedAndTheBedtimes"); },
    href: "/sleep",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.yourSleepGoal"); }, get detail() { return tr("more.howItWorksContent.75HoursANight"); } },
          { get term() { return tr("more.howItWorksContent.todaySStrain"); }, get detail() { return tr("more.howItWorksContent.strainAboveYour30DayAverageAdds"); } },
          { get term() { return tr("lib.dashboard.sleepDebt"); }, get detail() { return tr("more.howItWorksContent.whatYourLast7DaysSleepOwes"); } },
          { get term() { return tr("more.howItWorksContent.yourRecentNights"); }, get detail() { return tr("more.howItWorksContent.yourUsualWakeTimeSleepEfficiencyAnd"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.tonightSNeed75Hours2"),
          tr("more.howItWorksContent.sleepDebtAddsUpTheLast7"),
          tr("more.howItWorksContent.bedtimesCountBackFromYourUsualWake"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.peak"); }, get detail() { return tr("more.howItWorksContent.100OfTonightSNeed"); } },
          { get term() { return tr("more.howItWorksContent.perform"); }, get detail() { return tr("more.howItWorksContent.85OfTonightSNeed"); } },
          { get term() { return tr("more.howItWorksContent.getBy"); }, get detail() { return tr("more.howItWorksContent.70OfTonightSNeed"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.thePlannerNeedsAFewMainSleeps"),
        ]; },
      },
    ],
  },
  {
    slug: "pulse-age",
    name: "Pulse Age",
    get summary() { return tr("more.howItWorksContent.howOldYourBodyBehavesAndHow"); },
    href: "/health/healthspan",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        get paragraphs() { return [tr("more.howItWorksContent.nineHabitsAndVitalsOverThe28")]; },
        rows: [
          { get term() { return tr("more.howItWorksContent.sleepHours"); }, get detail() { return tr("more.howItWorksContent.reference75HoursMuchShorterOr"); } },
          { get term() { return tr("lib.dashboard.sleepConsistency"); }, get detail() { return tr("more.howItWorksContent.reference70"); } },
          { get term() { return tr("health.dataCheckSummary.steps"); }, get detail() { return tr("more.howItWorksContent.reference8000ADay6000"); } },
          { get term() { return tr("more.howItWorksContent.heartRateZones23"); }, get detail() { return tr("more.howItWorksContent.reference150MinutesAWeek"); } },
          { get term() { return tr("queries.health.heartRateZones45"); }, get detail() { return tr("more.howItWorksContent.reference10MinutesAWeek"); } },
          { get term() { return tr("more.howItWorksContent.strengthActivity"); }, get detail() { return tr("more.howItWorksContent.reference10MinutesAWeek"); } },
          { get term() { return tr("lib.dashboard.restingHeartRate"); }, get detail() { return tr("more.howItWorksContent.referenceFromATableForYourAge"); } },
          { get term() { return tr("health.dataCheckSummary.vo2Max"); }, get detail() { return tr("more.howItWorksContent.fitbitSReadingsReferenceFromATable"); } },
          { get term() { return tr("lib.dashboard.leanBodyMass"); }, get detail() { return tr("more.howItWorksContent.100LessYourBodyFatReference100"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.eachFactorMapsToAChangeIn"),
          tr("more.howItWorksContent.paceOfAgingIsYourPulseAge"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.youngerThanYourAge"); }, get detail() { return tr("more.howItWorksContent.yourFactorsBeatTheReferenceOnBalance"); } },
          { get term() { return tr("more.howItWorksContent.olderThanYourAge"); }, get detail() { return tr("more.howItWorksContent.theyFallShortOfIt"); } },
          { get term() { return tr("more.howItWorksContent.paceBelow10x"); }, get detail() { return tr("more.howItWorksContent.yourBodyBehavesYoungerThanYourAge"); } },
          { get term() { return tr("more.howItWorksContent.paceAbove10x"); }, get detail() { return tr("more.howItWorksContent.itBehavesOlder"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.timeInZonesIsCountedByPulse"),
        ]; },
      },
    ],
  },
  {
    slug: "stress",
    get name() { return tr("lib.dashboard.stressMonitor"); },
    get summary() { return tr("more.howItWorksContent.howHardYourBodyIsWorkingWhile"); },
    href: "/health/stress",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("queries.chart.heartRate"); }, get detail() { return tr("more.howItWorksContent.each6MinuteStretchOfTheDay"); } },
          { get term() { return tr("lib.dashboard.heartRateVariability"); }, get detail() { return tr("more.howItWorksContent.atNightFitbitWritesHrvEvery5"); } },
          { get term() { return tr("more.howItWorksContent.workoutsAndExercise"); }, get detail() { return tr("more.howItWorksContent.leftOutStressIsNotShownWhile"); } },
          { get term() { return tr("more.howItWorksContent.yourBaselines"); }, get detail() { return tr("more.howItWorksContent.yourAwakeHeartRateOverTheLast"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.each6MinuteStretchSHeartRate"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { term: "0-29", get detail() { return tr("more.howItWorksContent.lowCalm"); } },
          { term: "30-59", get detail() { return tr("more.howItWorksContent.mediumMoreActiveThanYourCalmLevel"); } },
          { term: "60-100", get detail() { return tr("more.howItWorksContent.highWellAboveYourUsualHeartRate"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.stressNeeds5DaysOfDataAnd"),
        ]; },
      },
    ],
  },
  {
    slug: "energy-bank",
    get name() { return tr("queries.chart.energyBank"); },
    get summary() { return tr("more.howItWorksContent.anEstimateOfHowMuchEnergyYou"); },
    href: "/",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("ui.shells.HomeHeader.sleep"); }, get detail() { return tr("more.howItWorksContent.chargesTheBank"); } },
          { term: "Stress", get detail() { return tr("more.howItWorksContent.each6MinuteStretchSStressAs"); } },
          { get term() { return tr("activity.ActivitiesScreen.workouts"); }, get detail() { return tr("more.howItWorksContent.drainThroughTheStressYourHeartRate"); } },
          { get term() { return tr("common.yesterday"); }, get detail() { return tr("more.howItWorksContent.theLevelCarriesAcrossMidnightItDoes"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [tr("more.howItWorksContent.every6MinutesTheBankMovesOne")]; },
        rows: [
          { get term() { return tr("more.howItWorksContent.asleep"); }, get detail() { return tr("more.howItWorksContent.aFull75HourNightCharges"); } },
          { get term() { return tr("more.howItWorksContent.awakeAndCalm"); }, get detail() { return tr("more.howItWorksContent.stressUnder20ChargesAbout15Points"); } },
          { get term() { return tr("more.howItWorksContent.awakeAndStressed"); }, get detail() { return tr("more.howItWorksContent.stressOf20OrMoreDrainsFaster"); } },
          { get term() { return tr("more.howItWorksContent.nearTheEnds"); }, get detail() { return tr("more.howItWorksContent.chargingSlowsNear100AndDrainingSlows"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { term: "67-100%", get detail() { return tr("more.howItWorksContent.plentyInReserve"); } },
          { term: "34-66%", get detail() { return tr("more.howItWorksContent.paceYourself"); } },
          { term: "1-33%", get detail() { return tr("more.howItWorksContent.runningLow"); } },
        ],
        get paragraphs() { return [tr("more.howItWorksContent.theThreeBiggestDrainsAreListedBy")]; },
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.energyBankRunsFromYourFirstDay"),
        ]; },
      },
    ],
  },
  {
    slug: "health-monitor",
    get name() { return tr("settings.NotificationsSection.healthMonitor"); },
    get summary() { return tr("more.howItWorksContent.lastNightSVitalsAgainstYourOwn"); },
    href: "/health/monitor",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("lib.dashboard.restingHeartRate"); }, get detail() { return tr("more.howItWorksContent.yourMeanHeartRateWhileYouSlept_326126"); } },
          { get term() { return tr("lib.dashboard.heartRateVariability"); }, get detail() { return tr("more.howItWorksContent.theMeanOfFitbitSHrvReadings_82f259"); } },
          { get term() { return tr("lib.dashboard.respiratoryRate"); }, get detail() { return tr("more.howItWorksContent.breathsPerMinuteAsleepInRpm"); } },
          { get term() { return tr("lib.dashboard.skinTemperature"); }, get detail() { return tr("more.howItWorksContent.lastNightAgainstYourSkinTemperatureBaseline_76cb7f"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.forEveryVitalYourNormalRangeIs"),
          tr("more.howItWorksContent.theIllnessSignalComparesRestingHeartRate"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { get term() { return tr("health.MonitorScreen.withinRange"); }, get detail() { return tr("more.howItWorksContent.insideYourNormalRange"); } },
          { get term() { return tr("more.howItWorksContent.elevatedOrLow"); }, get detail() { return tr("more.howItWorksContent.outsideItTheChipNamesTheBound"); } },
          { get term() { return tr("more.howItWorksContent.illnessSignal"); }, get detail() { return tr("more.howItWorksContent.severalVitalsMovedTogetherAPatternOften"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.aOneStandardDeviationRangeIsNarrow"),
        ]; },
      },
    ],
  },
  {
    slug: "fitness",
    get name() { return tr("fitness.level"); },
    get summary() { return tr("more.howItWorksContent.yourVo2MaxComparedWithPeopleOf"); },
    href: "/health/fitness",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("health.dataCheckSummary.vo2Max"); }, get detail() { return tr("more.howItWorksContent.yourLatestRunValueFromTheLast"); } },
          { get term() { return tr("more.howItWorksContent.ageAndSex"); }, get detail() { return tr("more.howItWorksContent.fromYourProfile"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.pulsePlacesYourVo2MaxInThe"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.80thPercentileAndUp"); }, get detail() { return tr("health.FitnessScreen.superior"); } },
          { get term() { return tr("more.howItWorksContent.60th79th"); }, get detail() { return tr("health.FitnessScreen.excellent"); } },
          { get term() { return tr("more.howItWorksContent.40th59th"); }, get detail() { return tr("health.FitnessScreen.good"); } },
          { get term() { return tr("more.howItWorksContent.20th39th"); }, get detail() { return tr("health.FitnessScreen.fair"); } },
          { get term() { return tr("more.howItWorksContent.belowThe20th"); }, get detail() { return tr("queries.training.poor"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.aWorkedExample"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.takeAWomanOf52WhoseFitbit"),
          tr("more.howItWorksContent.her30SitsBetweenThoseTwoColumns"),
          tr("more.howItWorksContent.theBandsAreCutAtThe20th"),
          tr("more.howItWorksContent.forComparisonAManOf35With"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.fitbitSVo2MaxIsAnEstimate"),
        ]; },
      },
    ],
  },
  {
    slug: "training-balance",
    get name() { return tr("cardInfo.title.training.balance"); },
    get summary() { return tr("more.howItWorksContent.whetherYourRecentTrainingLoadIsAbove"); },
    href: "/health/fitness",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.fitnessAndFatigue"); }, get detail() { return tr("more.howItWorksContent.yourLongTermAndShortTermLoad"); } },
          { get term() { return tr("more.howItWorksContent.todaySRecovery"); }, get detail() { return tr("more.howItWorksContent.tellsPushingFromAProductiveBlock"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.trainingLoadIsFatigueDividedByFitness"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { get term() { return tr("health.FitnessScreen.detraining"); }, get detail() { return tr("more.howItWorksContent.100OrBelowWithFitnessDown"); } },
          { get term() { return tr("queries.trendView.optimal"); }, get detail() { return tr("more.howItWorksContent.100OrBelowWithFitnessHolding"); } },
          { get term() { return tr("health.FitnessScreen.pushing"); }, get detail() { return tr("more.howItWorksContent.above100WhileRecoveryIsUnder"); } },
          { get term() { return tr("health.FitnessScreen.highRisk"); }, get detail() { return tr("more.howItWorksContent.above140LoadJumpedWellAbove"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.trainingLoadNeedsWorkoutsOnAbout10"),
        ]; },
      },
    ],
  },
  {
    slug: "journal-impact",
    get name() { return tr("coach.Evidence.behaviourInsights"); },
    get summary() { return tr("more.howItWorksContent.howEachBehaviourYouLogGoesWith"); },
    href: "/journal/insights",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.journalCheckIns"); }, get detail() { return tr("more.howItWorksContent.eachBehaviourYouAnsweredYesOrNo"); } },
          { get term() { return tr("more.howItWorksContent.nextDayScores"); }, get detail() { return tr("more.howItWorksContent.theNextMorningSRecoveryAndHrv"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.forEachBehaviourPulseComparesTheDays"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.positiveOrNegative"); }, get detail() { return tr("more.howItWorksContent.thatWhole70IntervalSitsAboveOr"); } },
          { get term() { return tr("more.howItWorksContent.noClearEffect"); }, get detail() { return tr("more.howItWorksContent.theIntervalCrossesZero"); } },
          { get term() { return tr("more.howItWorksContent.needsMoreData"); }, get detail() { return tr("more.howItWorksContent.fewerThan5YesDaysOr5"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.aWorkedExample"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.saySomeoneLogsAlcoholForAMonth"),
          tr("more.howItWorksContent.onThe21NoDaysNextMorning"),
          tr("more.howItWorksContent.thatDifferenceAloneCouldBeLuckSo"),
          tr("more.howItWorksContent.soTheLabelIsNegativeAClear"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.thisIsAnAssociationNotProofOf"),
        ]; },
      },
    ],
  },
  {
    slug: "sleep-consistency",
    get name() { return tr("lib.dashboard.sleepConsistency"); },
    get summary() { return tr("more.howItWorksContent.howCloselyTheTimesYouAreAsleep"); },
    href: "/sleep",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.sleepSessions"); }, get detail() { return tr("more.howItWorksContent.mainSleepsAndNapsMinuteByMinute"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.pulseLaysEachDaySAsleepMinutes"),
          tr("more.howItWorksContent.itIsOneOfTheInputsTo"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { term: "80-100%", get detail() { return tr("queries.trendView.optimal"); } },
          { term: "70-79%", get detail() { return tr("queries.trendView.sufficient"); } },
          { term: "0-69%", get detail() { return tr("queries.training.poor"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.itNeedsAtLeast2DaysWith"),
        ]; },
      },
    ],
  },
  {
    slug: "training-load",
    get name() { return tr("health.FitnessScreen.fitnessFatigueAndForm"); },
    get summary() { return tr("more.howItWorksContent.yourLongTermAndShortTermTraining"); },
    href: "/health/fitness",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.trainingLoadEachDaySTrainingImpulse"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        rows: [
          { get term() { return tr("health.FirstAge.fitness"); }, get detail() { return tr("more.howItWorksContent.eachDayKeeps4143OfYesterday"); } },
          { get term() { return tr("health.LoadChart.fatigue"); }, get detail() { return tr("more.howItWorksContent.eachDayKeeps34OfYesterday"); } },
          { get term() { return tr("health.LoadChart.form"); }, get detail() { return tr("more.howItWorksContent.fitnessMinusFatigue"); } },
        ],
        get paragraphs() { return [tr("more.howItWorksContent.bothStartFromZero")]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.formAbove0"); }, get detail() { return tr("more.howItWorksContent.yourRecentLoadIsLighterThanYour"); } },
          { get term() { return tr("more.howItWorksContent.formBelow0"); }, get detail() { return tr("more.howItWorksContent.youAreCarryingFatigueFromRecentTraining"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.aWorkedExample"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.take14DaysOfDailyLoad30"),
          tr("more.howItWorksContent.fatigueMovesAQuarterOfTheWay"),
          tr("more.howItWorksContent.aNegativeFormMeansRecentLoadIs"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.heartRateIsItsOnlyInputSo"),
        ]; },
      },
    ],
  },
  {
    slug: "hr-recovery",
    get name() { return tr("activity.ActivityScreen.heartRateRecovery"); },
    get summary() { return tr("more.howItWorksContent.howFarYourHeartRateDropsWithin"); },
    href: null,
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("queries.chart.heartRate"); }, get detail() { return tr("more.howItWorksContent.everyReadingFromTheStartOfThe"); } },
          { get term() { return tr("more.howItWorksContent.zones"); }, get detail() { return tr("more.howItWorksContent.yourZonesOnMaxHeartRateZone"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.heartRateRecoveryTheLargestDropBetween"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.20BpmOrMore"); }, get detail() { return tr("health.FitnessScreen.good"); } },
          { get term() { return tr("more.howItWorksContent.1219Bpm"); }, get detail() { return tr("more.howItWorksContent.typical"); } },
          { get term() { return tr("more.howItWorksContent.below12Bpm"); }, get detail() { return tr("health.StressScreen.low"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.aWorkedExample"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.takeA36YearOldFinishingA"),
          tr("more.howItWorksContent.pulseLooksAtEveryPairOfReadings"),
          tr("more.howItWorksContent.heartRateRecoveryIs174Minus149"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.itNeedsDenseHeartRateAroundThe"),
        ]; },
      },
    ],
  },
  {
    slug: "hrv-status",
    get name() { return tr("health.HrvStatusCard.hrvStatus"); },
    get summary() { return tr("more.howItWorksContent.your7DayHrvAgainstYourUsual"); },
    href: "/health",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        get paragraphs() { return [tr("more.howItWorksContent.fitbitSNightlyHrvRmssdInMs")]; },
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.pulseAveragesTheNaturalLogOfYour"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.balanced"); }, get detail() { return tr("more.howItWorksContent.your7DayAverageIsInYour"); } },
          { get term() { return tr("more.howItWorksContent.unbalanced"); }, get detail() { return tr("more.howItWorksContent.aboveYourUsualRangeOrALittle"); } },
          { get term() { return tr("health.StressScreen.low"); }, get detail() { return tr("more.howItWorksContent.wellBelowYourUsualRangeOftenStrain"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.itNeeds21NightsOfHrvFirst"),
        ]; },
      },
    ],
  },
  {
    slug: "training-readiness",
    get name() { return tr("strain.TrainingCards.trainingReadiness"); },
    get summary() { return tr("more.howItWorksContent.howReadyYouAreForHardTraining"); },
    href: "/strain",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("queries.home.lastNightSSleep"); }, get detail() { return tr("more.howItWorksContent.sleepPerformance"); } },
          { get term() { return tr("queries.training.recoveryTime"); }, get detail() { return tr("more.howItWorksContent.hoursLeftBeforeYourNextHardSession"); } },
          { get term() { return tr("more.howItWorksContent.hrvStatus"); }, get detail() { return tr("more.howItWorksContent.balancedUnbalancedAboveOrBelowOrLow"); } },
          { get term() { return tr("queries.training.loadRatio"); }, get detail() { return tr("more.howItWorksContent.garminSAcuteAgainstChronicLoad"); } },
          { get term() { return tr("more.howItWorksContent.sleepHistory"); }, get detail() { return tr("more.howItWorksContent.sleepPerformanceOverTheLast3Nights"); } },
          { get term() { return tr("more.howItWorksContent.stressHistory"); }, get detail() { return tr("more.howItWorksContent.yourAverageAwakeStressOverTheLast"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.eachFactorIsScored0To100"),
          tr("more.howItWorksContent.readiness25Sleep25RecoveryTime15"),
          tr("more.howItWorksContent.recoveryTimeEachWorkoutAdds72Training"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { term: "95-100", get detail() { return tr("more.howItWorksContent.prime"); } },
          { term: "75-94", get detail() { return tr("more.howItWorksContent.high"); } },
          { term: "50-74", get detail() { return tr("more.howItWorksContent.moderate"); } },
          { term: "25-49", get detail() { return tr("health.StressScreen.low"); } },
          { term: "1-24", get detail() { return tr("queries.training.poor"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.garminPublishesTheFactorsThatSleepAnd"),
        ]; },
      },
    ],
  },
  {
    slug: "training-effect",
    get name() { return tr("strain.TrainingCards.trainingEffect"); },
    get summary() { return tr("more.howItWorksContent.howMuchAWorkoutImprovesYourAerobic"); },
    href: null,
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.heartRateInTheWorkout"); }, get detail() { return tr("more.howItWorksContent.asAShareOfYourHeartRate"); } },
          { get term() { return tr("health.dataCheckSummary.vo2Max"); }, get detail() { return tr("more.howItWorksContent.fitbitSOrAMeasuredOneFrom"); } },
          { get term() { return tr("more.howItWorksContent.yourTrainingBackground"); }, get detail() { return tr("more.howItWorksContent.anActivityClassFrom0To10"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.pulseEstimatesTheWorkoutSEpocThe"),
          tr("more.howItWorksContent.theMainBenefitComesFromTheEffect"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { term: "0-0.9", get detail() { return tr("more.howItWorksContent.noBenefit"); } },
          { term: "1.0-1.9", get detail() { return tr("more.howItWorksContent.minor"); } },
          { term: "2.0-2.9", get detail() { return tr("more.howItWorksContent.maintaining"); } },
          { term: "3.0-3.9", get detail() { return tr("more.howItWorksContent.improving"); } },
          { term: "4.0-4.9", get detail() { return tr("more.howItWorksContent.highlyImproving"); } },
          { term: "5.0", get detail() { return tr("more.howItWorksContent.overreaching"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.garminEstimatesEpocWithBeatToBeat"),
        ]; },
      },
    ],
  },
  {
    slug: "training-status",
    get name() { return tr("strain.TrainingCards.trainingStatus"); },
    get summary() { return tr("more.howItWorksContent.whatYourRecentTrainingIsDoingTo"); },
    href: "/strain",
    sections: [
      {
        get title() { return tr("more.howItWorksContent.whatGoesIn"); },
        rows: [
          { get term() { return tr("queries.training.loadRatio"); }, get detail() { return tr("more.howItWorksContent.garminSAcuteAgainstChronicLoadAnd"); } },
          { get term() { return tr("health.FitnessScreen.vo2MaxTrend"); }, get detail() { return tr("more.howItWorksContent.fitbitSVo2MaxOverTheLast"); } },
          { get term() { return tr("more.howItWorksContent.hrvStatus"); }, get detail() { return tr("more.howItWorksContent.todaySAndTheLast3Days"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.howItIsWeighted"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.rulesInOrderTheFirstThatFits"),
        ]; },
      },
      {
        get title() { return tr("more.howItWorksContent.whatTheBandsMean"); },
        rows: [
          { get term() { return tr("more.howItWorksContent.productivePeaking"); }, get detail() { return tr("more.howItWorksContent.trainingIsPayingOff"); } },
          { get term() { return tr("more.howItWorksContent.maintainingRecovery"); }, get detail() { return tr("more.howItWorksContent.holdingFitnessOrRecoveringForMore"); } },
          { get term() { return tr("more.howItWorksContent.unproductiveStrainedDetraining"); }, get detail() { return tr("more.howItWorksContent.somethingIsOffRecoveryOrTooLittle"); } },
          { get term() { return tr("more.howItWorksContent.overreaching"); }, get detail() { return tr("more.howItWorksContent.loadIsHighEnoughToCostYou"); } },
        ],
      },
      {
        get title() { return tr("more.howItWorksContent.limits"); },
        get paragraphs() { return [
          tr("more.howItWorksContent.itNeedsAbout3WeeksOfTraining"),
        ]; },
      },
    ],
  },
]
