import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// The Health screens' info-card copy, from pulse's pages, reworded for the Pulse engine. The web's <p> is a <Text> styled as
// the info card's body (the same as src/screens/_lib/info.tsx's, which does not export it).
import type { ReactNode } from "react";
import { View } from "react-native";
import { AGE_LABEL } from "@/lib/format";
import { Text } from "@/ui/Text";
import type { InfoContent } from "@/ui/shells/InfoButton";

function P({ children }: { children: ReactNode }) {
  useLanguage();
  return <Text className="text-[15px] leading-[22px] text-foreground-body">{children}</Text>;
}

export const MONITOR_INFO: InfoContent = {
  get title() { return tr("health.info.aboutHealthMonitor"); },
  get body() { return (
    <P>
      {tr("health.info.healthMonitorComparesLastNightSVitals")}</P>
  ); },
};

const LEVELS = [
  { swatch: "bg-stress-low", get text() { return tr("health.info.low029YouMightBeFeeling"); } },
  { swatch: "bg-stress-medium", get text() { return tr("health.info.medium3059NeutralAlertOrMildly"); } },
  { swatch: "bg-stress-high", get text() { return tr("health.info.high60100ExcitedStressedOrHighly"); } },
];

export const STRESS_INFO: InfoContent = {
  get title() { return tr("health.info.aboutStressMonitor"); },
  get body() { return (
    <>
      <P>{tr("health.info.stressMonitorScoresHowActivatedYourBody")}</P>
      <View className="gap-2">
        {LEVELS.map((l) => (
          <View key={l.swatch} className="flex-row items-start gap-3">
            <View accessibilityElementsHidden className={`mt-1.5 size-2.5 shrink-0 rounded-sm ${l.swatch}`} />
            <View className="flex-1">
              <P>{l.text}</P>
            </View>
          </View>
        ))}
      </View>
      <P>{tr("health.info.workoutsAndExerciseAreLeftOutSo")}</P>
    </>
  ); },
};

export const FITNESS_INFO: InfoContent = {
  get title() { return tr("health.info.aboutFitness"); },
  get body() { return (
    <P>
      {tr("health.info.vo2MaxIsTheMostOxygenYour")}</P>
  ); },
};

export const HEALTHSPAN_INFO: InfoContent = {
  get title() { return tr("health.info.aboutHealthspan"); },
  get body() { return (
    <P>
      {AGE_LABEL} {tr("health.info.estimatesHowOldYourBodyBehavesFrom")}{AGE_LABEL} {tr("health.info.dividedByYourAge10xMeans")}</P>
  ); },
};

export const HEART_RATE_INFO: InfoContent = {
  get title() { return tr("health.info.aboutHeartRate"); },
  get body() { return (
    <>
      <P>{tr("health.info.yourBandRecordsHeartRateThroughThe")}</P>
      <P>{tr("health.info.whileThisScreenIsOpenOnToday")}</P>
      <P>{tr("health.info.theChartShowsEachMinuteSAverage")}</P>
    </>
  ); },
};
