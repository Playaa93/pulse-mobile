import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// A metric screen's own sections (web: metric/[key]/sections.tsx): what the metric is made of, by kind.
import type { ReactNode } from "react";
import { View } from "react-native";
import { clock, DAY, durationWords, formatDay, formatValue, hmm } from "@/lib/format";
import type { Metric } from "@/lib/reasons";
import { activityHref } from "@/lib/url";
import type { MetricDetailVM, Section } from "@/queries/metric";
import { Divided } from "@/screens/trends/parts";
import { CAPTION, LABEL, statProps } from "@/screens/_lib/view";
import { ColumnChart } from "@/ui/charts/ColumnChart";
import { cn } from "@/ui/cn";
import { KeyStatRow } from "@/ui/metrics/KeyStatRow";
import { EmptyState } from "@/ui/shells/EmptyState";
import { MetricState } from "@/ui/shells/MetricState";
import { SectionShell } from "@/ui/shells/SectionShell";
import { Text } from "@/ui/Text";
import { INSET_ROW } from "@/ui/Card";

type Ctx = { vm: MetricDetailVM; timeZone?: string };

/** The inset strip under a card's rows (the web's LEGEND: the class has text styles a View cannot pass down). */
function Legend({ children }: { children: ReactNode }) {
  useLanguage();
  return (
    <View className={cn(INSET_ROW, "mb-3 mt-1 py-2")}>
      <Text className="text-xs font-medium leading-4 text-foreground-secondary">{children}</Text>
    </View>
  );
}

const ok = (v: number): Metric<number> => ({ value: v, reason: null, provisional: false });

export function MetricSection({ s, ...c }: Ctx & { s: Section }) {
  useLanguage();
  switch (s.kind) {
    case "hourly":
      return <Hourly s={s} {...c} />;
    case "goal":
      return (
        <SectionShell variant="card" title={tr("metric.sections.stepDays", { v0: formatValue("grouped", s.target) })} info={{ title: tr("metric.sections.daysReachingTheStepReference"), body: tr("metric.sections.recordedDaysThatReachedTheDisplayedStep") }}>
          <Divided>
            <KeyStatRow variant="row" label={tr("metric.sections.currentStreak")} metric={ok(s.streak)} unit={s.streak === 1 ? "day" : "days"} format="int" direction="none" />
            <KeyStatRow variant="row" label={tr("metric.sections.longestStreak")} caption={tr("metric.sections.inThePastYear")} metric={ok(s.longest)} unit={s.longest === 1 ? "day" : "days"} format="int" direction="none" />
            <KeyStatRow variant="row" label={tr("metric.sections.daysReached")} caption={tr("metric.sections.inTheLastDays", { v0: s.days })} metric={ok(s.met)} unit={tr("goals.Goals.of", { v0: s.days })} format="int" direction="none" />
          </Divided>
          <Legend>{tr("metric.sections.about7000StepsADayGoes")}</Legend>
        </SectionShell>
      );
    case "weekday": {
      const best = Math.max(...s.days.map((d) => d.value ?? -Infinity));
      return (
        <SectionShell variant="card" title={tr("cardInfo.title.by.weekday")}>
          <ColumnChart
            summary={tr("metric.sections.averageByWeekdayOverTheLastWeeks", { v0: c.vm.label, v1: s.weeks, v2: s.days.map((d) => `${d.label} ${formatValue(c.vm.format, d.value)}`).join(", ") })}
            data={s.days.map((d) => ({ label: d.label, value: d.value, highlight: d.value === best }))}
            format={c.vm.format}
            unit={c.vm.unit}
          />
          <Text className={cn(CAPTION, "mt-2")}>{tr("metric.weekdayCaption", { count: s.weeks })}</Text>
        </SectionShell>
      );
    }
    case "weekly":
      return <Weekly s={s} {...c} />;
    case "intensity":
      return (
        <SectionShell variant="card" title={tr("cardInfo.title.minutes.by.intensity")}>
          <Divided>{s.rows.map((k) => <KeyStatRow key={k.key} variant="row" {...statProps(k)} />)}</Divided>
          <Legend>{tr("metric.sections.thisDayVsItsPrior30Days")}</Legend>
        </SectionShell>
      );
    case "workouts": {
      const burned = s.items.reduce((a, w) => a + (w.calories ?? 0), 0);
      return (
        <SectionShell variant="card" title={tr("activity.ActivitiesScreen.workouts")}>
          {s.items.length ? (
            <>
              <Divided>
                {s.items.map((w) => (
                  <KeyStatRow
                    key={w.id}
                    variant="row"
                    label={w.name}
                    caption={`${clock(w.start, c.timeZone)} - ${clock(w.end, c.timeZone)}`}
                    metric={w.calories === null ? { value: null, reason: "no_data", provisional: false } : ok(w.calories)}
                    unit="kcal"
                    format="grouped"
                    direction="none"
                    href={activityHref(w.id)}
                  />
                ))}
              </Divided>
              {s.active !== null && burned > 0 && (
                <Legend>
                  {tr("metric.workoutCalories", { burned: formatValue("grouped", burned), active: formatValue("grouped", s.active) })}
                </Legend>
              )}
            </>
          ) : (
            <EmptyState body={tr("metric.sections.noWorkoutsRecordedOnThisDay")} className="py-4" />
          )}
        </SectionShell>
      );
    }
    case "entries":
      return (
        <SectionShell variant="card" title={tr("metric.sections.loggedEntries")}>
          {s.items.length ? (
            <Divided>
              {s.items.map((e) => (
                <View key={e.id} className="min-h-[52px] flex-row items-center gap-3 py-2">
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className={LABEL}>{e.title}</Text>
                    <Text numberOfLines={1} className={cn(CAPTION, "mt-0.5")}>{e.detail}</Text>
                  </View>
                  <Text className="shrink-0 font-numeric text-[13px] font-medium leading-4 tabular-nums text-muted-foreground">{clock(e.ts * 1000, c.timeZone)}</Text>
                </View>
              ))}
            </Divided>
          ) : (
            <EmptyState body={tr("metric.sections.nothingLoggedInPulseOnThisDay")} className="py-4" />
          )}
        </SectionShell>
      );
    case "balance":
      return (
        <SectionShell variant="card" title={tr("metric.sections.eatenVsBurned")}>
          <Divided>{s.rows.map((k) => <KeyStatRow key={k.key} variant="row" {...statProps(k, undefined, false)} />)}</Divided>
        </SectionShell>
      );
    case "macros":
      return (
        <SectionShell variant="card" title={tr("cardInfo.title.macros")}>
          <Divided>{s.rows.map((k) => <KeyStatRow key={k.key} variant="row" {...statProps(k, undefined, false)} />)}</Divided>
        </SectionShell>
      );
    case "readings":
      return (
        <SectionShell variant="card" title={tr("cardInfo.title.readings")}>
          <Divided>
            {s.changes.map((k) => (
              <KeyStatRow key={k.key} variant="row" {...statProps(k, undefined, false)} />
            ))}
            {s.items.map((r) => (
              <KeyStatRow key={r.day} variant="row" label={formatDay(r.day, DAY.short)} metric={ok(r.value)} unit={c.vm.unit} format={c.vm.format} direction="none" />
            ))}
          </Divided>
        </SectionShell>
      );
    case "outliers": {
      const range = `${formatValue(c.vm.format, s.mean - s.sd)} - ${formatValue(c.vm.format, s.mean + s.sd)}${c.vm.unit ? ` ${c.vm.unit}` : ""}`;
      return (
        <SectionShell variant="card" title={tr("cardInfo.title.unusual.days")}>
          <Text className={cn(CAPTION, "mb-2")}>{tr("metric.outlierCaption", { range })}</Text>
          {s.items.length ? (
            <Divided>
              {s.items.map((o) => (
                <KeyStatRow
                  key={o.day}
                  variant="row"
                  label={formatDay(o.day, DAY.short)}
                  caption={o.dir === "high" ? tr("metric.sections.aboveYourUsualRange") : tr("metric.sections.belowYourUsualRange")}
                  metric={ok(o.value)}
                  unit={c.vm.unit}
                  format={c.vm.format}
                  direction="none"
                />
              ))}
            </Divided>
          ) : (
            <EmptyState body={tr("metric.sections.noUnusualDaysInTheLast90")} className="py-4" />
          )}
        </SectionShell>
      );
    }
  }
}

function Hourly({ s, vm, timeZone }: Ctx & { s: Extract<Section, { kind: "hourly" }> }) {
  useLanguage();
  const sedentary = vm.key === "sedentary_minutes";
  return (
    <SectionShell variant="card" title={sedentary ? tr("metric.sections.movementByHour") : tr("cardInfo.title.steps.by.hour")}>
      <MetricState metric={s.hours} skeleton={<ColumnChart.Skeleton />} renderReason={() => <EmptyState body={tr("metric.sections.noPerMinuteStepsForThisDay")} className="py-10" />}>
        {(hours) => {
          const done = hours.filter((h) => h.value !== null);
          const peak = done.reduce((a, h) => ((h.value ?? 0) > (a?.value ?? 0) ? h : a), done[0]);
          return (
            <>
              <ColumnChart
                summary={tr("metric.sections.stepsByHour", { v0: peak?.value ? tr("metric.sections.mostAtWith", { v0: peak.label, v1: formatValue("grouped", peak.value) }) : "" })}
                data={hours.map((h, i) => ({ label: h.label, title: `${h.label} - ${hours[i + 1]?.label ?? "24:00"}`, value: h.value }))}
                format="grouped"
                unit="steps"
                tickEvery={6}
              />
              {sedentary && s.still && (
                <Legend>
                  {tr("metric.sections.longestDaytimeStretchWithoutSteps")}{durationWords(s.still.minutes)}, {clock(s.still.from, timeZone)} - {clock(s.still.to, timeZone)}
                </Legend>
              )}
            </>
          );
        }}
      </MetricState>
    </SectionShell>
  );
}

function Weekly({ s, vm }: Ctx & { s: Extract<Section, { kind: "weekly" }> }) {
  useLanguage();
  const pct = Math.min(100, (s.week.total / s.target) * 100);
  return (
    <SectionShell variant="card" title={tr("cardInfo.title.this.week")}>
      <Text className="font-numeric text-[28px] font-bold leading-8 tabular-nums">
        {hmm(s.week.total)}
        <Text className="text-sm font-medium leading-5 text-foreground-secondary"> {tr("metric.sections.of")}{hmm(s.target)}</Text>
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={tr("metric.sections.thisWeek", { v0: vm.label })}
        accessibilityValue={{ min: 0, max: s.target, now: Math.round(s.week.total) }}
        className="mb-1 mt-2 h-2 overflow-hidden rounded-full bg-dial-track"
      >
        <View className="h-full rounded-full bg-optimal" style={{ width: `${pct}%` }} />
      </View>
      <Text className={cn(CAPTION, "mb-4")}>
        {tr("metric.weeklyCaption", { from: formatDay(s.week.from, DAY.monthDay), to: formatDay(s.week.to, DAY.monthDay), target: s.target })}
      </Text>
      <ColumnChart
        summary={tr("metric.sections.perWeekLastWeeksTargetMetIn", { v0: vm.label, v1: s.weeks.length, v2: s.met })}
        data={s.weeks.map((w) => ({ label: formatDay(w.from, DAY.monthDay), title: tr("goals.WeeklyPlan.weekOf", { v0: formatDay(w.from, DAY.monthDay) }), value: w.value, highlight: (w.value ?? 0) >= s.target }))}
        format="duration"
        tickEvery={3}
        reference={{ y: s.target, label: hmm(s.target) }}
      />
      <Text className={cn(CAPTION, "mt-2")}>
        {tr("metric.weeksMet", { met: s.met, count: s.weeks.length })}
      </Text>
    </SectionShell>
  );
}
