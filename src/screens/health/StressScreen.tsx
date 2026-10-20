import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Stress Monitor `/health/stress` for `d` (spec §7.9). Ported from pulse src/app/(app)/health/stress/page.tsx and
// loading.tsx (the skeleton shows while the query runs).
import { View } from "react-native";
import { clock, dayLabel, durationWords, hmm } from "@/lib/format";
import { getStress } from "@/queries/health";
import type { StressVM } from "@/queries/types";
import { StressChart, StressChartSkeleton } from "@/ui/charts/StressChart";
import { TrendChart, TrendChartSkeleton } from "@/ui/charts/TrendChart";
import { cn } from "@/ui/cn";
import { InsightCard, InsightCardSkeleton } from "@/ui/metrics/InsightCard";
import { ScoreDial, ScoreDialSkeleton } from "@/ui/metrics/ScoreDial";
import { DetailShell } from "@/ui/shells/DetailShell";
import { EmptyState } from "@/ui/shells/EmptyState";
import { MetricState } from "@/ui/shells/MetricState";
import { SectionShell } from "@/ui/shells/SectionShell";
import { Skeleton, SkeletonText } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";
import { stressSeries } from "../_lib/view";
import { useDayScreen } from "./day";
import { ErrorView } from "./ErrorView";
import { BreatheCard } from "../breathe/BreatheScreen";
import { STRESS_INFO } from "./info";

const emptyStress = () => tr("health.StressScreen.noStressScoredYetToday");
const LABEL = "text-xs font-bold uppercase leading-4 tracking-[0.1em]";

const LEVEL_KEYS = [
  { key: "lowMin", get word() { return tr("health.StressScreen.low"); }, bar: "bg-stress-low", text: "text-stress-low-text" },
  { key: "mediumMin", get word() { return tr("health.StressScreen.medium"); }, bar: "bg-stress-medium", text: "text-stress-medium-text" },
  { key: "highMin", get word() { return tr("health.StressScreen.high"); }, bar: "bg-stress-high", text: "text-stress-high-text" },
] as const;

function LevelBar({ m, className }: { m: { lowMin: number; mediumMin: number; highMin: number }; className: string }) {
  useLanguage();
  return (
    <View accessibilityElementsHidden className={cn("flex-row gap-0.5 overflow-hidden rounded-sm", className)}>
      {LEVEL_KEYS.map((k) => m[k.key] > 0 && <View key={k.key} className={k.bar} style={{ flexGrow: m[k.key], flexBasis: 0 }} />)}
    </View>
  );
}

function typicalLine(l: NonNullable<StressVM["levels"]["value"]>) {
  if (l.typicalDeltaMin === null) return null;
  const m = Math.round(l.typicalDeltaMin);
  const delta = Math.abs(m) < 1 ? tr("health.StressScreen.aboutTheSameHighStress") : tr(m > 0 ? "health.stress.more" : "health.stress.less", { duration: durationWords(Math.abs(m)) });
  return tr("health.StressScreen.vsYourTypical", { v0: l.weekday, v1: delta });
}

function TotalDay({ l, day }: { l: NonNullable<StressVM["levels"]["value"]>; day: string }) {
  useLanguage();
  const total = l.lowMin + l.mediumMin + l.highMin;
  if (!total) return <EmptyState body={emptyStress()} />;
  const line = typicalLine(l);
  return (
    <View className="gap-4">
      <Text className={LABEL}>
        {tr("stress.day", { day })}{l.typical && <Text className="text-muted-foreground"> {tr("health.StressScreen.vsTypical")}{l.weekday}</Text>}
      </Text>
      <View className="gap-1.5">
        <LevelBar m={l} className="h-3" />
        {l.typical && <LevelBar m={l.typical} className="h-2 opacity-50" />}
      </View>
      <View className="flex-row gap-3">
        {LEVEL_KEYS.map((k) => (
          <View key={k.key} accessible accessibilityLabel={`${k.word}: ${durationWords(Math.round(l[k.key]))}${l.typical ? tr("health.StressScreen.typical", { v0: durationWords(Math.round(l.typical[k.key])) }) : ""}`} className="flex-1">
            <Text accessibilityElementsHidden className={cn("font-numeric text-xl font-bold leading-6 tabular-nums", k.text)}>
              {hmm(l[k.key])}
            </Text>
            <Text accessibilityElementsHidden className={cn(LABEL, "mt-1")}>
              {k.word}
            </Text>
            {l.typical && (
              <Text accessibilityElementsHidden className="mt-0.5 font-numeric text-xs font-medium leading-4 tabular-nums text-muted-foreground">
                {hmm(l.typical[k.key])} {tr("health.StressScreen.typical_80fbd2")}</Text>
            )}
          </View>
        ))}
      </View>
      {line && <Text className="text-xs font-medium leading-4 text-muted-foreground">{line}</Text>}
    </View>
  );
}

export function StressScreen() {
  useLanguage();
  const { data, error, reload } = useDayScreen("stress", getStress);
  if (!data) return error ? <ErrorView detail retry={reload} /> : <StressLoading />;
  const { vm, d, today, timeZone } = data;
  const g = vm.gauge;
  const dayWord = vm.isToday ? tr("common.today") : dayLabel(d, today);

  return (
    <DetailShell
      title={tr("lib.dashboard.stressMonitor")}
      bodySkeleton={renderBodySkeleton()}
      dateSwitcher={{ mode: "day" }}
      info={STRESS_INFO}
      hero={
        <View className="items-center gap-2">
          <ScoreDial
            variant="gauge"
            size="lg"
            value={g.value?.value ?? null}
            reason={g.reason}
            provisional={g.provisional}
            caption={g.value ? (g.value.dayAverage || !vm.isToday ? tr("chart.model.dayAverage") : g.value.at ? tr("health.StressScreen.lastUpdated", { v0: clock(g.value.at, timeZone) }) : undefined) : undefined}
          />
          {g.reason === "no_data" && <Text className="max-w-72 text-center text-xs font-medium leading-4 text-muted-foreground">{emptyStress()}</Text>}
        </View>
      }
      insight={vm.insight ? <InsightCard body={vm.insight} /> : undefined}
      primary={
        <SectionShell variant="card" title={dayWord} info={{ title: tr("health.StressScreen.stressThroughoutTheDay"), body: tr("health.StressScreen.bodyActivationEvery6MinutesFrom0") }}>
          <StressChart variant="full" data={stressSeries(vm.chart)} />
        </SectionShell>
      }
      secondary={[
        <SectionShell key="levels" variant="card" title={tr("health.StressScreen.totalDay")} info={{ title: tr("health.StressScreen.timeAtEachStressLevel"), body: tr("health.StressScreen.scoredTimeOutsideWorkoutsSplitIntoLow") }}>
          <MetricState metric={vm.levels} skeleton={<Skeleton className="h-24 w-full" />} renderReason={() => <EmptyState body={emptyStress()} />}>
            {(l) => <TotalDay l={l} day={dayWord} />}
          </MetricState>
        </SectionShell>,
        <BreatheCard key="breathe" />,
        <SectionShell key="trend" variant="card" title={tr("health.StressScreen.30DayTrend")} info={{ title: tr("health.StressScreen.dailyStressTrend"), body: tr("health.StressScreen.averageActivationAcrossEachDaySScored") }}>
          <TrendChart label="Stress" data={{ value: vm.trend.points.map((p) => ({ date: p.day, value: p.value })), reason: null, provisional: false }} format="int" colorBy="stress" direction="down" fixedRange="m" />
        </SectionShell>,
      ]}
    />
  );
}

const renderLoadingPrimary = () => (
  <SectionShell variant="card" title={tr("common.today")}>
    <StressChartSkeleton variant="full" />
  </SectionShell>
);

const renderLoadingSecondary = () => [
  <SectionShell key="levels" variant="card" title={tr("health.StressScreen.totalDay")}>
    <View accessibilityElementsHidden className="gap-4">
      <SkeletonText className="w-48" />
      <View className="gap-1.5">
        <Skeleton className="h-3 rounded-sm" />
        <Skeleton className="h-2 rounded-sm" />
      </View>
      <View className="flex-row gap-3">
        {[tr("health.StressScreen.low"), tr("health.StressScreen.medium"), tr("health.StressScreen.high")].map((w) => (
          <View key={w} className="flex-1">
            <SkeletonText lh={24} fs={20} className="w-[42px]" />
            <Text className={cn(LABEL, "mt-1")}>{w}</Text>
            <SkeletonText className="mt-0.5 w-20" />
          </View>
        ))}
      </View>
      <SkeletonText className="w-56" />
    </View>
  </SectionShell>,
  <SectionShell key="trend" variant="card" title={tr("health.StressScreen.30DayTrend")}>
    <TrendChartSkeleton />
  </SectionShell>,
];

/** Below the fold while a cold push slides in: the loading state's first sections. */
const renderBodySkeleton = () => (
  <>
    {renderLoadingPrimary()}
    <View className="gap-3">{renderLoadingSecondary().slice(0, 2)}</View>
  </>
);

/**
 * Stress Monitor loading (spec §7.9, §5.19): the date row, the gauge with the insight, the day's chart, then Total day
 * and the 30-day trend.
 */
function StressLoading() {
  useLanguage();
  return (
    <DetailShell
      loading
      title={tr("lib.dashboard.stressMonitor")}
      dateSwitcher={{ mode: "day" }}
      hero={<ScoreDialSkeleton variant="gauge" size="lg" />}
      insight={<InsightCardSkeleton />}
      primary={renderLoadingPrimary()}
      bodySkeleton={renderBodySkeleton()}
      secondary={renderLoadingSecondary()}
    />
  );
}
