import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Info-card copy for the screens (spec §7.2, §7.3, §7.5, §7.15). Final copy: do not reword. The three score cards
// end with SOURCE_NOTE. Ported from pulse src/app/(app)/_lib/info.tsx: the words are the web's; <P>
// is a paragraph <Text> styled as the info card's body, the swatch rows are Views.
import type { ReactNode } from "react"
import { View } from "react-native"
import { Text } from "@/ui/Text"
import type { InfoContent } from "@/ui/shells/InfoButton"

/** A paragraph of an info card's body (the web card's 15/22 text). */
function P({ children }: { children: ReactNode }) {
  useLanguage();
  return <Text className="text-[15px] leading-[22px] text-foreground-body">{children}</Text>
}

function Rows({ rows }: { rows: [swatch: string | null, text: string][] }) {
  useLanguage();
  return (
    <View className="gap-2">
      {rows.map(([swatch, text]) => (
        <View key={text} className="flex-row items-start gap-2.5">
          {swatch && <View accessibilityElementsHidden className={`mt-1.5 size-2.5 shrink-0 rounded-sm ${swatch}`} />}
          <View className="flex-1"><P>{text}</P></View>
        </View>
      ))}
    </View>
  )
}

/** Under each score's explainer: these are Pulse's own scores, not the reference app's (brand guidelines audit). */
const renderSourceNote = () => <Text className="text-[13px] leading-[18px] text-muted-foreground">{tr("info.pulseScoresComputedFromYourFitbitData")}</Text>

export const RECOVERY_INFO: InfoContent = {
  get title() { return tr("info.howRecoveryWorks"); },
  get body() { return (
    <>
      <P>
        {tr("info.recoveryShowsHowReadyYourBodyIs")}{"\u00a0"}{tr("info.daysBreathingFasterThanUsualOrRunning")}</P>
      <Rows
        rows={[
          ["bg-recovery-green", tr("info.green67100YourBodyIsPrimed")],
          ["bg-recovery-yellow", tr("info.yellow3466YouAreMaintainingModerate")],
          ["bg-recovery-red", tr("info.red133YourBodyNeedsRest")],
        ]}
      />
      <P>
        {tr("info.recoveryShowsFromYourSecondNightAnd")}{"\u00a0"}{tr("info.daysANightWithoutHrvHeartRate")}</P>
      {renderSourceNote()}
    </>
  ); },
}

export const STRAIN_INFO: InfoContent = {
  get title() { return tr("info.howStrainWorks"); },
  get body() { return (
    <>
      <P>
        {tr("info.strainIsTheLoadOfYourDay")}</P>
      <Rows
        rows={[
          [null, tr("info.lightUpTo40")],
          [null, tr("info.moderate4160")],
          [null, tr("info.strenuous6179")],
          [null, tr("info.allOut80AndAbove")],
        ]}
      />
      <P>
        {tr("info.yourStrainTargetIsARangeFor")}</P>
      {renderSourceNote()}
    </>
  ); },
}

export const STRAIN_TARGET_INFO: InfoContent = {
  get title() { return tr("info.strainTarget"); },
  get body() { return (
    <P>
      {tr("info.yourStrainTargetIsARangeFor_a656f6")}{"\u00a0"}{tr("info.daysInsideItTrainingBuildsFitnessWithout")}</P>
  ); },
}

export const SLEEP_INFO: InfoContent = {
  get title() { return tr("info.howSleepWorks"); },
  get body() { return (
    <>
      <P>
        {tr("info.sleepPerformanceScoresLastNightAgainstYour")}</P>
      <P>
        {tr("info.sleepDebtComesFromTheLast7")}{"\u00a0"}{tr("info.daysSleepNapsIncludedAgainst75")}{"\u00a0"}{tr("info.hoursEachRecentNightsCountingMostSleep")}</P>
      {renderSourceNote()}
    </>
  ); },
}

export const TONIGHT_INFO: InfoContent = {
  get title() { return tr("info.tonightSSleep"); },
  get body() { return (
    <P>
      {tr("info.bedtimesAreWorkedBackFromYourTypical")}</P>
  ); },
}

export const ENERGY_INFO: InfoContent = {
  get title() { return tr("queries.chart.energyBank"); },
  get body() { return (
    <>
      <P>
        {tr("info.energyBankEstimatesHowMuchEnergyYou")}</P>
      <Rows
        rows={[
          ["bg-recovery-green", tr("info.67100PlentyInReserve")],
          ["bg-recovery-yellow", tr("info.3466PaceYourself")],
          ["bg-recovery-red", tr("info.133RunningLow")],
        ]}
      />
    </>
  ); },
}

export const STRAIN_RECOVERY_INFO: InfoContent = {
  get title() { return tr("info.strainRecovery"); },
  get body() { return (
    <>
      <P>{tr("info.yourLast7")}{"\u00a0"}{tr("info.daysSideBySideDayStrainIn")}</P>
      <P>{tr("info.highStrainOnOneDayOftenShows")}</P>
    </>
  ); },
}

/** "Add activity" (Home's card button and the "+" menu): Pulse imports workouts, so this explains where they come from (§11 R2). */
export const ADD_ACTIVITY_INFO: InfoContent = {
  get title() { return tr("info.addAnActivity"); },
  get body() { return (
    <>
      <P>{tr("info.pulseReadsYourWorkoutsFromFitbitThrough")}</P>
      <P>{tr("info.startOrLogTheWorkoutInThe")}</P>
    </>
  ); },
}
