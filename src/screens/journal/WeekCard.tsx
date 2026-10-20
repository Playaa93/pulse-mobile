import { useLanguage } from "@/i18n/react";
import { tr, formatLocale } from "@/i18n";
import { View } from "react-native";
import { formatDay } from "@/lib/format";
import type { WeekDay } from "@/queries/journalExtras";
import { Card } from "@/ui/Card";
import { ColumnChart } from "@/ui/charts/ColumnChart";
import { cn } from "@/ui/cn";
import { CAPTION, LABEL } from "@/ui/metrics/primitives";
import { Text } from "@/ui/Text";

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};

/** Journal's week beside the log: water and food for the seven days ending on the selected day, that day highlighted. */
export function WeekCard({ week, day }: { week: WeekDay[]; day: string }) {
  useLanguage();
  const rows = [
    { key: "water" as const, title: tr("lib.extraMetrics.water"), unit: "ml" },
    { key: "kcal" as const, title: tr("journal.WeekCard.food"), unit: "kcal" },
  ];
  return (
    <Card className="gap-4 px-4">
      {rows.map((r) => {
        const a = avg(week.map((w) => w[r.key]));
        return (
          <View key={r.key} accessibilityLabel={tr("journal.WeekCard.last7Days", { v0: r.title })} className="gap-1">
            <View className="flex-row items-baseline justify-between gap-3">
              <Text accessibilityRole="header" className={LABEL}>
                {r.title}
              </Text>
              <Text className={cn(CAPTION, "tabular-nums")}>{a === null ? tr("lib.reasons.noData") : tr("journal.WeekCard.avg", { v0: a.toLocaleString(formatLocale()), v1: r.unit })}</Text>
            </View>
            <ColumnChart
              summary={tr("journal.WeekCard.perDayForThe7DaysTo", { v0: r.title, v1: formatDay(day, { month: "short", day: "numeric" }) })}
              format="grouped"
              unit={r.unit}
              data={week.map((w) => ({ label: formatDay(w.day, { weekday: "short" }), title: formatDay(w.day, { weekday: "short", month: "short", day: "numeric" }), value: w[r.key], highlight: w.day === day }))}
            />
          </View>
        );
      })}
    </Card>
  );
}
