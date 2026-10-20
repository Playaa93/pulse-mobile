import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Fitness `/health/fitness` (spec §7.10): latest values, no date switcher. Ported from pulse
// src/app/(app)/health/fitness/page.tsx and loading.tsx (the skeleton shows while the query runs).
import { View } from "react-native";
import { DAY, formatDay, formatValue } from "@/lib/format";
import { getFitness } from "@/queries/health";
import type { FitnessVM } from "@/queries/types";
import { TrendChart, TrendChartSkeleton } from "@/ui/charts/TrendChart";
import { cn } from "@/ui/cn";
import { CAPTION, LABEL, StatusChip, ValueUnit } from "@/ui/metrics/primitives";
import { ReasonPlaceholder } from "@/ui/metrics/ReasonPlaceholder";
import { TickScale, TickScaleSkeleton } from "@/ui/metrics/TickScale";
import { DetailShell } from "@/ui/shells/DetailShell";
import { EmptyState } from "@/ui/shells/EmptyState";
import { SectionShell } from "@/ui/shells/SectionShell";
import { Skeleton, SkeletonText } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";
import { useScreen } from "../useScreen";
import { ErrorView } from "./ErrorView";
import { categoryTone, categoryWord, ordinal } from "./format";
import { FITNESS_INFO } from "./info";
import { LoadChart } from "./LoadChart";

const BODY = "text-[15px] leading-[22px] text-foreground-secondary";
// The engine's load status calibrates until its confidence reaches 0.35 (loadConfidence: active days in 42, recent ones).
const noLoad = () => tr("health.FitnessScreen.trainingLoadNeedsWorkoutsOnAbout10");
const noFfs = () => tr("health.FitnessScreen.fitnessFatigueAndFormNeedWorkoutsWith");

const STATUS: Record<NonNullable<FitnessVM["trainingLoad"]["value"]>["status"], { word: string; body: string }> = {
  detraining: { get word() { return tr("health.FitnessScreen.detraining"); }, get body() { return tr("health.FitnessScreen.detrainingYourRecentLoadIsBelowYour"); } },
  optimal: { get word() { return tr("queries.trendView.optimal"); }, get body() { return tr("health.FitnessScreen.optimalYourRecentLoadMatchesWhatYou"); } },
  pushing: { get word() { return tr("health.FitnessScreen.pushing"); }, get body() { return tr("health.FitnessScreen.pushingLoadIsAboveYourUsualWhile"); } },
  high_risk: { get word() { return tr("health.FitnessScreen.highRisk"); }, get body() { return tr("health.FitnessScreen.highRiskLoadJumpedWellAboveYour"); } },
};
const categoryLabels = () => [tr("queries.training.poor"), tr("health.FitnessScreen.fair"), tr("health.FitnessScreen.good"), tr("health.FitnessScreen.excellent"), tr("health.FitnessScreen.superior")];

function Hero({ vo2 }: { vo2: FitnessVM["vo2"] }) {
  useLanguage();
  const v = vo2.value;
  if (!v) return <EmptyState body={tr("health.FitnessScreen.noVo2MaxYetFitbitEstimatesIt")} />;
  return (
    <View className="items-center gap-2 py-4">
      <ValueUnit value={formatValue("decimal1", v.value)} unit="ml/kg/min" className="text-center font-numeric text-[64px] font-bold leading-[64px] tracking-[-0.01em]" />
      <View className="flex-row items-center gap-3">
        <Text className={LABEL}>{tr("health.dataCheckSummary.vo2Max")}</Text>
        <Text className={cn(LABEL, categoryTone(v.category))}>{categoryWord(v.category)}</Text>
      </View>
      <Text className={CAPTION}>{v.source === "run" ? tr("health.FitnessScreen.fromARunOn", { v0: formatDay(v.sourceDay, DAY.monthDay) }) : tr("health.FitnessScreen.dailyEstimateFromFitbit")}</Text>
    </View>
  );
}

export function FitnessScreen() {
  useLanguage();
  const { data: vm, error, reload } = useScreen((ctx) => getFitness(ctx), ["fitness"]);
  if (!vm) return error ? <ErrorView detail retry={reload} /> : <FitnessLoading />;
  const v = vm.vo2.value;
  const tl = vm.trainingLoad.value;

  return (
    <DetailShell
      title={tr("health.FirstAge.fitness")}
      bodySkeleton={bodySkeleton()}
      info={FITNESS_INFO}
      hero={<Hero vo2={vm.vo2} />}
      summary={
        v && (
          <SectionShell variant="card" title={tr("health.FitnessScreen.percentile")}>
            <TickScale
              variant="marker"
              label={tr("health.FitnessScreen.vo2MaxPercentile")}
              metric={{ value: v.percentile, reason: null, provisional: false }}
              min={0}
              max={100}
              format="int"
              describe={tr("health.FitnessScreen.for", { v0: categoryWord(v.category), v1: v.sex === "male" ? tr("health.fitness.men") : tr("health.fitness.women"), v2: v.ageBand })}
              bands={[
                { from: 0, to: 39.9, tone: "warning" },
                { from: 60, to: 100, tone: "optimal" },
              ]}
              ends={["0", "50", "100"]}
            />
            <View accessibilityElementsHidden className="mt-2 flex-row">
              {categoryLabels().map((c) => (
                <Text key={c} numberOfLines={1} className={cn(CAPTION, "flex-1 text-center", c === categoryWord(v.category) && "font-bold text-foreground")}>
                  {c}
                </Text>
              ))}
            </View>
            <Text className={cn(CAPTION, "mt-3")}>
              {tr("health.fitness.percentile", { rank: ordinal(v.percentile), sex: v.sex === "male" ? tr("health.fitness.men") : tr("health.fitness.women"), ageBand: v.ageBand })}
            </Text>
          </SectionShell>
        )
      }
      primary={
        <SectionShell variant="card" title={tr("health.FitnessScreen.vo2MaxTrend")}>
          <TrendChart label={tr("health.dataCheckSummary.vo2Max")} data={{ value: vm.trend.points.map((p) => ({ date: p.day, value: p.value })), reason: null, provisional: false }} unit="ml/kg/min" format="decimal1" colorBy="single" direction="up" defaultRange="6m" />
        </SectionShell>
      }
      secondary={[
        <SectionShell key="load" variant="card" title={tr("health.FitnessScreen.trainingLoad")}>
          {tl ? (
            <View className="gap-4">
              <View className="flex-row items-center gap-3">
                <Text className="font-numeric text-4xl font-bold leading-10 tracking-[-0.01em] tabular-nums">{formatValue("decimal2", tl.acwr)}</Text>
                <StatusChip tone={tl.tone} className="self-center">{STATUS[tl.status].word}</StatusChip>
              </View>
              <TickScale
                variant="marker"
                label={tr("health.FitnessScreen.trainingLoad")}
                metric={vm.trainingLoad.value ? { value: tl.acwr, reason: null, provisional: false } : null}
                min={0.5}
                max={2}
                format="decimal2"
                bands={[
                  { from: 0.8, to: 1.3, tone: "optimal" },
                  { from: 1.5, to: 2, tone: "warning" },
                ]}
                ends={["0.5", "1.0", "1.5", "2.0"]}
              />
              <Text className={BODY}>{STATUS[tl.status].body}</Text>
            </View>
          ) : (
            <ReasonPlaceholder reason="calibrating" size="md" copy={noLoad()} />
          )}
        </SectionShell>,
        <SectionShell key="ffs" variant="card" title={tr("health.FitnessScreen.fitnessFatigueAndForm")}>
          {vm.loadReason ? (
            <ReasonPlaceholder reason={vm.loadReason.reason} size="md" copy={noFfs()} />
          ) : (
            <>
              <LoadChart load={vm.load} />
              <Text className={cn(CAPTION, "mt-2")}>{tr("health.FitnessScreen.fitnessIsYour42DayLoadFatigue")}</Text>
            </>
          )}
        </SectionShell>,
      ]}
    />
  );
}

const loadingPrimary = () => (
  <SectionShell variant="card" title={tr("health.FitnessScreen.vo2MaxTrend")}>
    <TrendChartSkeleton />
  </SectionShell>
);

const loadingSecondary = () => [
  <SectionShell key="load" variant="card" title={tr("health.FitnessScreen.trainingLoad")}>
    <View accessibilityElementsHidden className="gap-4">
      <View className="flex-row items-center gap-3">
        <SkeletonText lh={40} fs={36} className="w-[75px]" />
        <Skeleton className="h-6 w-20 rounded-md" />
      </View>
      <TickScaleSkeleton variant="marker" />
      <View>
        <SkeletonText lh={22} fs={15} className="w-full" />
        <SkeletonText lh={22} fs={15} className="w-1/2" />
      </View>
    </View>
  </SectionShell>,
  <SectionShell key="ffs" variant="card" title={tr("health.FitnessScreen.fitnessFatigueAndForm")}>
    <View accessibilityElementsHidden>
      <Skeleton className="h-[220px] rounded-lg bg-skeleton" />
      <Text className={cn(CAPTION, "mt-2")}>{tr("health.FitnessScreen.fitnessIsYour42DayLoadFatigue")}</Text>
    </View>
  </SectionShell>,
];

/** Below the fold while a cold push slides in: the loading state's first sections. */
const bodySkeleton = () => (
  <>
    {loadingPrimary()}
    <View className="gap-3">{loadingSecondary().slice(0, 2)}</View>
  </>
);

/** Fitness loading (spec §7.10, §5.19): no date row; the VO2 max hero with Percentile, the VO2 max trend, then Training load and Fitness, fatigue and form. */
function FitnessLoading() {
  useLanguage();
  return (
    <DetailShell
      loading
      title={tr("health.FirstAge.fitness")}
      hero={
        <View accessibilityElementsHidden className="items-center gap-2 py-4">
          <SkeletonText lh={64} fs={64} className="w-[133px]" />
          <View className="flex-row items-center gap-3">
            <Text className={LABEL}>{tr("health.dataCheckSummary.vo2Max")}</Text>
            <SkeletonText className="w-16" />
          </View>
          <SkeletonText className="w-32" />
        </View>
      }
      summary={
        <SectionShell variant="card" title={tr("health.FitnessScreen.percentile")}>
          <View accessibilityElementsHidden>
            <TickScaleSkeleton variant="marker" />
            <View className="mt-2 flex-row">
              {categoryLabels().map((c) => (
                <Text key={c} numberOfLines={1} className={cn(CAPTION, "flex-1 text-center")}>
                  {c}
                </Text>
              ))}
            </View>
            <SkeletonText className="mt-3 w-64" />
          </View>
        </SectionShell>
      }
      primary={loadingPrimary()}
      bodySkeleton={bodySkeleton()}
      secondary={loadingSecondary()}
    />
  );
}
