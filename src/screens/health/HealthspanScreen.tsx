import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Healthspan `/health/healthspan?d=` (spec §7.7): the ISO week containing `d`. Ported from pulse
// src/app/(app)/health/healthspan/page.tsx and loading.tsx (the skeleton shows while the query runs).
import { View } from "react-native";
import { AGE_LABEL, formatValue, MISSING } from "@/lib/format";
import { getHealthspan } from "@/queries/health";
import type { HealthspanVM } from "@/queries/types";
import { TrendChart, TrendChartSkeleton } from "@/ui/charts/TrendChart";
import { cn } from "@/ui/cn";
import { ContributorRowSkeleton } from "@/ui/metrics/ContributorRow";
import { InsightCard, InsightCardSkeleton } from "@/ui/metrics/InsightCard";
import { CAPTION } from "@/ui/metrics/primitives";
import { TickScale, TickScaleSkeleton } from "@/ui/metrics/TickScale";
import { DetailShell } from "@/ui/shells/DetailShell";
import { EmptyState } from "@/ui/shells/EmptyState";
import { SectionShell } from "@/ui/shells/SectionShell";
import { useNarrow } from "@/ui/shells/layout";
import { SkeletonText } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";
import { AgeOrb } from "./AgeOrb";
import { ContributorCard } from "./ContributorCard";
import { useDayScreen } from "./day";
import { ErrorView } from "./ErrorView";
import { FirstAge } from "./FirstAge";
import { HEALTHSPAN_INFO } from "./info";
import { renderFast, renderSlow } from "./pace";

/** The one glow in the app (spec §2.6, docs/design/orb.md): the Pulse Age orb. `compact`: the collapsed header's 108 px orb. */
function Orb({ vm, compact }: { vm: HealthspanVM; compact?: boolean }) {
  useLanguage();
  const r = vm.result.value;
  if (compact)
    // Hangs 8 px below the stats' centre line, about 30 px past the band, as in [latest-healthspan-collapsed-2].
    return (
      <View style={{ transform: [{ translateY: 8 }] }}>
        <AgeOrb compact age={r?.pulseAge ?? null} deltaYears={r?.deltaYears ?? null} reason={vm.result.reason} />
      </View>
    );
  return (
    <View className="items-center gap-3">
      <AgeOrb age={r?.pulseAge ?? null} deltaYears={r?.deltaYears ?? null} provisional={vm.result.provisional} reason={vm.result.reason} size={300} />
      <Text className={cn(CAPTION, "text-center tabular-nums")}>{r ? tr("health.HealthspanScreen.yourAge", { v0: formatValue("decimal1", vm.age) }) : tr("health.HealthScreen.pulseAgeNeedsAtLeast5Of")}</Text>
      {r && vm.result.provisional && <Text className={cn(CAPTION, "text-center")}>{tr("health.HealthspanScreen.pulseAgeFirmsUpAsMoreOf")}</Text>}
    </View>
  );
}

export function HealthspanScreen() {
  useLanguage();
  const { data, error, reload } = useDayScreen("healthspan", getHealthspan);
  if (!data) return error ? <ErrorView detail retry={reload} /> : <HealthspanLoading />;
  const { vm } = data;
  const r = vm.result.value;
  // halo leaves Pace of Aging out until 21 of the last 31 days have a Recovery: calibrating until then.
  const pace = r && r.pace !== null ? { value: r.pace, reason: null, provisional: r.paceProvisional } : { value: null, reason: r ? ("calibrating" as const) : vm.result.reason, provisional: false };
  const hasHistory = vm.history.some((p) => p.value !== null);
  const group = (g: "sleep" | "strain" | "fitness") => vm.contributors.filter((c) => c.group === g);
  const n = vm.nextUpdateInDays;
  // Collapsed header stats ([latest-healthspan-collapsed-1..5]): years younger in green, older in amber; pace in white.
  const older = !!r && r.deltaYears > 0;
  const stats = {
    left: {
      value: r ? formatValue("decimal1", Math.abs(r.deltaYears)) : MISSING,
      label: older ? tr("health.HealthspanScreen.yearsOlder") : tr("health.HealthspanScreen.yearsYounger"),
      tone: r ? (older ? "warning" : "optimal") : undefined,
    },
    right: { value: r && r.pace !== null ? `${formatValue("decimal1", r.pace)}x` : MISSING, label: tr("health.HealthspanScreen.paceOfAging") },
  } as const;

  return (
    <DetailShell
      title={tr("health.HealthScreen.healthspan")}
      bodySkeleton={renderBodySkeleton()}
      subtitle={n > 0 ? tr("health.nextUpdate", { count: n }) : undefined}
      dateSwitcher={{ mode: "week" }}
      info={HEALTHSPAN_INFO}
      ground="healthspan"
      hero={<Orb vm={vm} />}
      stats={stats}
      collapse
      summary={
        // No Pulse Age yet: what it is waiting for, in place of an empty Pace of Aging.
        !r ? (
          <FirstAge vm={vm} />
        ) : (
          <SectionShell variant="card" title={tr("health.HealthScreen.paceOfAging")}>
            <TickScale
              variant="marker"
              label={tr("health.HealthScreen.paceOfAging")}
              metric={pace}
              min={-1}
              max={3}
              format="decimal1"
              unit="x"
              describe={r && r.pace !== null ? (r.pace < 1 ? tr("health.HealthScreen.youngerThanYourAge") : r.pace > 1 ? tr("health.HealthScreen.olderThanYourAge") : tr("health.HealthScreen.agingAtTheNormalRate")) : undefined}
              ends={["−1.0x", "1.0x", "3.0x"]}
              leading={renderSlow()}
              trailing={renderFast()}
            />
            <Text className={cn(CAPTION, "mt-3")}>
              {r?.paceProvisional ? tr("health.HealthspanScreen.paceOfAgingUsesA6Month") : tr("health.HealthspanScreen.comparesYourLast30DaysWithYour")}
            </Text>
          </SectionShell>
        )
      }
      insight={vm.insight ? <InsightCard title={vm.insight.title} body={vm.insight.body} /> : undefined}
      primary={
        <SectionShell variant="card" title={tr("health.HealthspanScreen.history", { v0: AGE_LABEL })}>
          {hasHistory ? (
            <TrendChart
              label={AGE_LABEL}
              data={{ value: vm.history.map((p) => ({ date: p.day, value: p.value })), reason: null, provisional: false }}
              format="decimal1"
              colorBy="single"
              fixedRange="6m"
              reference={{ y: vm.age, label: tr("health.HealthspanScreen.yourAge_9b974c") }}
            />
          ) : (
            <EmptyState body={tr("health.HealthspanScreen.historyBuildsOneWeekAtATime")} />
          )}
        </SectionShell>
      }
      secondary={[
        <ContributorCard key="sleep" title={tr("ui.shells.HomeHeader.sleep")} items={group("sleep")} />,
        <ContributorCard key="strain" title={tr("ui.shells.HomeHeader.strain")} items={group("strain")} />,
        <ContributorCard key="fitness" title={tr("health.FirstAge.fitness")} items={group("fitness")} />,
      ]}
    />
  );
}

/** A contributor card: `n` healthspan rows, as ContributorCard lays them out. */
function Contributors({ title, n }: { title: string; n: number }) {
  useLanguage();
  return (
    <SectionShell variant="card" title={title} fill>
      <View>
        {Array.from({ length: n }, (_, i) => (
          <View key={i} className={cn(i > 0 && "border-t border-border")}>
            <ContributorRowSkeleton variant="healthspan" />
          </View>
        ))}
      </View>
    </SectionShell>
  );
}

const renderLoadingPrimary = () => (
  <SectionShell variant="card" title={tr("health.HealthspanScreen.history", { v0: AGE_LABEL })}>
    <TrendChartSkeleton />
  </SectionShell>
);

const renderLoadingSecondary = () => [
  <Contributors key="sleep" title={tr("ui.shells.HomeHeader.sleep")} n={2} />, <Contributors key="strain" title={tr("ui.shells.HomeHeader.strain")} n={4} />, <Contributors key="fitness" title={tr("health.FirstAge.fitness")} n={3} />,
];

/** Below the fold while a cold push slides in: the loading state's first sections. */
const renderBodySkeleton = () => (
  <>
    {renderLoadingPrimary()}
    <View className="gap-3">{renderLoadingSecondary().slice(0, 2)}</View>
  </>
);

/**
 * Healthspan loading (spec §7.7, §5.19): the week row, the 300 px orb as its rim, Pace of Aging, the insight, Pulse Age
 * history, then the Sleep (2), Strain (4) and Fitness (3) contributors.
 */
function HealthspanLoading() {
  useLanguage();
  // The orb's own cap (AgeOrb): never wider than the page column.
  const orb = Math.min(300, useNarrow().width - 32);
  return (
    <DetailShell
      loading
      title={tr("health.HealthScreen.healthspan")}
      dateSwitcher={{ mode: "week" }}
      ground="healthspan"
      hero={
        <View accessibilityElementsHidden className="items-center gap-3">
          <View className="items-center justify-center rounded-full border-2 border-dial-track" style={{ width: orb, height: orb }}>
            <SkeletonText lh={56} fs={56} className="w-[116px]" />
          </View>
          <SkeletonText className="w-24" />
        </View>
      }
      summary={
        <SectionShell variant="card" title={tr("health.HealthScreen.paceOfAging")}>
          <View accessibilityElementsHidden>
            <TickScaleSkeleton variant="marker" />
            <SkeletonText className="mt-3 w-64" />
          </View>
        </SectionShell>
      }
      insight={<InsightCardSkeleton title />}
      primary={renderLoadingPrimary()}
      bodySkeleton={renderBodySkeleton()}
      secondary={renderLoadingSecondary()}
    />
  );
}
