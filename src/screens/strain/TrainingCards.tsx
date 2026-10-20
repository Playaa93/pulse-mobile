import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Version 19's training cards, from halo src/screens/detail/TrainingCards.tsx (its fields and copy) drawn with Pulse's
// kit: Training Readiness with Recovery Time and Training Status (Strain), and a workout's Aerobic Training Effect
// (Activity). Plain views only: a value, a band word, rows and ZoneBars-style meters; nothing animates.
import type { ReactNode } from "react";
import { View } from "react-native";
import { Activity, BedDouble, Brain, Gauge, Moon, Timer, type LucideIcon } from "lucide-react-native";
import type { ReadinessFactorKey } from "@/core/algorithms/trainingReadiness";
import type { ChipTone } from "@/lib/bands";
import { clock, formatValue, MISSING } from "@/lib/format";
import type { Metric } from "@/lib/reasons";
import { getTraining, type TrainingEffectVM, type TrainingVM } from "@/queries/training";
import { cn } from "@/ui/cn";
import { Divided } from "@/ui/Divided";
import { Icon } from "@/ui/Icon";
import { Bar } from "@/screens/goals/parts";
import { CAPTION, LABEL, ValueUnit } from "@/ui/metrics/primitives";
import { ReasonPlaceholder } from "@/ui/metrics/ReasonPlaceholder";
import { MetricState } from "@/ui/shells/MetricState";
import { SectionShell } from "@/ui/shells/SectionShell";
import type { InfoContent } from "@/ui/shells/InfoButton";
import { Skeleton } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";
import type { TokenName } from "@/ui/palette";
import { useTheme } from "@/ui/theme";
import { useScreen } from "../useScreen";

function P({ children }: { children: ReactNode }) {
  useLanguage();
  return <Text className="text-[15px] leading-[22px] text-foreground-body">{children}</Text>;
}
export const renderSourceNote = () => <Text className="text-[13px] leading-[18px] text-muted-foreground">{tr("info.pulseScoresComputedFromYourFitbitData")}</Text>;

/** A meter stays quiet unless it flags something: only a weak value (warning, alert) takes a colour. */
const TONE_FILL: Record<ChipTone, TokenName> = { optimal: "foreground-secondary", warning: "warning", alert: "recovery-red", neutral: "foreground-secondary" };
/** The score heroes' number (Health's Fitness and Heart rate cards), in the foreground colour. */
export const HERO = "font-numeric text-4xl font-bold leading-10 tracking-[-0.01em]";
export const LINE = "text-[15px] leading-[22px] text-foreground-secondary";
/** A band or status word in caps, in secondary ink (the PWA's Fitness card category). */
const BAND = cn(LABEL, "text-foreground-secondary");

/** A quiet meter, ZoneBars' bar: `frac` of a hatched track. */
function Meter({ frac, tone }: { frac: number; tone: ChipTone }) {
  useLanguage();
  const { c } = useTheme();
  return <Bar value={frac} color={c[TONE_FILL[tone]]} />;
}

/** A score hero (Health's Fitness card): the number and its unit, the band word in caps under it, then a grey caption. */
export function Hero({ value, unit, band, caption, spoken }: { value: string; unit?: string; band: string; caption?: string | null; spoken: string }) {
  useLanguage();
  return (
    <View accessible accessibilityLabel={spoken} className="gap-1">
      <ValueUnit value={value} unit={unit} className={HERO} />
      <Text className={BAND}>{band}</Text>
      {!!caption && <Text className={cn(CAPTION, "tabular-nums")}>{caption}</Text>}
    </View>
  );
}

/**
 * KeyStatRow's "row" for a value that is not a plain metric: an optional icon, the caps label with a grey caption, and
 * the value on the right in the display font (`word`: a word in body type). Put rows in <Divided>.
 */
export function StatRow({
  icon,
  label,
  caption,
  value,
  unit,
  spoken,
  word,
}: {
  icon?: ReactNode;
  label: string;
  caption?: string | null;
  value: string;
  unit?: string;
  spoken: string;
  word?: boolean;
}) {
  useLanguage();
  const missing = value === MISSING;
  return (
    <View accessible accessibilityLabel={spoken} className="min-h-14 flex-row items-center gap-3 py-2">
      {icon && <View className="size-5 shrink-0 items-center justify-center">{icon}</View>}
      <View className="min-w-0 flex-1">
        <Text className={LABEL}>{label}</Text>
        {!!caption && <Text className={cn(CAPTION, "mt-0.5")}>{caption}</Text>}
      </View>
      {word ? (
        <Text className={cn("max-w-[50%] text-right text-base font-semibold leading-6", missing && "text-muted-foreground")}>{value}</Text>
      ) : (
        <ValueUnit value={value} unit={unit} className={cn("shrink-0 font-numeric text-xl font-bold leading-6", missing && "text-muted-foreground")} />
      )}
    </View>
  );
}

export const TRAINING_READINESS_INFO: InfoContent = {
  get title() { return tr("strain.TrainingCards.trainingReadiness"); },
  get body() { return (
    <>
      <P>
        {tr("strain.TrainingCards.howReadyYouAreForHardTraining")}</P>
      <P>{tr("strain.TrainingCards.95100Prime7594High50")}</P>
      <P>
        {tr("strain.TrainingCards.recoveryTimeIsHowLongUntilYou")}</P>
      <P>{tr("strain.TrainingCards.garminDoesnTPublishItsWeightsThese")}</P>
      {renderSourceNote()}
    </>
  ); },
};

export const TRAINING_STATUS_INFO: InfoContent = {
  get title() { return tr("strain.TrainingCards.trainingStatus"); },
  get body() { return (
    <>
      <P>
        {tr("strain.TrainingCards.whatYourRecentTrainingIsDoingIn")}</P>
      <P>
        {tr("strain.TrainingCards.productiveLoadAtYourUsualOrAbove")}</P>
      <P>{tr("strain.TrainingCards.fitbitSVo2MaxMovesSlowlySo")}</P>
      {renderSourceNote()}
    </>
  ); },
};

export const TRAINING_EFFECT_INFO: InfoContent = {
  get title() { return tr("strain.TrainingCards.trainingEffect"); },
  get body() { return (
    <>
      <P>
        {tr("strain.TrainingCards.howMuchThisWorkoutImprovesYourAerobic")}</P>
      <P>{tr("strain.TrainingCards.009NoBenefit11")}</P>
      <P>
        {tr("strain.TrainingCards.garminEstimatesEpocWithBeatToBeat")}</P>
      {renderSourceNote()}
    </>
  ); },
};

/** "13 h" / "1 h 30 min" for recovery hours. */
export const hoursText = (h: number) => {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  return min === 60 ? `${whole + 1} h` : min ? `${whole} h ${min} min` : `${whole} h`;
};

const FACTOR_ICON: Record<ReadinessFactorKey, LucideIcon> = { sleep: Moon, recoveryTime: Timer, hrv: Activity, load: Gauge, sleepHistory: BedDouble, stressHistory: Brain };
const renderCardskeleton = () => <Skeleton className="h-40 w-full rounded-lg" />;

function ReadinessBody({ vm, timeZone }: { vm: TrainingVM; timeZone: string }) {
  useLanguage();
  const rt = vm.recoveryTime.value;
  return (
    <MetricState
      metric={vm.readiness}
      skeleton={renderCardskeleton()}
      renderReason={(r, meta) => <ReasonPlaceholder reason={r} nightsLeft={meta.nightsLeft} size="md" copy={r === "calibrating" ? tr("strain.TrainingCards.trainingReadinessNeedsAScoredNightAnd") : undefined} />}
    >
      {(r) => (
        <View className="gap-4">
          <View className="gap-3">
            <Hero
              value={String(r.score)}
              unit="of 100"
              band={r.band}
              caption={vm.isToday && r.atWake !== null && r.atWake !== r.score ? tr("strain.TrainingCards.atWake", { v0: r.atWake }) : null}
              spoken={tr("strain.TrainingCards.trainingReadinessOf100", { v0: r.score, v1: r.band })}
            />
            <Text className={LINE}>{r.line}</Text>
          </View>
          <Divided>
            {rt && (
              <StatRow
                icon={<Icon icon={Timer} size={20} tone="muted-foreground" strokeWidth={1.75} />}
                label={tr("queries.training.recoveryTime")}
                caption={
                  rt.hours <= 0
                    ? tr("strain.TrainingCards.recovered")
                    : rt.readyAt !== null && vm.isToday
                    ? tr("strain.TrainingCards.readyForHardTrainingAround", { v0: clock(rt.readyAt, timeZone), v1: rt.hours >= 24 ? tr("training.daysFromNow", { count: Math.round(rt.hours / 24) }) : "" })
                    : null
                }
                value={hoursText(rt.hours)}
                spoken={rt.hours > 0 ? tr("strain.TrainingCards.recoveryTime", { v0: hoursText(rt.hours) }) : tr("strain.TrainingCards.recoveryTimeFullyRecovered")}
              />
            )}
            {/* WHOOP's contributor rows (strain-02): icon, caps label, the value on the right. */}
            {r.factors.map((f) => (
              <StatRow
                key={f.key}
                icon={<Icon icon={FACTOR_ICON[f.key]} size={20} tone="muted-foreground" strokeWidth={1.75} />}
                label={f.label}
                value={f.value === null ? MISSING : String(f.value)}
                spoken={`${f.label}: ${f.value === null ? tr("strain.TrainingCards.notAvailable") : tr("strain.TrainingCards.of100", { v0: f.value })}`}
              />
            ))}
          </Divided>
        </View>
      )}
    </MetricState>
  );
}

function StatusBody({ status }: { status: TrainingVM["status"] }) {
  useLanguage();
  return (
    <MetricState
      metric={status}
      skeleton={renderCardskeleton()}
      renderReason={(r, meta) => (
        <ReasonPlaceholder
          reason={r}
          nightsLeft={meta.nightsLeft}
          size="md"
          copy={r === "calibrating" ? tr("strain.TrainingCards.trainingStatusNeedsAbout3WeeksOf") : r === "no_data" ? tr("strain.TrainingCards.trainingStatusNeedsAVo2MaxFrom") : undefined}
        />
      )}
    >
      {(s) => (
        <View className="gap-3">
          <View className="gap-2">
            <Text className={BAND}>{s.status}</Text>
            <Text className={LINE}>{s.line}</Text>
          </View>
          <Divided>
            <StatRow label={tr("queries.training.loadRatio")} value={formatValue("decimal2", s.loadRatio)} spoken={tr("strain.TrainingCards.loadRatio", { v0: s.loadRatio ?? tr("display.unavailable") })} />
            <StatRow
              label={tr("health.FitnessScreen.vo2MaxTrend")}
              value={s.vo2PerMonth === null ? MISSING : `${s.vo2PerMonth > 0 ? "+" : ""}${formatValue("decimal1", s.vo2PerMonth)}`}
              unit="a month"
              spoken={s.vo2PerMonth === null ? tr("strain.TrainingCards.vo2MaxTrendNotAvailable") : tr("strain.TrainingCards.vo2MaxTrendAMonth", { v0: s.vo2PerMonth })}
            />
            <StatRow label={tr("queries.training.hrvStatus")} value={s.hrv ?? tr("copy.fallback.not_yet")} word spoken={tr("strain.TrainingCards.hrvStatus", { v0: s.hrv ?? tr("display.notYet") })} />
          </Divided>
        </View>
      )}
    </MetricState>
  );
}

/** Strain's two training cards for day `d`, loaded on their own so the page's query is unchanged. */
export function TrainingSection({ d, timeZone }: { d: string; timeZone: string }) {
  useLanguage();
  const vm = useScreen((ctx) => getTraining(d, ctx), ["training", d]).data;
  return (
    <View className="gap-4">
      <SectionShell variant="card" title={tr("strain.TrainingCards.trainingReadiness")} info={TRAINING_READINESS_INFO}>
        {vm ? <ReadinessBody vm={vm} timeZone={timeZone} /> : renderCardskeleton()}
      </SectionShell>
      <SectionShell variant="card" title={tr("strain.TrainingCards.trainingStatus")} info={TRAINING_STATUS_INFO}>
        {vm ? <StatusBody status={vm.status} /> : renderCardskeleton()}
      </SectionShell>
    </View>
  );
}

/** A workout's Aerobic Training Effect, its main benefit and the recovery time it added (Activity). */
export function TrainingEffectCard({ te }: { te: TrainingEffectVM | null }) {
  useLanguage();
  const metric: Metric<TrainingEffectVM> = te ? { value: te, reason: null, provisional: false } : { value: null, reason: "insufficient_hr_data", provisional: false };
  return (
    <SectionShell variant="card" title={tr("strain.TrainingCards.trainingEffect_7bfc05")} info={TRAINING_EFFECT_INFO}>
      <MetricState metric={metric} skeleton={null}>
        {(t) => (
          <View className="gap-3">
            <View className="gap-3">
              <Hero value={formatValue("decimal1", t.te)} unit="of 5" band={t.label} spoken={tr("strain.TrainingCards.aerobicTrainingEffectOf5", { v0: formatValue("decimal1", t.te), v1: t.label })} />
              <Meter frac={t.te / 5} tone={t.tone} />
            </View>
            <Divided>
              <StatRow label={tr("strain.TrainingCards.mainBenefit")} caption={t.benefitLine} value={t.benefit} word spoken={tr("strain.TrainingCards.mainBenefit_6fd0a1", { v0: t.benefit, v1: t.benefitLine })} />
              {t.recoveryHours > 0 && (
                <StatRow
                  icon={<Icon icon={Timer} size={20} tone="muted-foreground" strokeWidth={1.75} />}
                  label={tr("strain.TrainingCards.addsRecoveryTime")}
                  value={hoursText(t.recoveryHours)}
                  spoken={tr("strain.TrainingCards.addsOfRecoveryTime", { v0: hoursText(t.recoveryHours) })}
                />
              )}
            </Divided>
          </View>
        )}
      </MetricState>
    </SectionShell>
  );
}
