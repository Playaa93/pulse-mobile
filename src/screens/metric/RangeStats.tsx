import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// The history card's range in words and numbers (web: metric/[key]/RangeStats.tsx). It follows the route's `r`, which the
// range toggle above sets, so it changes at once.
import { DAY, formatDay, type FormatKey } from "@/lib/format";
import type { GoodDirection } from "@/lib/bands";
import type { Metric } from "@/lib/reasons";
import { type TrendRange } from "@/lib/url";
import type { RangeStats as Stats } from "@/queries/metric";
import { Divided } from "@/screens/trends/parts";
import { KeyStatRow } from "@/ui/metrics/KeyStatRow";
import { SectionShell } from "@/ui/shells/SectionShell";

const RANGE: Record<TrendRange, { label: string; prior: string }> = {
  w: { get label() { return tr("cardInfo.title.last.7.days"); }, get prior() { return tr("metric.RangeStats.the7DaysBefore"); } },
  m: { get label() { return tr("activity.ActivitiesScreen.last30Days"); }, get prior() { return tr("metric.RangeStats.the30DaysBefore"); } },
  "6m": { get label() { return tr("cardInfo.title.last.6.months"); }, get prior() { return tr("metric.RangeStats.the6MonthsBefore"); } },
  "1y": { get label() { return tr("cardInfo.title.last.12.months"); }, get prior() { return tr("metric.RangeStats.theYearBefore"); } },
};

type Props = { ranges: Record<TrendRange, Stats>; format: FormatKey; unit?: string; direction: GoodDirection; total: boolean };

const metric = (v: number | null): Metric<number> => (v === null ? { value: null, reason: "no_data", provisional: false } : { value: v, reason: null, provisional: false });

/** The card itself, for one range. */
export function RangeStatsCard({ ranges, format, unit, direction, total, range }: Props & { range: TrendRange }) {
  useLanguage();
  const s = ranges[range];
  const r = RANGE[range];
  const row = { variant: "row" as const, format, unit };
  return (
    <SectionShell variant="card" title={r.label}>
      <Divided>
        <KeyStatRow {...row} label={tr("metric.MetricScreen.dailyAverage")} caption={tr("metric.RangeStats.vs", { v0: r.prior })} metric={metric(s.average)} average={s.prior} averageLabel={r.prior} direction={direction} />
        {total && <KeyStatRow {...row} label={tr("nutrition.FoodPage.total")} metric={metric(s.total)} direction="none" />}
        <KeyStatRow {...row} label={tr("metric.MetricScreen.highest")} caption={s.high ? formatDay(s.high.day, DAY.short) : undefined} metric={metric(s.high?.value ?? null)} direction="none" />
        <KeyStatRow {...row} label={tr("metric.MetricScreen.lowest")} caption={s.low ? formatDay(s.low.day, DAY.short) : undefined} metric={metric(s.low?.value ?? null)} direction="none" />
        <KeyStatRow variant="row" format="int" unit={tr("goals.Goals.of", { v0: s.days })} label={tr("metric.MetricScreen.daysWithData")} metric={metric(s.withData)} direction="none" />
      </Divided>
    </SectionShell>
  );
}
