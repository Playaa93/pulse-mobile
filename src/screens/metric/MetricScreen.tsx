import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// A metric's own screen `/metric/[key]?d=&r=` (web: (app)/metric/[key]/page.tsx, loading.tsx; spec §11 MD1): the day, its
// history, then the metric's own sections.
import { useMemo } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { DATA_COLORS, deltaTone } from "@/lib/bands";
import { displayUnit, DAY, formatDay, formatValue } from "@/lib/format";
import { parseRange, RANGES, type TrendRange } from "@/lib/url";
import { getMetricDetail, isDetailKey, type DetailKey, type MetricDetailVM } from "@/queries/metric";
import { Divided, LoadError, RangedTrendChart } from "@/screens/trends/parts";
import { useScreen } from "@/screens/useScreen";
import { CAPTION, LABEL, mapMetric } from "@/screens/_lib/view";
import { TrendChartSkeleton, type TrendSeries } from "@/ui/charts/TrendChart";
import { cn } from "@/ui/cn";
import { KeyStatRowSkeleton } from "@/ui/metrics/KeyStatRow";
import { StatusChip, ValueUnit } from "@/ui/metrics/primitives";
import { ReasonPlaceholder } from "@/ui/metrics/ReasonPlaceholder";
import { DetailShell } from "@/ui/shells/DetailShell";
import { useSelectedDay } from "@/ui/shells/DateSwitcher";
import { EmptyState } from "@/ui/shells/EmptyState";
import { MetricState } from "@/ui/shells/MetricState";
import { SectionShell } from "@/ui/shells/SectionShell";
import { useOptionalShellCalendar } from "@/ui/shells/ShellStatus";
import { SkeletonText } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";
import { chartDef } from "@/queries/chart";
import { chartHref, type ChartRange } from "@/screens/chart/href";
import { RangeStatsCard } from "./RangeStats";
import { MetricSection } from "./sections";

const STACK: Record<"calories" | "distance", readonly TrendSeries[]> = {
  calories: [
    { key: "resting", get label() { return tr("health.HeartRateScreen.resting"); }, color: DATA_COLORS["energy-resting"].css },
    { key: "active", get label() { return tr("queries.goals.active"); }, color: DATA_COLORS["energy-active"].css },
  ],
  distance: [
    { key: "everyday", get label() { return tr("metric.MetricScreen.everyday"); }, color: DATA_COLORS["energy-resting"].css },
    { key: "workouts", get label() { return tr("activity.ActivitiesScreen.workouts"); }, color: DATA_COLORS["energy-active"].css },
  ],
};

/** The chart's 365 points and each range's change, once per loaded view model. */
function shape(vm: MetricDetailVM) {
  // Rounded as the chip shows it, so 0.04 km reads "+0.04", not "0.00".
  const k = vm.format === "decimal2" ? 100 : vm.format === "decimal1" ? 10 : 1;
  const deltas = Object.fromEntries(
    RANGES.map((r) => [r, vm.ranges[r].average === null || vm.ranges[r].prior === null ? null : Math.round((vm.ranges[r].average! - vm.ranges[r].prior!) * k) / k]),
  ) as Record<TrendRange, number | null>;
  return { data: mapMetric(vm.history, (ps) => ps.map((p) => ({ date: p.day, value: p.value, parts: p.parts }))), deltas };
}

export default function MetricScreen() {
  useLanguage();
  const { key, r } = useLocalSearchParams<{ key: string; r?: string }>();
  const [d] = useSelectedDay();
  const range = parseRange(r);
  const timeZone = useOptionalShellCalendar()?.timeZone;
  const valid = isDetailKey(key);
  const { data, error, reload } = useScreen((ctx) => getMetricDetail(key as DetailKey, d, ctx), ["metric", key, d]);
  // A day change keeps the old view model on screen until the new one lands; another metric never shows the old one.
  const vm = data?.key === key ? data : undefined;
  const shaped = useMemo(() => (vm ? shape(vm) : undefined), [vm]);

  if (!valid) return <DetailShell title={tr("chart.ChartExplorer.metric")} dateSwitcher={{ mode: "day" }} primary={<EmptyState body={tr("metric.MetricScreen.thereIsNoScreenForThisMetric")} />} />;
  if (error && !vm) return <LoadError title={tr("chart.ChartExplorer.metric")} reload={reload} />;
  if (!vm || !shaped) return <Loading />;

  const empty = vm.value.value === null && vm.history.value === null;
  // The day's hourly view sits under the hero; every other section follows the history.
  const [first, ...rest] = vm.sections;
  const lead = first?.kind === "hourly" && !empty ? first : null;
  const more = lead ? rest : vm.sections;
  const stats = { ranges: vm.ranges, format: vm.format, unit: vm.unit, direction: vm.direction, total: vm.total };

  return (
    <DetailShell
      title={vm.label}
      bodySkeleton={renderLoadingPrimary()}
      dateSwitcher={{ mode: "day" }}
      hero={<Hero vm={vm} />}
      summary={lead && <MetricSection s={lead} vm={vm} timeZone={timeZone} />}
      primary={
        empty ? (
          <SectionShell variant="card" title={tr("cardInfo.title.history")}>
            <EmptyState
              body={
                vm.group === "nutrition"
                  ? tr("metric.MetricScreen.noLoggedYetLogItInJournal", { v0: vm.label.toLowerCase() })
                  : tr("metric.MetricScreen.noFromHealthConnectYetItShows", { v0: vm.label.toLowerCase() })
              }
              action={vm.group === "nutrition" ? { label: tr("home.HomeScreen.openJournal"), href: "/journal" } : undefined}
            />
          </SectionShell>
        ) : (
          <View className="gap-3">
            <SectionShell variant="card" title={tr("cardInfo.title.history")} action={chartDef(vm.key) ? { label: tr("metric.MetricScreen.explore"), href: chartHref({ metric: vm.key, r: range as ChartRange, d }) } : undefined}>
              <RangedTrendChart
                key={vm.key}
                range={range}
                label={vm.label}
                unit={vm.unit}
                format={vm.format}
                colorBy="single"
                direction={vm.direction}
                data={shaped.data}
                deltas={shaped.deltas}
                stack={vm.chart.stack && STACK[vm.chart.stack]}
                reference={vm.chart.reference}
                baseline={vm.chart.baseline}
                smooth={vm.chart.smooth}
              />
            </SectionShell>
            <RangeStatsCard {...stats} range={range} />
          </View>
        )
      }
      secondary={empty ? [] : more.map((s) => <MetricSection key={s.kind} s={s} vm={vm} timeZone={timeZone} />)}
      footer={
        <SectionShell variant="card" title={tr("breathe.BreatheScreen.about", { v0: vm.label.toLowerCase() })}>
          <View className="gap-2">
            <Text className="text-[15px] leading-[22px] text-foreground-secondary">{vm.about}</Text>
            <Text className="text-[15px] leading-[22px] text-foreground-secondary">{vm.source}</Text>
          </View>
        </SectionShell>
      }
    />
  );
}

const unitText = (unit?: string) => (unit ? (unit === "%" ? "%" : ` ${displayUnit(unit)}`) : "");

/** The day's value (a reading metric's latest reading) against its 30-day average. */
function Hero({ vm }: { vm: MetricDetailVM }) {
  useLanguage();
  // The date switcher names the day; a reading from an earlier day says which.
  const when = vm.valueDay && vm.valueDay !== vm.day ? tr("metric.MetricScreen.latestReading", { v0: formatDay(vm.valueDay, DAY.short) }) : null;
  return (
    <View className="w-full max-w-[360px] items-center gap-2 py-4">
      {when && <Text className={cn(LABEL, "text-center text-muted-foreground")}>{when}</Text>}
      <MetricState metric={vm.value} skeleton={null} renderReason={(r) => <ReasonPlaceholder reason={r} size="lg" className="py-3" />}>
        {(value) => {
          const avg = vm.average;
          const t = avg !== null ? deltaTone(vm.direction, value, avg, vm.sd) : null;
          const diff = avg !== null ? value - avg : null;
          return (
            <>
              <ValueUnit value={formatValue(vm.format, value)} unit={vm.unit} className="font-numeric text-[64px] font-bold leading-[64px] tracking-[-0.02em]" unitClassName="text-xl font-semibold leading-7 text-foreground-secondary" />
              {/* A running total against whole days would always read tr("display.below"): today shows the average alone. */}
              {t && diff !== null && !vm.soFar && (
                <StatusChip tone={t.tone === "good" ? "optimal" : t.tone === "bad" ? "warning" : "neutral"} delta={t.dir} className="mt-1 self-center">
                  {t.dir === "flat" ? tr("metric.MetricScreen.inLineWithYour30DayAverage") : tr("metric.MetricScreen.your30DayAverage", { v0: formatValue(vm.format, Math.abs(diff)), v1: unitText(vm.unit), v2: t.dir === "up" ? tr("display.above") : tr("display.below") })}
                </StatusChip>
              )}
              <Text className={cn(CAPTION, "text-center")}>{avg === null ? tr("metric.MetricScreen.no30DayAverageYet") : tr("metric.MetricScreen.30DayAverage", { v0: formatValue(vm.format, avg), v1: unitText(vm.unit) })}</Text>
            </>
          );
        }}
      </MetricState>
    </View>
  );
}

const renderLoadingPrimary = () => (
  <View accessibilityElementsHidden className="gap-3">
    <SectionShell variant="card" title={tr("cardInfo.title.history")}>
      <TrendChartSkeleton chip ranges={RANGES} />
    </SectionShell>
    <SectionShell variant="card" title={tr("activity.ActivitiesScreen.last30Days")}>
      <Divided>
        {[tr("metric.MetricScreen.dailyAverage"), tr("metric.MetricScreen.highest"), tr("metric.MetricScreen.lowest"), tr("metric.MetricScreen.daysWithData")].map((l) => (
          <KeyStatRowSkeleton key={l} variant="row" label={l} />
        ))}
      </Divided>
    </SectionShell>
  </View>
);

/** Metric detail: the hero's label and value, the History card and its stats with their real labels (spec §5.19). */
function Loading() {
  useLanguage();
  return (
    <DetailShell
      loading
      title={" "}
      dateSwitcher={{ mode: "day" }}
      hero={
        <View accessibilityElementsHidden className="w-full max-w-[360px] items-center gap-2 py-4">
          <SkeletonText className="w-16" />
          <SkeletonText className="w-44" fs={64} lh={64} />
          <SkeletonText className="w-40" />
        </View>
      }
      primary={renderLoadingPrimary()}
      bodySkeleton={renderLoadingPrimary()}
    />
  );
}
