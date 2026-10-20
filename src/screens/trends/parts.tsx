import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Shared by the Trends, Metric detail and Reports screens (web: trends/parts.tsx and the loading shapes).
import { type ReactNode } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { router } from "expo-router";
import { CircleAlert } from "lucide-react-native";
import { RANGES, type TrendRange } from "@/lib/url";
import { CARD_CLASS, CardFill, useCardStyle } from "@/ui/Card";
import { cn } from "@/ui/cn";
import { TrendChart, type TrendChartProps } from "@/ui/charts/TrendChart";
import { Segmented } from "@/ui/Segmented";
import { DetailShell } from "@/ui/shells/DetailShell";
import { EmptyState } from "@/ui/shells/EmptyState";
import { Divided } from "@/ui/Divided";
import { Press } from "@/ui/Press";
import { DURATION } from "@/ui/motion";

export const PERIOD: Record<TrendRange, { label: string; prior: string }> = {
  w: { get label() { return tr("cardInfo.title.last.7.days"); }, get prior() { return tr("metric.RangeStats.the7DaysBefore"); } },
  m: { get label() { return tr("activity.ActivitiesScreen.last30Days"); }, get prior() { return tr("metric.RangeStats.the30DaysBefore"); } },
  "6m": { get label() { return tr("cardInfo.title.last.6.months"); }, get prior() { return tr("metric.RangeStats.the6MonthsBefore"); } },
  "1y": { get label() { return tr("cardInfo.title.last.12.months"); }, get prior() { return tr("metric.RangeStats.theYearBefore"); } },
};

const RANGE_LABEL: Record<TrendRange, string> = { get w() { return tr("chart.range.week"); }, m: "M", "6m": "6M", get "1y"() { return tr("chart.range.year"); } };
const RANGE_ARIA: Record<TrendRange, string> = { get w() { return tr("ui.charts.TrendChart.1Week"); }, get m() { return tr("ui.charts.TrendChart.1Month"); }, get "6m"() { return tr("queries.trendView.6Months"); }, get "1y"() { return tr("ui.charts.TrendChart.1Year"); } };

/** Sets the route's `?r=` (the web's toggle writes it too, so the range survives a metric change). */
export const setRange = (r: TrendRange) => router.setParams({ r });

/**
 * TrendChart with all four ranges and the range in the route's `r` param, not in the chart: the Averages card and the
 * metric picker read the same range. The kit's chart keeps its own toggle state and has no callback, so this pins its
 * range (`fixedRange`, which hides its toggle) and draws the same full-width toggle above it, in the same place.
 */
export function RangedTrendChart({ range, ...p }: Omit<TrendChartProps, "ranges" | "fixedRange" | "defaultRange"> & { range: TrendRange }) {
  useLanguage();
  const shown = !!p.data?.value?.length;
  return (
    <View className="min-w-0">
      {shown && (
        <View className="mb-3">
          <Segmented label={tr("chart.ChartExplorer.range")} fill value={range} options={RANGES.map((r) => ({ value: r, label: RANGE_LABEL[r], accessibilityLabel: RANGE_ARIA[r] }))} onChange={setRange} />
        </View>
      )}
      {/* The key resets the scrub cursor with the range. */}
      <TrendChart key={range} {...p} ranges={RANGES} fixedRange={range} />
    </View>
  );
}

/** A chevron that turns half a way over 200 ms when `on` (the web's `transition-transform duration-200` with `rotate-180`). */
export function Turn({ on, children }: { on: boolean; children: ReactNode }) {
  useLanguage();
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(on ? "180deg" : "0deg", { duration: DURATION.base }) }] }), [on]);
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** A whole-card button: the card material, pressing in (the web's CARD_LINK on a button). */
export function CardButton({ onPress, className, accessibilityLabel, activeScale = 0.96, children }: { onPress: () => void; className?: string; accessibilityLabel?: string; activeScale?: number; children: ReactNode }) {
  useLanguage();
  const shadow = useCardStyle();
  return (
    <Press activeScale={activeScale} accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} className={cn(CARD_CLASS, className)} style={shadow}>
      <CardFill />
      {children}
    </Press>
  );
}

/** The web's error view for every route: the shell stays, the screen offers a retry (spec §7). */
export function LoadError({ title, reload }: { title: string; reload: () => void }) {
  useLanguage();
  return <DetailShell title={title} primary={<View accessibilityRole="alert" className="pt-16"><EmptyState icon={CircleAlert} body={tr("health.ErrorView.couldnTLoadThisScreen")} action={{ label: tr("common.retry"), onClick: reload }} /></View>} />;
}

export { Divided };
