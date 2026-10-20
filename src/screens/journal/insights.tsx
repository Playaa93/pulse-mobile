import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Journal Insights' own pieces (pulse's (app)/journal/insights/{page,Impacts}.tsx): the metric words, the outcome toggle,
// the impact list and the "Keep logging to unlock" group. The page is app/journal/insights.tsx.
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import type { ImpactMetricKey, JournalInsightsVM } from "@/queries/types";
import { CARD_CLASS, CardFill, useCardStyle } from "@/ui/Card";
import { haptic } from "@/ui/haptics";
import { cn } from "@/ui/cn";
import { SEGMENT, SEGMENT_ON } from "@/ui/Segmented";
import { DriverList } from "@/ui/metrics/DriverList";
import { Text } from "@/ui/Text";
import { push } from "@/ui/navigate";

export const WORD: Record<ImpactMetricKey, string> = { get recovery() { return tr("ui.shells.HomeHeader.recovery"); }, get hrv() { return tr("breathe.BreatheScreen.hrv_49a6fe"); }, get sleep() { return tr("journal.insights.sleepPerformance"); } };
export const TITLE: Record<ImpactMetricKey, string> = { get recovery() { return tr("ui.shells.HomeHeader.recovery"); }, get hrv() { return tr("breathe.BreatheScreen.hrv_49a6fe"); }, get sleep() { return tr("ui.shells.HomeHeader.sleep"); } };
export const impactFooter = () => tr("journal.impact.footer");
const METRICS: { value: ImpactMetricKey; label: string }[] = [
  { value: "recovery", get label() { return tr("ui.shells.HomeHeader.recovery"); } },
  { value: "hrv", get label() { return tr("breathe.BreatheScreen.hrv_49a6fe"); } },
  { value: "sleep", get label() { return tr("ui.shells.HomeHeader.sleep"); } },
];

export const parseMetric = (raw: string | string[] | undefined): ImpactMetricKey => {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "hrv" || v === "sleep" ? v : "recovery";
};

/**
 * Recovery / HRV / Sleep, kept in `m` by replacing the param (spec §7.12). The web's ToggleGroup is w-fit, and with spacing 0
 * its items get px-2 (toggle-group.tsx `group-data-[spacing=0]:px-2` beats the page's px-3), so the kit's Segmented (px-3, for
 * the W / M / 6M control) is 2 x 4 px too wide per segment here.
 */
export function MetricToggle({ metric }: { metric: ImpactMetricKey }) {
  useLanguage();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={tr("journal.insights.outcome")} className="flex-row gap-0.5 self-start rounded-lg bg-muted p-0.5">
      {METRICS.map((o) => {
        const on = o.value === metric;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return;
              haptic.select();
              router.setParams({ m: o.value === "recovery" ? "" : o.value });
            }}
            className={cn(SEGMENT, "min-w-11 px-2", on && SEGMENT_ON)}
          >
            <Text className={cn("text-[13px] font-bold uppercase tracking-[0.1em]", on ? "text-foreground" : "text-muted-foreground")}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The impact list; a row opens its detail sheet (/journal/impact). */
export function ImpactList({ vm }: { vm: JournalInsightsVM }) {
  useLanguage();
  const [selected, setSelected] = useState<string | undefined>();
  // The row stays ringed while its sheet is open; coming back clears it.
  useFocusEffect(useCallback(() => setSelected(undefined), []));
  return (
    <DriverList
      variant="impact"
      unit={vm.unit}
      data={{ value: vm.items, reason: null, provisional: false }}
      selectedKey={selected}
      onSelect={(k) => {
        setSelected(k);
        push(`/journal/impact?${vm.metric === "recovery" ? "" : `m=${vm.metric}&`}behaviour=${encodeURIComponent(k)}`);
      }}
      outcome={WORD[vm.metric]}
    />
  );
}

/** The reference app's "Keep logging to unlock" group [latest-journal-insights-1]: one card row per behaviour. */
export function Unlock({ needsMore, word }: { needsMore: JournalInsightsVM["needsMore"]; word: string }) {
  useLanguage();
  const shadow = useCardStyle();
  return (
    <View accessibilityLabel={tr("journal.insights.keepLoggingToUnlock")} className="gap-3">
      <View className="gap-1">
        <Text accessibilityRole="header" className="text-xs font-bold uppercase leading-4 tracking-[0.1em]">
          {tr("journal.insights.keepLoggingToUnlock")}</Text>
        <Text className="max-w-[65ch] text-[15px] leading-[22px] text-muted-foreground">{tr("journal.unlock.explanation", { outcome: word })}</Text>
      </View>
      <View className="gap-2">
        {needsMore.map((n) => {
          const have = Math.min(5, n.yes) + Math.min(5, n.no);
          return (
            <View key={n.key} className={cn(CARD_CLASS, "gap-2.5 p-4")} style={shadow}>
              <CardFill />
              <View className="flex-row items-baseline justify-between gap-3">
                <Text numberOfLines={1} className="min-w-0 shrink text-xs font-bold uppercase leading-4 tracking-[0.1em]">
                  {n.label}
                </Text>
                <Text className="shrink-0 font-numeric text-[13px] font-semibold leading-4 tabular-nums text-foreground-secondary">{have}/10</Text>
              </View>
              <View accessible accessibilityRole="progressbar" accessibilityLabel={tr("journal.insights.of10DaysLogged", { v0: n.label, v1: have })} accessibilityValue={{ min: 0, max: 10, now: have }} className="h-1.5 overflow-hidden rounded-full bg-muted">
                <View className="h-full bg-optimal" style={{ width: `${(have / 10) * 100}%` }} />
              </View>
              <Text className="text-xs font-medium leading-4 tabular-nums text-muted-foreground">
                {tr("journal.unlock.progress", { yes: Math.min(5, n.yes), no: Math.min(5, n.no) })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
