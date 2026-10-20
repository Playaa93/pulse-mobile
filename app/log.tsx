import { FORMATS , dayLabel } from "@/lib/format";
import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Droplet } from "lucide-react-native";
import { logEntry, type LogInput } from "@/actions/log";
import { CYCLE_SYMPTOMS, flowOptions, KIND_LABEL, LOG_KINDS, mealOptions, moodOptions, ovulationOptions, symptomOptions, valenceOptions, WATER_STEPS, type LogKind } from "@/queries/log";
import { getDayLog } from "@/queries/journalExtras";
import { todayOf } from "@/queries/common";
import { parseDay } from "@/lib/url";
import { DateTimeField } from "@/screens/log/DateTimeField";
import { Chips, Field, FormAlert, Input } from "@/screens/log/fields";
import { actionCtx, dataChanged } from "@/state/app";
import { defaultAt, EMPTY, toInput, wallNow, type Form } from "@/screens/log/form";
import { toast } from "@/ui/Toast";
import { useScreen } from "@/screens/useScreen";
import { Button } from "@/ui/Button";
import { haptic } from "@/ui/haptics";
import { Icon } from "@/ui/Icon";
import { CAPTION } from "@/ui/metrics/primitives";
import { TaskPage, TaskSection } from "@/ui/shells/TaskPage";
import { Text } from "@/ui/Text";
import { cn } from "@/ui/cn";
import { goBack } from "@/ui/navigate";

/** A log sheet (spec §11 LG1): /log?kind=water&d=2026-10-02, the web's `?log=water` over Journal's day. */
export default function LogPage() {
  useLanguage();
  const { kind: raw, d } = useLocalSearchParams<{ kind?: string; d?: string }>();
  const kind = (LOG_KINDS as readonly string[]).includes(raw ?? "") ? (raw as LogKind) : "water";
  const { data: vm } = useScreen((ctx) => getDayLog(parseDay(d, todayOf(ctx)).d, ctx), ["log", d]);
  const [form, setForm] = useState<Form>(EMPTY[kind]);
  const [at, setAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: string) => (v: string | string[]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError(null);
  };

  const title = tr("journal.LogTiles.log", { v0: KIND_LABEL[kind].toLowerCase() });
  if (!vm)
    return (
      <TaskPage title={title}>
        <View className="h-40" />
      </TaskPage>
    );

  const time = at ?? defaultAt(vm);
  const now = wallNow(vm.timeZone);

  const send = async (input: LogInput, close = true) => {
    setSaving(true);
    setError(null);
    const r = await logEntry(actionCtx(), input).catch(() => ({ ok: false as const, error: tr("nutrition.FoodPage.couldnTSaveTryAgain") }));
    setSaving(false);
    if (!r.ok) {
      haptic.error();
      setError(r.error);
      return;
    }
    dataChanged();
    if (close) goBack();
    toast.success(tr("app.log.saved", { v0: KIND_LABEL[input.kind] }));
  };
  const save = () => {
    const input = toInput(kind, form, time);
    if (typeof input === "string") return setError(input);
    void send(input);
  };

  const timeField = kind !== "period" && (
    <Field label={tr("nutrition.FoodPage.time")}>
      <DateTimeField label={tr("nutrition.FoodPage.time")} mode="datetime" value={time} max={now} onChange={setAt} />
    </Field>
  );
  const field = (k: string, label: string, hint: string | undefined, o: { mode: "numeric" | "decimal" | "text"; placeholder?: string; maxLength?: number; className?: string }) => (
    <Field key={k} label={label} hint={hint} className={o.className}>
      <Input accessibilityLabel={label} inputMode={o.mode} placeholder={o.placeholder} maxLength={o.maxLength} value={form[k] as string} onChangeText={set(k)} className={o.mode === "text" ? "text-base" : "text-base tabular-nums"} returnKeyType="done" />
    </Field>
  );
  const when = (children: React.ReactNode) => <Section title={tr("nutrition.FoodPage.when")}>{children}</Section>;

  return (
    <TaskPage
      title={title}
      description={tr("nutrition.FoodPage.keptOnThisPhone")}
      footer={
        <>
          {error && <FormAlert>{error}</FormAlert>}
          <Button onPress={save} disabled={saving}>
            {saving ? tr("onboarding.ProfileForm.saving") : tr("common.save")}
          </Button>
        </>
      }
    >
      <View className="gap-6 pt-2">
          {kind === "water" && (
            <>
              <Section title={tr("journal.CheckInPage.add")}>
                <View className="flex-row gap-2">
                  {WATER_STEPS.map((ml) => (
                    <Button key={ml} variant="secondary" disabled={saving} className="h-14 flex-1 gap-2" onPress={() => void send({ kind: "water", ml, at: time }, false)}>
                      <Icon icon={Droplet} size={20} strokeWidth={1.75} tone="secondary-foreground" />
                      <Text className="text-[15px] font-bold uppercase tracking-[0.1em] text-secondary-foreground">+{ml} ml</Text>
                    </Button>
                  ))}
                </View>
                <Text accessibilityLiveRegion="polite" className={cn(CAPTION, "tabular-nums")}>
                  {dayLabel(vm.day, vm.today)}: {FORMATS.grouped(vm.water.total)} ml
                </Text>
              </Section>
              <Section title={tr("app.log.otherAmount")}>
                {field("ml", tr("app.log.amount"), "(ml)", { mode: "numeric", placeholder: tr("app.log.eG330") })}
                {timeField}
              </Section>
            </>
          )}

          {kind === "food" && (
            <>
              <Section title={tr("nutrition.FoodPage.meal")}>
                <Chips label={tr("nutrition.FoodPage.meal")} options={mealOptions()} value={form.meal as string} onChange={set("meal")} />
              </Section>
              <Section title={tr("nutrition.FoodPage.whatYouAte")}>
                {field("name", tr("onboarding.ProfileForm.name"), `(${tr("settings.controls.optional").toLowerCase()})`, { mode: "text", placeholder: tr("nutrition.FoodPage.eGDalAndRice"), maxLength: 80 })}
                {field("kcal", tr("health.dataCheckSummary.calories"), "(kcal)", { mode: "numeric" })}
                <View className="flex-row gap-2">
                  {(["protein", "carbs", "fat"] as const).map((m) => field(m, m[0].toUpperCase() + m.slice(1), "(g)", { mode: "decimal", className: "flex-1" }))}
                </View>
                {timeField}
              </Section>
            </>
          )}

          {kind === "weight" && (
            <Section title={tr("app.log.measurement")}>
              <View className="flex-row gap-2">
                {field("kg", tr("lib.dashboard.weight"), "(kg)", { mode: "decimal", className: "flex-1" })}
                {field("fat", tr("lib.dashboard.bodyFat"), "(%)", { mode: "decimal", placeholder: tr("settings.controls.optional"), className: "flex-1" })}
              </View>
              {timeField}
            </Section>
          )}

          {kind === "spo2" && (
            <Section title={tr("app.log.reading")}>
              {field("pct", tr("lib.dashboard.bloodOxygen"), "(%)", { mode: "decimal", placeholder: tr("app.log.eG95") })}
              <Text className={CAPTION}>{tr("app.log.theMorningReadingFromTheFitbitApp")}</Text>
              {timeField}
            </Section>
          )}

          {kind === "mood" && (
            <>
              <Section title={tr("app.log.overall")}>
                <Chips label={tr("app.log.overall")} options={valenceOptions()} value={form.valence as string} onChange={set("valence")} />
              </Section>
              <Section title={tr("app.log.feelings")}>
                <Chips label={tr("app.log.feelings")} options={moodOptions()} value={form.moods as string[]} onChange={set("moods")} />
              </Section>
              {when(timeField)}
            </>
          )}

          {kind === "symptoms" && (
            <>
              <Section title={tr("app.log.symptoms")}>
                <Chips label={tr("app.log.symptoms")} options={symptomOptions().filter((s) => vm.kinds.includes("period") || !CYCLE_SYMPTOMS.has(s[0]))} value={form.symptoms as string[]} onChange={set("symptoms")} />
              </Section>
              {when(timeField)}
            </>
          )}

          {kind === "period" && (
            <>
              <Section title={tr("app.log.days")}>
                <View className="flex-row gap-2">
                  <Field label={tr("app.log.firstDay")} className="flex-1">
                    <DateTimeField label={tr("app.log.firstDay")} mode="date" value={form.start as string} max={vm.today} onChange={set("start")} />
                  </Field>
                  <Field label={tr("app.log.lastDay")} className="flex-1">
                    <DateTimeField label={tr("app.log.lastDay")} mode="date" value={form.end as string} max={vm.today} min={(form.start as string) || undefined} onChange={set("end")} />
                  </Field>
                </View>
                <Text className={CAPTION}>{tr("app.log.stillGoingUseTodayAsTheLast")}</Text>
              </Section>
              <Section title={tr("app.log.flow")}>
                <Chips label={tr("app.log.flow")} options={flowOptions()} value={form.flow as string} onChange={set("flow")} />
              </Section>
            </>
          )}

          {kind === "ovulation" && (
            <>
              <Section title={tr("app.log.result")}>
                <Chips label={tr("app.log.result")} options={ovulationOptions()} value={form.result as string} onChange={set("result")} />
              </Section>
              {when(timeField)}
            </>
          )}
      </View>
    </TaskPage>
  );
}

/** A caps heading with the reference app's hairline over its controls (the web's Section inside the form). */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  useLanguage();
  return (
    <View className="gap-3">
      <TaskSection>{title}</TaskSection>
      {children}
    </View>
  );
}
