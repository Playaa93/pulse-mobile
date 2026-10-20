import { useLanguage } from "@/i18n/react";
import { tr, formatLocale } from "@/i18n";
// Tool results as kit cards (spec §7.21 Messages), ported from pulse src/app/(app)/coach/Evidence.tsx and Coach.tsx's
// DayCard: get_day as three MiniRings with contributors, the other tools as compact KeyStatRow cards, each followed by
// a "Based on" link to the screen it read.
import type { ReactNode } from "react";
import { View } from "react-native";
import { ArrowUpRight } from "lucide-react-native";
import type { CoachOutputs } from "@/coach/tools";
import { normalizeReason, reasonCopy, type Metric } from "@/lib/reasons";
import { cn } from "@/ui/cn";
import { Card } from "@/ui/Card";
import { Icon } from "@/ui/Icon";
import { push } from "@/ui/navigate";
import { Press } from "@/ui/Press";
import { Text } from "@/ui/Text";
import { ZoneBars } from "@/ui/charts/ZoneBars";
import { KeyStatRow } from "@/ui/metrics/KeyStatRow";
import { MiniRing, type MiniRingVariant } from "@/ui/metrics/MiniRing";
import { Sparkline } from "@/ui/metrics/Sparkline";
import { zoneBars } from "@/screens/_lib/view";

const NOTE = "text-[13px] leading-5 text-muted-foreground";

function metric(m: { value: number | null; reason?: string | null; provisional?: boolean }): Metric<number> {
  return { value: m.value, reason: m.value === null ? normalizeReason(m.reason) : null, provisional: m.provisional ?? false } as Metric<number>;
}

function BasedOn({ href, children }: { href: string; children: ReactNode }) {
  useLanguage();
  return (
    <Press accessibilityRole="link" onPress={() => push(href)} className="min-h-10 flex-row items-center gap-1.5 self-start">
      <Text className="text-xs leading-4 text-coach-text">{tr("coach.Evidence.basedOn")}{children}</Text>
      <Icon icon={ArrowUpRight} size={14} tone="coach-text" />
    </Press>
  );
}

function EvidenceCard({ title, children }: { title: string; children: ReactNode }) {
  useLanguage();
  return (
    <Card className="px-4 py-3">
      <Text className="mb-1 text-xs font-semibold text-foreground-secondary">{title}</Text>
      {children}
    </Card>
  );
}

type DayDigest = CoachOutputs["get_day"];

function Ring({ label, variant, m, unit }: { label: string; variant: MiniRingVariant; m: { value: number | null; reason: string | null }; unit?: string }) {
  useLanguage();
  return (
    <View className="flex-1 items-center gap-1 rounded-md bg-secondary p-3">
      <MiniRing variant={variant} value={m.value} />
      <Text className={cn("font-numeric font-bold", m.value === null ? "text-sm text-foreground-secondary" : "text-xl")}>{m.value === null ? reasonCopy(m.reason).short : `${m.value}${unit ?? ""}`}</Text>
      <Text className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</Text>
    </View>
  );
}

/** get_day: Recovery, Sleep and Strain, then up to three contributors with their points. */
export function DayCard({ d }: { d: DayDigest }) {
  useLanguage();
  const moved = d.recovery.contributors.filter((c) => c.points !== null && c.points !== 0).slice(0, 3);
  return (
    <Card className="p-2">
      <View className="flex-row gap-2">
        <Ring label={tr("ui.shells.HomeHeader.recovery")} variant="recovery" m={d.recovery} unit="%" />
        <Ring label={tr("ui.shells.HomeHeader.sleep")} variant="sleep" m={d.sleep.performance} unit="%" />
        <Ring label={tr("ui.shells.HomeHeader.strain")} variant="strain" m={d.strain} />
      </View>
      {moved.length > 0 && (
        <View className="px-2 pb-1.5 pt-3">
          <Text className="text-xs font-medium text-muted-foreground">{tr("coach.Evidence.whatMovedRecovery")}</Text>
          {moved.map((c, i) => (
            <View key={c.label} className={cn("flex-row items-center justify-between gap-3 py-1.5", i > 0 && "border-t border-border")}>
              <Text className="text-sm text-foreground-secondary">{c.label}</Text>
              <Text className={cn("font-numeric text-sm font-semibold", c.points! > 0 ? "text-recovery-green" : "text-recovery-red-text")}>
                {c.points! > 0 ? "+" : "−"}
                {Math.abs(c.points!)} {tr("ui.metrics.ContributorRow.pts")}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export function Evidence({ name, output }: { name: string; output: unknown }) {
  useLanguage();
  if (!output || typeof output !== "object") return null;
  if (name === "get_day") {
    const d = output as DayDigest;
    return (
      <View className="gap-2">
        <DayCard d={d} />
        <BasedOn href={`/recovery?d=${d.day}`}>{tr("coach.Evidence.recoverySleepAndStrain")}{d.day}</BasedOn>
      </View>
    );
  }
  if (name === "get_trend") {
    const d = output as CoachOutputs["get_trend"];
    return (
      <View className="gap-2">
        <EvidenceCard title={tr("coach.Evidence.to", { v0: d.metric, v1: d.start, v2: d.end })}>
          <KeyStatRow variant="row" label={tr("coach.Evidence.periodAverage")} metric={metric(d.average)} unit={d.unit ?? undefined} format="decimal1" direction="none" average={d.previous.average.value} averageLabel="Previous period" caption={tr("coach.Evidence.ofDaysMeasured", { v0: d.observedDays, v1: d.calendarDays })} />
          <Sparkline values={d.points.map((p) => p.value)} className="mt-2 h-14" />
        </EvidenceCard>
        <BasedOn href="/trends">
          {d.metric} · {d.start} {tr("strain.StrainScreen.to")}{d.end}
        </BasedOn>
      </View>
    );
  }
  if (name === "get_sleep") {
    const d = output as CoachOutputs["get_sleep"];
    const debt = d.details.find((v) => v.key === "debt");
    const time = (ms: number) => new Intl.DateTimeFormat(formatLocale(), { timeZone: d.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(ms);
    const plan = d.planner.value;
    return (
      <View className="gap-2">
        <EvidenceCard title={tr("coach.Evidence.sleep", { v0: d.day })}>
          <KeyStatRow variant="row" label={tr("coach.Evidence.timeAsleep")} metric={metric(d.asleepMinutes)} unit="min" format="int" direction="none" />
          {d.summary
            .filter((v) => v.key === "efficiency" || v.key === "consistency")
            .map((v) => (
              <KeyStatRow key={v.key} variant="row" label={v.label} metric={metric(v)} unit={v.unit ?? undefined} format="int" average={v.baseline} direction="up" />
            ))}
          {debt && <KeyStatRow variant="row" label={tr("lib.dashboard.sleepDebt")} metric={metric(debt)} unit="min" format="int" direction="down" />}
          {plan && (
            <Text className={cn(NOTE, "mt-2 text-foreground-secondary")}>
              {tr("coach.evidence.bedtimes", { wake: time(plan.wakeAt), plans: plan.plans.map((v) => `${v.label.toLowerCase()}: ${time(v.bedtimeAt)}`).join("; ") })}</Text>
          )}
        </EvidenceCard>
        <BasedOn href={`/sleep?d=${d.day}`}>{tr("coach.Evidence.sleepAndBedtimePlanner")}{d.day}</BasedOn>
      </View>
    );
  }
  if (name === "get_activities") {
    const d = output as CoachOutputs["get_activities"];
    return (
      <View className="gap-2">
        <EvidenceCard title={tr("coach.Evidence.workoutsTo", { v0: d.start, v1: d.end })}>
          {d.workouts.length ? (
            d.workouts.slice(0, 5).map((v) => <KeyStatRow key={v.id} variant="row" label={v.name} metric={metric(v.strain)} unit="%" format="int" direction="none" caption={tr("coach.Evidence.minStrain", { v0: v.day, v1: v.minutes })} href={`/activity/${encodeURIComponent(v.id)}`} />)
          ) : (
            <Text className={NOTE}>{tr("coach.Evidence.noWorkoutsRecordedInThisPeriod")}</Text>
          )}
          {d.total > 5 && <Text className={cn(NOTE, "mt-2 text-xs")}>{tr("coach.evidence.showingWorkouts", { count: d.total })}</Text>}
        </EvidenceCard>
        <BasedOn href="/activities">
          {tr("coach.Evidence.recordedWorkouts")}{d.start} {tr("strain.StrainScreen.to")}{d.end}
        </BasedOn>
      </View>
    );
  }
  if (name === "get_activity") {
    const a = (output as CoachOutputs["get_activity"]).workout;
    if (!a) return <Text className={NOTE}>{tr("coach.Evidence.thatWorkoutIsUnavailable")}</Text>;
    return (
      <View className="gap-2">
        <EvidenceCard title={`${a.name} · ${a.day}`}>
          <KeyStatRow variant="row" label={tr("activity.ActivityScreen.activityStrain")} metric={metric(a.strain)} unit="%" format="int" direction="none" />
          {a.stats.slice(0, 3).map((v) => (
            <KeyStatRow key={v.label} variant="row" label={v.label} metric={metric(v)} unit={v.unit ?? undefined} format="decimal1" average={v.baseline} direction="none" />
          ))}
          <ZoneBars variant="rows" data={zoneBars(a.zones)} note={a.zoneNote} />
        </EvidenceCard>
        <BasedOn href={`/activity/${encodeURIComponent(a.id)}`}>
          {a.name} · {a.day}
        </BasedOn>
      </View>
    );
  }
  if (name === "get_journal_impacts") {
    const d = output as CoachOutputs["get_journal_impacts"];
    return (
      <View className="gap-2">
        <EvidenceCard title={tr("coach.Evidence.habitAssociations", { v0: d.outcome })}>
          <Text className="text-xs leading-4 text-muted-foreground">{tr("coach.Evidence.differencesInNextDayAveragesNotProof")}</Text>
          {d.effects.slice(0, 3).map((v) => (
            <View key={v.behaviour}>
              <KeyStatRow variant="row" label={v.behaviour} metric={metric({ value: v.delta })} unit={d.unit} format="signed1" direction="none" caption={tr("coach.Evidence.daysWithWithout", { v0: v.yesDays, v1: v.noDays })} />
              {v.confidenceInterval && (
                <Text className="pb-2 text-xs leading-4 text-muted-foreground">
                  {tr("coach.Evidence.90Interval")}{v.confidenceInterval.map((n) => n.toFixed(1)).join(tr("strain.StrainScreen.to"))} {d.unit}
                  {v.effect === "none" ? tr("coach.Evidence.noClearAssociation") : "."}
                </Text>
              )}
            </View>
          ))}
          {!d.effects.length && <Text className={cn(NOTE, "mt-2")}>{tr("coach.Evidence.notEnoughCheckInsToCompareHabits")}</Text>}
        </EvidenceCard>
        <BasedOn href="/journal/insights">{tr("coach.Evidence.behaviourInsights")}</BasedOn>
      </View>
    );
  }
  if (name === "get_health") {
    const d = output as CoachOutputs["get_health"];
    return (
      <View className="gap-2">
        <EvidenceCard title={tr("coach.Evidence.healthMonitor", { v0: d.day })}>
          {d.vitals.map((v) => (
            <KeyStatRow key={v.vital} variant="row" label={v.vital} metric={metric(v)} unit={v.unit} format="decimal1" direction="none" caption={String(v.status).replaceAll("_", " ")} />
          ))}
        </EvidenceCard>
        <BasedOn href={`/health/monitor?d=${d.day}`}>{tr("coach.Evidence.healthMonitor_83d46e")}{d.day}</BasedOn>
      </View>
    );
  }
  if (name === "get_report") {
    const d = output as CoachOutputs["get_report"];
    if (!("scores" in d) || !d.scores) return <Text className={NOTE}>{tr("coach.Evidence.noReportAvailableYet")}</Text>;
    return (
      <View className="gap-2">
        <EvidenceCard title={tr("coach.Evidence.reportTo", { v0: d.start, v1: d.end, v2: d.partial ? tr("coach.Evidence.partial") : "" })}>
          {d.scores.map((v) => (
            <KeyStatRow key={v.score} variant="row" label={v.score} metric={metric(v)} format="decimal1" direction="none" />
          ))}
        </EvidenceCard>
        <BasedOn href={`/reports/${encodeURIComponent(d.period)}`}>
          {tr("coach.Evidence.report")}{d.start} {tr("strain.StrainScreen.to")}{d.end}
        </BasedOn>
      </View>
    );
  }
  if (name === "get_profile") return <BasedOn href="/settings?s=profile">{tr("coach.Evidence.yourProfile")}</BasedOn>;
  return null;
}
