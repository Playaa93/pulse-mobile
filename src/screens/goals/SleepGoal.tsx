import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Settings › Goals, the sleep goal (reference study, shared-machinery.md § Sleep goal, sleep.md § Automatic goal
// estimator): automatic, from the nights before your best Recovery, or set by hand. It is what Sleep Performance, Sleep
// Need, Sleep Debt and Energy Bank aim at, so saving it rescores the history (src/state/app.ts saveProfile).
import { useState } from "react";
import { View } from "react-native";
import { durationWords } from "@/lib/format";
import { sleepGoalView } from "@/queries/sleepGoal";
import { useScreen } from "@/screens/useScreen";
import { BODY, HINT, RadioSegments, ROW, ROW_LABEL, ROW_RULE, ROW_VALUE, SmallButton, TextField } from "@/screens/settings/controls";
import { appState, saveProfile } from "@/state/app";
import { Skeleton } from "@/ui/Skeleton";
import { SectionShell } from "@/ui/shells/SectionShell";
import { Text } from "@/ui/Text";
import { toast } from "@/ui/Toast";
import { cn } from "@/ui/cn";

type Method = "manual" | "automatic";
const METHODS = [
  { value: "automatic", get label() { return tr("goals.SleepGoal.automatic"); } },
  { value: "manual", get label() { return tr("goals.SleepGoal.manual"); } },
] as const;

const words = (hours: number) => durationWords(hours * 60);

async function save(hours: number, method: Method) {
  const p = appState().profile;
  if (!p) return;
  await saveProfile({ ...p, sleepGoal: { hours, method } });
  toast.success(tr("goals.SleepGoal.sleepGoal", { v0: words(hours) }));
}

/** Hours and minutes as typed: a goal from 4 to 12 hours, or an error. */
function parseGoal(h: string, m: string): { hours: number } | { error: string } {
  const hh = Number(h.trim() || "0");
  const mm = Number(m.trim() || "0");
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || mm < 0 || mm > 59) return { error: tr("goals.SleepGoal.wholeHoursAndMinutesFrom0To") };
  const hours = hh + mm / 60;
  return hours >= 4 && hours <= 12 ? { hours } : { error: tr("goals.SleepGoal.between4And12Hours") };
}

function ManualGoal({ hours }: { hours: number }) {
  useLanguage();
  const [h, setH] = useState(String(Math.trunc(hours)));
  const [m, setM] = useState(String(Math.round((hours % 1) * 60)));
  const r = parseGoal(h, m);
  const error = "error" in r ? r.error : null;
  return (
    <View className="pt-3">
      <View className="flex-row items-center gap-2">
        <View className="w-[70px]">
          <TextField variant="number" value={h} onChangeText={setH} keyboardType="number-pad" accessibilityLabel={tr("goals.SleepGoal.sleepGoalHours")} invalid={!!error} />
        </View>
        <Text className={HINT}>h</Text>
        <View className="w-[70px]">
          <TextField variant="number" value={m} onChangeText={setM} keyboardType="number-pad" accessibilityLabel={tr("goals.SleepGoal.sleepGoalMinutes")} invalid={!!error} />
        </View>
        <Text className={cn(HINT, "flex-1")}>min</Text>
        <SmallButton solid label={tr("common.save")} accessibilityLabel={tr("goals.SleepGoal.saveSleepGoal")} onPress={() => "hours" in r && void save(r.hours, "manual")} />
      </View>
      {error && <Text accessibilityRole="alert" className="pt-1 text-[13px] font-medium leading-[18px] text-recovery-red-text">{error}</Text>}
    </View>
  );
}

export function SleepGoal() {
  useLanguage();
  const { data } = useScreen(sleepGoalView, ["sleep-goal"]);
  const [method, setMethod] = useState<Method | null>(null);
  if (!data)
    return (
      <SectionShell variant="card" title={tr("queries.goals.sleepGoal")}>
        <Skeleton className="h-[52px] rounded-[14px]" />
      </SectionShell>
    );
  const shown = method ?? data.method;
  const est = data.estimate;
  const pick = (m: Method) => {
    setMethod(m);
    if (m === "automatic") void save(est?.hours ?? data.hours, "automatic");
  };
  return (
    <SectionShell variant="card" title={tr("queries.goals.sleepGoal")}>
      <Text className={cn(BODY, "pb-1")}>{tr("goals.SleepGoal.whatSleepPerformanceSleepNeedSleepDebt")}</Text>
      <View className={ROW}>
        <Text className={ROW_LABEL}>{tr("goals.SleepGoal.goal")}</Text>
        <Text className={ROW_VALUE}>{words(data.hours)}</Text>
      </View>
      <View className={cn(ROW_RULE, "pt-3")}>
        <RadioSegments label={tr("goals.SleepGoal.howTheGoalIsSet")} value={shown} options={METHODS} onChange={pick} />
      </View>
      {shown === "manual" ? (
        <ManualGoal key={data.hours} hours={data.hours} />
      ) : est ? (
        <View className="pt-3">
          <Text className={HINT}>
            {tr("goals.SleepGoal.theAverageSleepBeforeYourBestRecovery", { v0: Math.trunc(est.nights * 0.15), v1: est.nights, v2: words(est.hours) })}
            {est.status === "insufficient" && tr("copy.fallback.an_early_estimate_it_firms_up_with_90_nights_15_of_them_at_recovery_67_or_more_value_so_far", { v0: est.high })}
          </Text>
          {Math.abs(est.hours - data.hours) > 1e-9 && (
            <View className="items-start pt-2">
              <SmallButton solid label={tr("goals.SleepGoal.use", { v0: words(est.hours) })} accessibilityLabel={tr("goals.SleepGoal.useAsTheSleepGoal", { v0: words(est.hours) })} onPress={() => void save(est.hours, "automatic")} />
            </View>
          )}
        </View>
      ) : (
        <Text className={cn(HINT, "pt-3")}>{tr("goals.SleepGoal.notEnoughNightsYetTheEstimateNeeds")}</Text>
      )}
    </SectionShell>
  );
}
