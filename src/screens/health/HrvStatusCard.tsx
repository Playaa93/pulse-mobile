import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// HRV Status (version 19), from halo src/screens/health/HrvStatusCard.tsx (its fields and copy) drawn with Pulse's kit:
// the 7-day average of overnight HRV against your usual range, and the last 4 weeks' nights as bars against that range
// in one Skia canvas. On Health and on Recovery; it loads its own query, so neither page's query changes.
import type { ReactNode } from "react";
import { View } from "react-native";
import { RoundedRect } from "@shopify/react-native-skia";
import { formatValue } from "@/lib/format";
import { todayOf } from "@/queries/common";
import { getHrvStatus, type HrvStatusVM } from "@/queries/training";
import { ChartFigure, PlotCanvas } from "@/ui/charts/ChartFrame";
import { alpha } from "@/ui/color";
import { ReasonPlaceholder } from "@/ui/metrics/ReasonPlaceholder";
import { Divided } from "@/ui/Divided";
import { MetricState } from "@/ui/shells/MetricState";
import { SectionShell } from "@/ui/shells/SectionShell";
import type { InfoContent } from "@/ui/shells/InfoButton";
import { Skeleton } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";
import { Hero, LINE, renderSourceNote, StatRow } from "../strain/TrainingCards";
import { useScreen } from "../useScreen";

function P({ children }: { children: ReactNode }) {
  useLanguage();
  return <Text className="text-[15px] leading-[22px] text-foreground-body">{children}</Text>;
}

export const HRV_STATUS_INFO: InfoContent = {
  get title() { return tr("health.HrvStatusCard.hrvStatus"); },
  get body() { return (
    <>
      <P>
        {tr("health.HrvStatusCard.yourAverageOvernightHrvOverTheLast")}</P>
      <P>
        {tr("health.HrvStatusCard.balancedThe7DayAverageSitsIn")}</P>
      <P>{tr("health.HrvStatusCard.garminAlsoShowsPoorWhenYourUsual")}</P>
      {renderSourceNote()}
    </>
  ); },
};

const H = 72;
const TONE_COLOR = { optimal: "optimal", warning: "warning", alert: "recovery-red", neutral: "foreground-secondary" } as const;

/** The last 28 nights as bars against the usual range (a soft band) and the Low line; the last 7 in the status colour. */
function Nights({ vm }: { vm: HrvStatusVM }) {
  useLanguage();
  const { c } = useTheme();
  const values = vm.nights.flatMap((p) => (p.v == null ? [] : [p.v]));
  const lo = Math.min(vm.lowLine, ...values) * 0.9;
  const hi = Math.max(vm.band.high, ...values) * 1.05;
  const y = (v: number) => H - ((v - lo) / Math.max(1e-6, hi - lo)) * H;
  const ink = c[TONE_COLOR[vm.tone]];
  return (
    <ChartFigure summary={tr("health.HrvStatusCard.last4WeeksOfNightlyHrvAgainst", { v0: Math.round(vm.band.low), v1: Math.round(vm.band.high) })} height={H}>
      {({ width }) => {
        const n = vm.nights.length;
        const step = width / Math.max(1, n);
        const bw = Math.max(2, step - 3);
        return (
          <PlotCanvas width={width} height={H}>
            <RoundedRect x={0} y={y(vm.band.high)} width={width} height={Math.max(2, y(vm.band.low) - y(vm.band.high))} r={6} color={alpha(c.optimal, 0.16)} />
            <RoundedRect x={0} y={y(vm.lowLine)} width={width} height={1} r={0} color={c["chart-grid"]} />
            {vm.nights.map((p, i) =>
              p.v == null ? null : <RoundedRect key={i} x={i * step + (step - bw) / 2} y={Math.min(H - 3, y(p.v))} width={bw} height={Math.max(3, H - y(p.v))} r={2} color={i >= n - 7 ? ink : alpha(c.foreground, 0.22)} />,
            )}
          </PlotCanvas>
        );
      }}
    </ChartFigure>
  );
}

const renderSkeleton = () => <Skeleton className="h-48 w-full rounded-lg" />;

/** HRV Status for day `d` (none: today). */
export function HrvStatusCard({ d }: { d?: string }) {
  useLanguage();
  const m = useScreen((ctx) => getHrvStatus(d ?? todayOf(ctx), ctx), ["hrv-status", d ?? null]).data;
  return (
    <SectionShell variant="card" title={tr("health.HrvStatusCard.hrvStatus")} info={HRV_STATUS_INFO}>
      <MetricState
        metric={m}
        skeleton={renderSkeleton()}
        renderReason={(r, meta) => <ReasonPlaceholder reason={r} nightsLeft={meta.nightsLeft} size="md" copy={r === "calibrating" ? tr("health.HrvStatusCard.hrvStatusNeeds21NightsOfHrv") : undefined} />}
      >
        {(v) => (
          <View className="gap-3">
            <View className="gap-3">
              <Hero
                value={formatValue("int", v.weekAverage)}
                unit="ms"
                band={v.status}
                caption={tr("health.HrvStatusCard.7DayAverage")}
                spoken={tr("health.HrvStatusCard.hrvStatus7DayAverageMilliseconds", { v0: v.status, v1: Math.round(v.weekAverage) })}
              />
              <Text className={LINE}>{v.line}</Text>
            </View>
            <Divided>
              <StatRow label={tr("health.HrvStatusCard.lastNight")} value={formatValue("int", v.lastNight)} unit="ms" spoken={v.lastNight == null ? tr("lib.reasons.noHrvLastNight") : tr("health.HrvStatusCard.lastNightMilliseconds", { v0: Math.round(v.lastNight) })} />
              <StatRow
                label={tr("health.HrvStatusCard.usualRange")}
                value={`${formatValue("int", v.band.low)}–${formatValue("int", v.band.high)}`}
                unit="ms"
                spoken={tr("health.HrvStatusCard.usualRangeToMilliseconds", { v0: Math.round(v.band.low), v1: Math.round(v.band.high) })}
              />
            </Divided>
            <Nights vm={v} />
          </View>
        )}
      </MetricState>
    </SectionShell>
  );
}
