import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Nutrition `/nutrition` (spec §7.22): halo's src/screens/nutrition/NutritionScreen.tsx in Pulse's kit. Today's
// calories, protein, carbs and fat against the targets (protein 1.6 g per kg, calories at the 14-day burn, fat 30 %),
// the 7- and 30-day daily averages, a month of daily protein and calories, and today's food: Pulse's entries to edit or
// delete, Fitbit's (read from Health Connect) read-only. Opened from the Health hub and the Journal's food sheet.
import { useState } from "react";
import { View } from "react-native";
import { Camera, Pencil, Plus, Sparkles, Trash2, Utensils, type LucideIcon } from "lucide-react-native";
import { deleteLogEntry, setFoodSeparate } from "@/actions/log";
import { clock, FORMATS } from "@/lib/format";
import { progressOf, TARGET_KEYS, TARGET_LIMITS, type TargetKey } from "@/nutrition/targets";
import { getNutrition, type Averages, type FoodItem, type NutritionVM } from "@/queries/nutrition";
import { ErrorView } from "@/screens/health/ErrorView";
import { ConfirmDialog, ProgressBar } from "@/screens/settings/controls";
import { useScreen } from "@/screens/useScreen";
import { actionCtx, dataChanged } from "@/state/app";
import { useNutritionTargets } from "@/state/nutrition";
import { Button } from "@/ui/Button";
import { ColumnChart } from "@/ui/charts/ColumnChart";
import { cn } from "@/ui/cn";
import { Icon } from "@/ui/Icon";
import { KeyStatRow } from "@/ui/metrics/KeyStatRow";
import { CAPTION, LABEL } from "@/ui/metrics/primitives";
import { Press } from "@/ui/Press";
import { Segmented } from "@/ui/Segmented";
import { DetailShell } from "@/ui/shells/DetailShell";
import { EmptyState } from "@/ui/shells/EmptyState";
import { SectionShell } from "@/ui/shells/SectionShell";
import { Skeleton } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";
import { toast } from "@/ui/Toast";
import { foodHref } from "./FoodPage";
import { push } from "@/ui/navigate";

const grouped = (v: number) => FORMATS.grouped(v);
const grams = (v: number) => FORMATS.int(v);
const show = (v: number | null, f: (x: number) => string) => (v === null ? "--" : f(v));
const metric = (v: number | null) => (v === null ? { value: null, reason: "no_data" as const, provisional: false } : { value: v, reason: null, provisional: false });

const INFO = {
  get title() { return tr("nutrition.NutritionScreen.howPulseCountsFood"); },
  get body() { return tr("nutrition.NutritionScreen.totalsAddWhatYouLogInPulse"); },
};

/** Today: calories big against the target, then each macro with a thin bar. */
function Today({ vm }: { vm: NutritionVM }) {
  useLanguage();
  const { totals: t, targets } = vm;
  const kcal = targets.kcal.value;
  const left = t.kcal === null ? kcal : kcal - t.kcal;
  return (
    <View className="gap-4">
      <View accessible accessibilityLabel={tr("nutrition.NutritionScreen.todayOfKcal", { v0: show(t.kcal, grouped), v1: grouped(kcal) })} className="gap-2">
        <Text className={LABEL}>{t.kcal === null ? tr("nutrition.NutritionScreen.nothingLoggedToday") : tr("nutrition.NutritionScreen.todaySoFar")}</Text>
        <View className="flex-row flex-wrap items-baseline gap-x-2">
          <Text className="font-numeric text-[44px] font-bold leading-[50px] tabular-nums">{show(t.kcal, grouped)}</Text>
          <Text className="text-sm font-medium leading-5 text-muted-foreground">{tr("nutrition.NutritionScreen.ofKcal", { v0: grouped(kcal) })}</Text>
        </View>
        <ProgressBar value={(progressOf(t.kcal, kcal) ?? 0) * 100} label={tr("nutrition.NutritionScreen.caloriesAgainstTarget")} />
        <Text className={CAPTION}>{left > 0 ? tr("nutrition.NutritionScreen.kcalLeftOfYourTarget", { v0: grouped(left) }) : left < 0 ? tr("nutrition.NutritionScreen.kcalOverYourTarget", { v0: grouped(-left) }) : tr("nutrition.NutritionScreen.calorieTargetReached")}</Text>
      </View>
      {(["protein", "carbs", "fat"] as const).map((k) => (
        <View key={k} accessible accessibilityLabel={tr("nutrition.NutritionScreen.ofG", { v0: TARGET_LABEL[k], v1: show(t[k], grams), v2: grams(targets[k].value) })} className="gap-1.5">
          <View className="flex-row items-baseline justify-between">
            <Text className={LABEL}>{TARGET_LABEL[k]}</Text>
            <Text className="font-numeric text-[15px] font-bold leading-5 tabular-nums">
              {show(t[k], grams)}
              <Text className="text-xs font-medium text-muted-foreground">{` / ${grams(targets[k].value)} g`}</Text>
            </Text>
          </View>
          <ProgressBar value={(progressOf(t[k], targets[k].value) ?? 0) * 100} label={tr("nutrition.NutritionScreen.againstTarget", { v0: TARGET_LABEL[k] })} />
        </View>
      ))}
      {t.fiber !== null && <Text className={cn(CAPTION, "tabular-nums")}>{tr("nutrition.NutritionScreen.fiberGFromFoodLoggedInPulse", { v0: grams(t.fiber) })}</Text>}
    </View>
  );
}

const TARGET_LABEL: Record<TargetKey, string> = { get kcal() { return tr("health.dataCheckSummary.calories"); }, get protein() { return tr("lib.extraMetrics.protein"); }, get carbs() { return tr("nutrition.FoodPage.carbs"); }, get fat() { return tr("lib.extraMetrics.fat"); } };
const VIA_ICON: Record<NonNullable<FoodItem["via"]>, LucideIcon> = { photo: Camera, text: Sparkles, manual: Utensils };

/** "320 kcal · 11 g protein · 40 g carbs · 9 g fat" for one food. */
const numbersOf = (f: FoodItem) =>
  [`${grouped(f.kcal)} kcal`, f.protein !== null && tr("copy.fallback.value_g_protein", { v0: grams(f.protein) }), f.carbs !== null && tr("copy.fallback.value_g_carbs", { v0: grams(f.carbs) }), f.fat !== null && tr("copy.fallback.value_g_fat", { v0: grams(f.fat) })].filter(Boolean).join(" · ");

/** One food: how it was logged, name and portion, numbers, time and source; edit and delete for Pulse's own. */
function FoodRow({ f, timeZone, onDelete, onSeparate }: { f: FoodItem; timeZone: string; onDelete: () => void; onSeparate: (on: boolean) => void }) {
  useLanguage();
  const mine = f.source === "pulse";
  const from = !mine ? tr("nutrition.NutritionScreen.loggedInFitbit") : f.duplicateOf ? tr("nutrition.NutritionScreen.alsoInFitbitSLogCountedOnce") : f.separate ? tr("nutrition.NutritionScreen.countedAsItsOwnFood") : f.via === "photo" ? tr("nutrition.NutritionScreen.fromAPhoto") : f.via === "text" ? tr("nutrition.NutritionScreen.fromADescription") : null;
  const time = clock(f.ts * 1000, timeZone);
  return (
    <View className="flex-row items-start gap-3 py-2.5">
      <View className="mt-0.5">
        <Icon icon={mine ? VIA_ICON[f.via ?? "manual"] : Utensils} size={18} tone="foreground-secondary" />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className={cn("text-[15px] font-semibold leading-5", f.duplicateOf && "text-muted-foreground")}>
          {f.title}
          {f.portion ? <Text className="font-normal text-muted-foreground">{`  ${f.portion}`}</Text> : null}
        </Text>
        <Text className={cn("text-sm leading-5 tabular-nums", f.duplicateOf && "text-muted-foreground line-through")}>{numbersOf(f)}</Text>
        <Text className={cn(CAPTION, "tabular-nums")}>{from ? `${time} · ${from}` : time}</Text>
        {f.duplicateOf && <RowLink label={tr("nutrition.NutritionScreen.notTheSameFoodCountItToo")} onPress={() => onSeparate(true)} />}
        {f.separate && !f.duplicateOf && <RowLink label={tr("nutrition.NutritionScreen.undo")} onPress={() => onSeparate(false)} />}
      </View>
      {mine && (
        <View className="flex-row">
          <Press activeBg="bg-fill-hover" accessibilityRole="button" accessibilityLabel={tr("nutrition.FoodPage.edit", { v0: f.title })} onPress={() => push(foodHref({ edit: f.id }))} className="size-11 items-center justify-center rounded-full">
            <Icon icon={Pencil} size={17} tone="muted-foreground" />
          </Press>
          <Press activeBg="bg-fill-hover" accessibilityRole="button" accessibilityLabel={tr("nutrition.NutritionScreen.delete", { v0: f.title })} onPress={onDelete} className="size-11 items-center justify-center rounded-full">
            <Icon icon={Trash2} size={17} tone="muted-foreground" />
          </Press>
        </View>
      )}
    </View>
  );
}

function RowLink({ label, onPress }: { label: string; onPress: () => void }) {
  useLanguage();
  return (
    <Press accessibilityRole="button" onPress={onPress} hitSlop={{ top: 12, bottom: 12, left: 4, right: 12 }} className="mt-1 self-start">
      <Text className="text-sm font-semibold leading-5 underline">{label}</Text>
    </Press>
  );
}

/** One period's daily averages: calories as a tile value, the macros under it, then how many days had food. */
function AverageTile({ title, a }: { title: string; a: Averages }) {
  useLanguage();
  const sub = a.days === 0 ? tr("nutrition.NutritionScreen.noDaysWithFoodLoggedYet") : tr("nutrition.NutritionScreen.gProteinGCarbsGFatOf", { v0: show(a.protein, grams), v1: show(a.carbs, grams), v2: show(a.fat, grams), v3: a.days, v4: a.span });
  return (
    <View className="flex-1 gap-1.5">
      <KeyStatRow variant="tile" label={title} metric={metric(a.days ? a.kcal : null)} unit="kcal" format="grouped" direction="none" />
      <Text className={CAPTION}>{sub}</Text>
    </View>
  );
}

type ChartKey = "protein" | "kcal";

function History({ vm }: { vm: NutritionVM }) {
  useLanguage();
  const [key, setKey] = useState<ChartKey>("protein");
  const target = key === "protein" ? vm.targets.protein.value : vm.targets.kcal.value;
  const data = vm.history.map((h) => ({ label: h.day.slice(8), title: h.day, value: h[key], highlight: h.day === vm.today }));
  return (
    <View className="gap-3">
      <Segmented
        label={tr("nutrition.NutritionScreen.chart")}
        fill
        value={key}
        onChange={setKey}
        options={[
          { value: "protein", label: tr("lib.extraMetrics.protein") },
          { value: "kcal", label: tr("health.dataCheckSummary.calories") },
        ]}
      />
      {data.some((d) => d.value !== null) ? (
        <ColumnChart summary={tr("nutrition.NutritionScreen.dailyLast30Days", { v0: key === "protein" ? "protein" : "calories" })} data={data} format={key === "protein" ? "int" : "grouped"} unit={key === "protein" ? "g" : "kcal"} tickEvery={7} reference={{ y: target, label: tr("nutrition.NutritionScreen.target") }} />
      ) : (
        <EmptyState body={tr("nutrition.NutritionScreen.noFoodLoggedInTheLast30")} />
      )}
      <Text className={CAPTION}>{tr("nutrition.NutritionScreen.todayIsStillRunningTheDashedLine")}</Text>
    </View>
  );
}

export function NutritionScreen() {
  useLanguage();
  const { custom, ready } = useNutritionTargets();
  const { data: vm, error, reload } = useScreen((ctx) => (ready ? getNutrition(ctx, custom) : Promise.resolve(null)), ["nutrition", custom, ready]);
  const [remove, setRemove] = useState<FoodItem | null>(null);
  const [removing, setRemoving] = useState(false);

  if (!vm) return error ? <ErrorView detail retry={reload} /> : <DetailShell title={tr("lib.behaviors.nutrition")} loading hero={<Skeleton className="h-64 w-full rounded-2xl" />} />;

  const confirmRemove = async () => {
    if (!remove) return;
    setRemoving(true);
    const r = await deleteLogEntry(actionCtx(), { id: remove.id }).catch(() => ({ ok: false as const, error: "" }));
    setRemoving(false);
    setRemove(null);
    if (!r.ok) return toast.error(tr("nutrition.NutritionScreen.couldnTDeleteTryAgain"));
    toast.success(tr("nutrition.NutritionScreen.deleted"));
    dataChanged();
  };
  const separate = async (f: FoodItem, on: boolean) => {
    const r = await setFoodSeparate(actionCtx(), { id: f.id, ts: f.ts, separate: on }).catch(() => ({ ok: false as const, error: "" }));
    if (!r.ok) return toast.error(tr("nutrition.NutritionScreen.couldnTChangeThatTryAgain"));
    toast.success(on ? tr("nutrition.NutritionScreen.nowCountsToo", { v0: f.title }) : tr("nutrition.NutritionScreen.pulseMatchesWithFitbitAgain", { v0: f.title }));
    dataChanged();
  };

  return (
    <>
      <DetailShell
        title={tr("lib.behaviors.nutrition")}
        info={INFO}
        hero={<Today vm={vm} />}
        primary={
          <View className="gap-6">
            <Button onPress={() => push(foodHref())}>
              <Icon icon={Plus} size={18} tone="primary-foreground" />
              <Text className="text-[15px] font-bold uppercase tracking-[0.1em] text-primary-foreground">{tr("nutrition.NutritionScreen.addFood")}</Text>
            </Button>
            <SectionShell variant="section" title={tr("nutrition.NutritionScreen.todaySFood")}>
              {!vm.meals.length && !vm.unlisted ? (
                <EmptyState body={tr("nutrition.NutritionScreen.nothingLoggedTodayAddAMealWith")} />
              ) : (
                <View className="gap-3">
                  {vm.meals.map((g) => (
                    <SectionShell key={g.meal} variant="card" title={g.label} info={false} aside={`${grouped(g.kcal)} kcal`}>
                      {g.items.map((f, i) => (
                        <View key={f.id} className={i > 0 ? "border-t border-border" : undefined}>
                          <FoodRow f={f} timeZone={vm.timeZone} onDelete={() => setRemove(f)} onSeparate={(on) => void separate(f, on)} />
                        </View>
                      ))}
                      {g.overlap && <Text className={cn(CAPTION, "mt-2")}>{tr("nutrition.NutritionScreen.isLoggedInBothPulseAndFitbit", { v0: g.label })}</Text>}
                    </SectionShell>
                  ))}
                  {vm.unlisted && (
                    <SectionShell variant="card" title={tr("nutrition.NutritionScreen.moreFromFitbitSFoodLog")} info={false}>
                      <Text className="text-sm leading-5 tabular-nums">
                        {[vm.unlisted.kcal !== null && `${grouped(vm.unlisted.kcal)} kcal`, vm.unlisted.protein !== null && tr("copy.fallback.value_g_protein", { v0: grams(vm.unlisted.protein) }), vm.unlisted.carbs !== null && tr("copy.fallback.value_g_carbs", { v0: grams(vm.unlisted.carbs) }), vm.unlisted.fat !== null && tr("copy.fallback.value_g_fat", { v0: grams(vm.unlisted.fat) })].filter(Boolean).join(" · ")}
                      </Text>
                      <Text className={cn(CAPTION, "mt-1")}>{tr("nutrition.NutritionScreen.fitbitSDailyTotalHoldsMoreThan")}</Text>
                    </SectionShell>
                  )}
                </View>
              )}
            </SectionShell>
          </View>
        }
        secondary={[
          <SectionShell key="targets" variant="card" title={tr("nutrition.NutritionScreen.dailyTargets")} info={false}>
            {TARGET_KEYS.map((k) => (
              <KeyStatRow key={k} variant="row" label={TARGET_LABEL[k]} caption={vm.targets[k].basis} metric={metric(vm.targets[k].value)} unit={TARGET_LIMITS[k].unit} format={k === "kcal" ? "grouped" : "int"} direction="none" />
            ))}
          </SectionShell>,
          <SectionShell key="averages" variant="card" title={tr("nutrition.NutritionScreen.dailyAverages")} info={{ title: tr("nutrition.NutritionScreen.dailyAverages"), body: tr("nutrition.NutritionScreen.overTheDaysWithFoodLoggedBefore") }}>
            <View className="flex-row gap-3">
              <AverageTile title={tr("cardInfo.title.last.7.days")} a={vm.week} />
              <AverageTile title={tr("activity.ActivitiesScreen.last30Days")} a={vm.month} />
            </View>
          </SectionShell>,
          <SectionShell key="history" variant="card" title={tr("activity.ActivitiesScreen.last30Days")} info={false}>
            <History vm={vm} />
          </SectionShell>,
        ]}
      />
      <ConfirmDialog
        open={remove !== null}
        title={tr("nutrition.NutritionScreen.deleteThisFood")}
        description={tr("nutrition.NutritionScreen.itIsDeletedFromPulse", { v0: remove ? `${remove.title}, ${numbersOf(remove)}. ` : "" })}
        confirmLabel={tr("nutrition.NutritionScreen.delete_f6fdbe")}
        pendingLabel={tr("nutrition.NutritionScreen.deleting")}
        pending={removing}
        onCancel={() => !removing && setRemove(null)}
        onConfirm={() => void confirmRemove()}
      />
    </>
  );
}
