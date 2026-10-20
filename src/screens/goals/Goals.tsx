import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Daily goals (halo src/screens/home/GoalsCard.tsx), in the look of Strain's key stat rows. The card (on Strain, where
// halo's Activity tab has it): "3 of 7 done" beside the title, a row per goal switched on in Settings › Goals (its icon,
// label, a ZoneBars-style bar with the percent, value over target, a DeltaMark once met), then the week's Active Zone
// Minutes as a row. The card opens the sheet `/goals?d=`: every goal's full row (value, target, progress, the last 7
// days as grey dots, streak) and a way to Settings › Goals.
import { View } from "react-native";
import { Moon, Target } from "lucide-react-native";
import { displayUnit, dayLabel, formatValue, MISSING, NBSP } from "@/lib/format";
import { getGoalsDay, GOAL_KEYS, GOAL_META, type GoalKey, type GoalRow, type GoalsWeek } from "@/queries/goals";
import { STAT_ICON } from "@/screens/_lib/view";
import { useScreen } from "@/screens/useScreen";
import { useGoals, type Goals } from "@/state/goals";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { cn } from "@/ui/cn";
import { Divided } from "@/ui/Divided";
import { Icon } from "@/ui/Icon";
import { LABEL } from "@/ui/metrics/primitives";
import { goBack, push } from "@/ui/navigate";
import { useSelectedDay } from "@/ui/shells/DateSwitcher";
import { EmptyState } from "@/ui/shells/EmptyState";
import { SectionShell } from "@/ui/shells/SectionShell";
import { TaskPage, TaskSection } from "@/ui/shells/TaskPage";
import { useShellCalendar } from "@/ui/shells/ShellStatus";
import { SkeletonText } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";
import { ASIDE, BarLine, goalColor, GoalRowShell, UNDER_LABEL, WeekColumns, type Mark } from "./parts";

export const GOALS_SETTINGS = "/settings?s=goals";

const goalIcon = (key: GoalKey) => (key === "sleep" ? Moon : STAT_ICON[key]) ?? Target;
const unitOf = (g: { unit?: string }) => (g.unit ? `${NBSP}${displayUnit(g.unit)}` : "");
const valueText = (g: Pick<GoalRow, "format" | "value">) => (g.value === null ? MISSING : formatValue(g.format, g.value));
const targetText = (g: Pick<GoalRow, "format" | "target" | "unit">) => `${formatValue(g.format, g.target)}${unitOf(g)}`;
const DONE: Mark = { dir: "up", tone: "good" };

/** The day's goals, scored once the phone's goals are read (the defaults would score the day wrongly until then). */
function useGoalsDay(day: string) {
  const { goals, ready } = useGoals();
  const { data } = useScreen((ctx) => (ready ? getGoalsDay(day, ctx, goals) : Promise.resolve(null)), ["goals", day, goals, ready]);
  return { goals, ready, data: data && data.day === day ? data : undefined };
}

/** Strain's goals card. `day` is the day on show. */
export function GoalsCard({ day, isToday }: { day: string; isToday: boolean }) {
  useLanguage();
  const { goals, ready, data } = useGoalsDay(day);
  const keys = GOAL_KEYS.filter((k) => goals.enabled[k]);
  const title = isToday ? tr("goals.Goals.todaySGoals") : tr("goals.Goals.goals");
  if (ready && keys.length === 0)
    return (
      <SectionShell variant="card" title={title}>
        <EmptyState body={tr("goals.Goals.noGoalsSwitchedOn")} action={{ label: tr("goals.Goals.setGoals"), href: GOALS_SETTINGS }} />
      </SectionShell>
    );
  return (
    <SectionShell variant="card" title={title} href={`/goals?d=${day}`} aside={data && <Text className={ASIDE}>{tr("goals.Goals.ofDone", { v0: data.done, v1: data.goals.length })}</Text>}>
      <Divided>
        {data ? data.goals.map((g) => <GoalRowCompact key={g.key} g={g} />) : keys.map((k) => <RowSkeleton key={k} k={k} />)}
        {data?.week && <WeekStrip week={data.week} dayTarget={goals.targets.azm} />}
      </Divided>
    </SectionShell>
  );
}

/** One goal: icon, label over a bar with the percent, value over target, a DeltaMark once met. */
function GoalRowCompact({ g }: { g: GoalRow }) {
  useLanguage();
  const { c } = useTheme();
  const pct = g.value === null ? null : Math.round(g.progress * 100);
  return (
    <GoalRowShell
      icon={goalIcon(g.key)}
      label={g.short}
      value={valueText(g)}
      of={tr("goals.Goals.of", { v0: targetText(g) })}
      muted={g.value === null}
      mark={g.done ? DONE : null}
      spoken={tr("goals.Goals.of_7874ca", { v0: g.label, v1: valueText(g), v2: targetText(g), v3: g.done ? tr("goals.Goals.reached_7e0ffa") : g.partial ? tr("goals.Goals.soFarToday") : "" })}
    >
      <BarLine value={g.done ? 1 : g.value === null ? null : g.progress} color={goalColor(c, g.key)} caption={pct === null ? null : `${pct}%`} />
    </GoalRowShell>
  );
}

function RowSkeleton({ k }: { k: GoalKey }) {
  useLanguage();
  return (
    <View className="min-h-14 flex-row items-center gap-3 py-2">
      <Icon icon={goalIcon(k)} size={20} tone="muted-foreground" />
      <Text className={cn(LABEL, "min-w-0 flex-1")} numberOfLines={1}>{GOAL_META[k].short}</Text>
      <SkeletonText lh={24} fs={20} className="w-16" />
    </View>
  );
}

/** The week's Active Zone Minutes as a row ("96 of 150 min"); on the Goals page, a dot per day under it, filled on days at the daily goal. */
function WeekStrip({ week, dayTarget, days }: { week: GoalsWeek; dayTarget: number; days?: boolean }) {
  useLanguage();
  const cols = week.days.map((d) => ({ day: d.day, met: d.value !== null && d.value >= dayTarget }));
  const total = Math.round(week.total);
  const row = (
    <GoalRowShell
      icon={goalIcon("azm")}
      label={tr("lib.extraMetrics.activeZoneMinutes")}
      caption={tr("goals.Goals.thisWeekMondayToSunday")}
      value={String(total)}
      of={tr("goals.Goals.ofMin", { v0: week.target, v1: NBSP })}
      mark={week.done ? DONE : null}
      spoken={tr("goals.Goals.activeZoneMinutesThisWeekOfMinutes", { v0: total, v1: week.target, v2: week.done ? tr("goals.Goals.reached_7e0ffa") : "" })}
    />
  );
  if (!days) return row;
  return (
    <View className="pb-3">
      {row}
      <WeekColumns cols={cols} current={week.to} label={tr("goals.Goals.activeZoneMinutesDaysAtTheDaily", { v0: cols.filter((d) => d.met).length, v1: cols.length })} className={UNDER_LABEL} />
    </View>
  );
}

/** One goal's full row on the Goals page: label and its standing, a bar with the percent, value over target, then the last 7 days. */
function GoalLine({ g }: { g: GoalRow }) {
  useLanguage();
  const { c } = useTheme();
  const met = g.history.filter((h) => h.done).length;
  const pct = Math.round(g.progress * 100);
  const caption = g.done ? (g.streak > 1 ? tr("goals.Goals.reachedDayStreak", { v0: g.streak }) : tr("goals.Goals.reached")) : g.streak > 0 ? tr("goals.Goals.dayStreakOnTheLine", { v0: g.streak }) : tr("goals.Goals.metOfTheLast7Days", { v0: met });
  return (
    <View className="pb-3">
      <GoalRowShell icon={goalIcon(g.key)} label={g.label} caption={caption} value={valueText(g)} of={tr("goals.Goals.of", { v0: targetText(g) })} muted={g.value === null} mark={g.done ? DONE : null} spoken={tr("goals.Goals.of_56544d", { v0: g.label, v1: valueText(g), v2: targetText(g), v3: g.value === null ? "" : tr("goals.Goals.percent", { v0: pct }), v4: caption })}>
        <BarLine value={g.done ? 1 : g.progress} color={goalColor(c, g.key)} caption={g.value === null ? MISSING : `${pct}%`} />
      </GoalRowShell>
      <WeekColumns cols={g.history.map((h) => ({ day: h.day, met: h.done }))} current={g.history[g.history.length - 1]?.day ?? ""} label={tr("goals.Goals.last7DaysMetOf7", { v0: g.label, v1: met })} className={UNDER_LABEL} />
    </View>
  );
}

/** The sheet `/goals?d=` (halo's GoalsPage). */
export function GoalsPageBody() {
  useLanguage();
  const [day] = useSelectedDay();
  const { today } = useShellCalendar();
  const { goals, data } = useGoalsDay(day);
  const edit = () => {
    goBack();
    push(GOALS_SETTINGS);
  };
  return (
    <TaskPage title={tr("goals.Goals.goals")} description={dayLabel(day, today)} footer={<Button variant="secondary" onPress={edit}>{tr("goals.Goals.editGoals")}</Button>}>
      <Card className="gap-0 px-4 py-1">
        {data ? <GoalsList goals={goals} rows={data.goals} week={data.week} /> : <View className="gap-4 py-3">{GOAL_KEYS.filter((k) => goals.enabled[k]).map((k) => <SkeletonText key={k} lh={26} fs={22} className="w-40" />)}</View>}
      </Card>
    </TaskPage>
  );
}

function GoalsList({ goals, rows, week }: { goals: Goals; rows: GoalRow[]; week: GoalsWeek | null }) {
  useLanguage();
  const off = GOAL_KEYS.filter((k) => !goals.enabled[k]);
  return (
    <View>
      <Divided>
        {rows.map((g) => <GoalLine key={g.key} g={g} />)}
        {week && <WeekStrip week={week} dayTarget={goals.targets.azm} days />}
      </Divided>
      {off.length > 0 && (
        <View className="mt-5 gap-2">
          <TaskSection>{tr("settings.LiveHeartRate.off")}</TaskSection>
          <Text className="text-sm leading-[19px] text-muted-foreground">{tr("goals.Goals.switchThemOnInSettingsGoals", { v0: off.map((k) => GOAL_META[k].label).join(", ") })}</Text>
        </View>
      )}
    </View>
  );
}
