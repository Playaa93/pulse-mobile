import { tr } from "@/i18n";
// Journal's Log section (spec §11 LG1), ported from Pulse's src/lib/log.ts (the choices the sheets offer),
// src/server/log.ts (the stored entries) and src/server/queries/log.ts (the view model).
//
// mobile: the web writes each entry to Google Health and mirrors it in `logged_entries`. Pulse for Android never writes
// to Health Connect (it asks for no write permission), so every entry is kept on the phone only, in the Store's
// logged entries, exactly as the web's demo mode keeps them: every type's access is "demo" (kept in Pulse) and
// `atGoogle` is always false.
import type { LoggedEntryRow, Store } from "@/data/store";
import { addDays, localDay, localMidnight } from "@/lib/time";
import { FORMATS, LOG_TYPES, type LoggedEntry, type LogType } from "./_lib";
import { type QueryCtx, todayOf } from "./common";
import { type FoodData, nutritionOn } from "./food";

export { LOG_TYPES, type LoggedEntry, type LogType } from "./_lib";

// ── lib/log.ts ──────────────────────────────────────────────────────────────

/** Types Google lets Pulse read back: the sync brings them home, so totals come from the sync, not this log. */
export const READABLE: ReadonlySet<LogType> = new Set(["hydration-log", "nutrition-log", "weight", "body-fat"]);

/** Cycle tracking: never offered, shown or accepted on a male profile. */
export const CYCLE: ReadonlySet<LogType> = new Set(["menstrual-period", "ovulation-test"]);

/** One sheet per kind; Weight writes weight and, when given, body fat. */
export const LOG_KINDS = ["water", "food", "weight", "spo2", "mood", "symptoms", "period", "ovulation"] as const;
export type LogKind = (typeof LOG_KINDS)[number];
export const KIND_TYPES: Record<LogKind, LogType[]> = {
  water: ["hydration-log"],
  food: ["nutrition-log"],
  weight: ["weight", "body-fat"],
  // mobile: the Google Health app doesn't share blood oxygen with Health Connect, so the Fitbit app's morning reading
  // is typed in here and counts like a synced one (src/data/body.ts).
  spo2: ["oxygen-saturation"],
  mood: ["moods"],
  symptoms: ["symptoms"],
  period: ["menstrual-period"],
  ovulation: ["ovulation-test"],
};
export const KIND_LABEL: Record<LogKind, string> = {
  get water() { return tr("lib.extraMetrics.water"); },
  get food() { return tr("journal.WeekCard.food"); },
  get weight() { return tr("lib.dashboard.weight"); },
  get spo2() { return tr("lib.dashboard.bloodOxygen"); },
  get mood() { return tr("queries.log.mood"); },
  get symptoms() { return tr("app.log.symptoms"); },
  get period() { return tr("queries.log.period"); },
  get ovulation() { return tr("queries.log.ovulationTest"); },
};
export const isCycleKind = (k: LogKind) => k === "period" || k === "ovulation";

export const WATER_STEPS = [250, 500] as const;

export const mealOptions = () => [
  ["BREAKFAST", tr("queries.log.breakfast")],
  ["LUNCH", tr("queries.log.lunch")],
  ["DINNER", tr("queries.log.dinner")],
  ["SNACK", tr("queries.log.snack")],
] as const;
export type Meal = (ReturnType<typeof mealOptions>)[number][0];

/** Google's valence enum, in the order the sheet shows it. */
export const valenceOptions = () => [
  ["UNPLEASANT", tr("queries.log.unpleasant")],
  ["BASELINE", tr("queries.log.neutral")],
  ["PLEASANT", tr("queries.log.pleasant")],
] as const;
export type Valence = (ReturnType<typeof valenceOptions>)[number][0];

/** A short list from Google's 70-odd moods: the ones a daily log reaches for. No NEUTRAL: the valence row has it. */
export const moodOptions = () => [
  ["HAPPY", tr("queries.log.happy")],
  ["CALM", tr("queries.log.calm")],
  ["ENERGIZED", tr("queries.log.energized")],
  ["CONTENT", tr("queries.log.content")],
  ["GRATEFUL", tr("queries.log.grateful")],
  ["EXCITED", tr("queries.log.excited")],
  ["FATIGUED", tr("queries.log.tired")],
  ["STRESSED", tr("queries.log.stressed")],
  ["ANXIOUS", tr("queries.log.anxious")],
  ["IRRITATED", tr("queries.log.irritated")],
  ["SAD", tr("queries.log.sad")],
  ["OVERWHELMED", tr("queries.log.overwhelmed")],
  ["LONELY", tr("queries.log.lonely")],
] as const;
export type Mood = (ReturnType<typeof moodOptions>)[number][0];

/** A short list from Google's symptom enum. `cycle` ones show on female profiles only. */
export const symptomOptions = () => [
  ["HEADACHE", tr("lib.behaviors.headache"), false],
  ["FATIGUE", tr("health.LoadChart.fatigue"), false],
  ["SICK", tr("queries.log.feelingSick"), false],
  ["FEVER", tr("lib.behaviors.fever"), false],
  ["COUGH", tr("queries.log.cough"), false],
  ["NAUSEA", tr("queries.log.nausea"), false],
  ["DIZZINESS", tr("queries.log.dizziness"), false],
  ["BRAIN_FOG", tr("queries.log.brainFog"), false],
  ["BACK_PAIN", tr("queries.log.backPain"), false],
  ["JOINT_PAIN", tr("queries.log.jointPain"), false],
  ["INSOMNIA", tr("queries.log.insomnia"), false],
  ["HEARTBURN", tr("queries.log.heartburn"), false],
  ["BLOATED", tr("queries.log.bloating"), false],
  ["DIARRHEA", tr("queries.log.diarrhea"), false],
  ["CONSTIPATION", tr("queries.log.constipation"), false],
  ["CRAMPS", tr("queries.log.cramps"), true],
  ["TENDER_BREASTS", tr("queries.log.tenderBreasts"), true],
  ["PMS", "PMS", true],
  ["ACNE", tr("lib.behaviors.acne"), true],
  ["HOT_FLASHES", tr("queries.log.hotFlashes"), true],
] as const;
export type Symptom = (ReturnType<typeof symptomOptions>)[number][0];
export const CYCLE_SYMPTOMS: ReadonlySet<string> = new Set(symptomOptions().filter((s) => s[2]).map((s) => s[0]));

/** Google records period flow nowhere but free-text notes, so Pulse keeps it locally and writes it into `notes`. */
export const flowOptions = () => [
  ["SPOTTING", tr("queries.log.spotting")],
  ["LIGHT", tr("ui.metrics.SleepStages.light")],
  ["MEDIUM", tr("queries.trendView.medium")],
  ["HEAVY", tr("queries.log.heavy")],
] as const;
export type Flow = (ReturnType<typeof flowOptions>)[number][0];

export const ovulationOptions = () => [
  ["NEGATIVE", tr("queries.log.negative")],
  ["POSITIVE", tr("queries.log.positive")],
  ["LUTEINIZING_HORMONE_SURGE", tr("queries.log.lhSurge")],
  ["ESTROGEN_SURGE", tr("queries.log.estrogenSurge")],
  ["INDETERMINATE", tr("queries.log.unclear")],
] as const;
export type OvulationResult = (ReturnType<typeof ovulationOptions>)[number][0];

const labelOf = (list: readonly (readonly [string, string, ...unknown[]])[], v: string) => list.find((x) => x[0] === v)?.[1] ?? v;

/**
 * What a logged entry's `data` holds, per type. Moods and symptoms keep Google's enum values, for Behaviour Insights later.
 * mobile: entries read from Health Connect (logged in Fitbit) use the same shapes, with two extras: a food log whose meal
 * Health Connect doesn't know has `meal: "UNKNOWN"`, and bleeding between periods is a one-day period with `spotting`.
 * Food logged in Pulse may also carry its portion, fiber and how it was made (photo, description or typed; food.ts).
 */
export type LogData = {
  "hydration-log": { ml: number };
  "nutrition-log": FoodData;
  weight: { kg: number };
  "body-fat": { pct: number };
  "oxygen-saturation": { pct: number };
  moods: { moods: Mood[]; valence: Valence | null };
  symptoms: { symptoms: Symptom[] };
  "menstrual-period": { start: string; end: string; flow: Flow | null; spotting?: true };
  "ovulation-test": { result: OvulationResult };
};

/** One line for the recent-log list. */
export function describeEntry(type: LogType, data: unknown): { title: string; detail: string } {
  // The web's toLocaleString("en-US"): grouped whole numbers.
  const n = (v: number) => FORMATS.grouped(v);
  const grams = (v: number) => Number.isInteger(v) ? FORMATS.int(v) : FORMATS.decimal1(v);
  switch (type) {
    case "hydration-log":
      return { title: tr("lib.extraMetrics.water"), detail: `${n((data as LogData[typeof type]).ml)} ml` };
    case "nutrition-log": {
      const f = data as LogData[typeof type];
      const macros = [f.protein != null && tr("log.protein", { value: grams(f.protein) }), f.carbs != null && tr("log.carbs", { value: grams(f.carbs) }), f.fat != null && tr("log.fat", { value: grams(f.fat) })];
      const meal = mealOptions().find((m) => m[0] === f.meal)?.[1] ?? tr("journal.WeekCard.food");
      const detail = [`${n(f.kcal)} kcal`, ...macros].filter(Boolean).join(", ");
      return { title: f.name ?? meal, detail: f.portion ? `${f.portion} · ${detail}` : detail };
    }
    case "weight":
      return { title: tr("lib.dashboard.weight"), detail: `${(data as LogData[typeof type]).kg} kg` };
    case "body-fat":
      return { title: tr("lib.dashboard.bodyFat"), detail: `${(data as LogData[typeof type]).pct}%` };
    case "oxygen-saturation":
      return { title: tr("lib.dashboard.bloodOxygen"), detail: `${(data as LogData[typeof type]).pct}%` };
    case "moods": {
      const m = data as LogData[typeof type];
      return { title: tr("queries.log.mood"), detail: [m.valence && labelOf(valenceOptions(), m.valence), ...m.moods.map((x) => labelOf(moodOptions(), x))].filter(Boolean).join(", ") };
    }
    case "symptoms":
      return { title: tr("app.log.symptoms"), detail: (data as LogData[typeof type]).symptoms.map((x) => labelOf(symptomOptions(), x)).join(", ") };
    case "menstrual-period": {
      const p = data as LogData[typeof type];
      if (p.spotting) return { title: tr("queries.log.spotting"), detail: tr("queries.log.betweenPeriods") };
      const days = Math.round((Date.parse(p.end) - Date.parse(p.start)) / 86_400_000) + 1;
      return { title: tr("queries.log.period"), detail: [tr("log.periodDays", { count: days }), p.flow && tr("log.flow", { flow: labelOf(flowOptions(), p.flow).toLowerCase() })].filter(Boolean).join(", ") };
    }
    case "ovulation-test":
      return { title: tr("queries.log.ovulationTest"), detail: labelOf(ovulationOptions(), (data as LogData[typeof type]).result) };
  }
}

// ── server/log.ts ───────────────────────────────────────────────────────────

/** `demo`: kept in Pulse only. `reconnect`: the grant lacks this type's write scope (or was revoked). */
export type LogAccess = "demo" | "ok" | "reconnect" | "not_connected";

/** mobile: nothing is written to Health Connect, so every type is kept in Pulse ("demo"), whatever the data source. */
export function logAccess(): Record<LogType, LogAccess> {
  return Object.fromEntries(LOG_TYPES.map((t) => [t, "demo"])) as Record<LogType, LogAccess>;
}

export type NewEntry = { type: LogType; ts: number; data: unknown };

/** A v4-shaped random id (the web's randomUUID; Hermes has no crypto.randomUUID). */
export function newId(): string {
  const h = (n: number) => Array.from({ length: n }, () => ((Math.random() * 16) | 0).toString(16)).join("");
  return `${h(8)}-${h(4)}-4${h(3)}-${(8 + ((Math.random() * 4) | 0)).toString(16)}${h(3)}-${h(12)}`;
}

/** Stores each entry, in order, with its local day (the web's saveEntries with no writer, as in demo mode). */
export async function saveEntries(store: Store, entries: NewEntry[], o: { tz: string; now: number }): Promise<{ ok: true }> {
  const rows: LoggedEntryRow[] = entries.map((e) => ({ id: newId(), type: e.type, ts: e.ts, day: localDay(e.ts, o.tz), data: e.data, createdAt: o.now, source: "pulse" }));
  await store.addLoggedEntries(rows);
  return { ok: true };
}

/** Deletes an entry. Unknown ids count as deleted. */
export async function deleteEntry(store: Store, id: string): Promise<{ ok: true; type?: LogType }> {
  const row = await store.deleteLoggedEntry(id);
  return row ? { ok: true, type: row.type as LogType } : { ok: true };
}

/** Entries logged at or after `fromTs`, newest first: Pulse's own and those read from Health Connect (logged in Fitbit). */
export async function recentEntries(store: Store, fromTs: number, limit = 50): Promise<LoggedEntry[]> {
  const rows = await store.loggedEntries(fromTs, limit);
  return rows.map((r) => ({
    id: r.id,
    type: r.type as LogType,
    ts: r.ts,
    day: r.day,
    ...describeEntry(r.type as LogType, r.data),
    atGoogle: false,
    source: r.source,
  }));
}

/**
 * Water drunk on `day`: the source's daily roll-up (`daily_values` water, the sync's sum of Health Connect's hydration
 * records, Fitbit's included) plus what was logged in Pulse that day. mobile: Pulse's entries never reach Health
 * Connect, so the roll-up can never hold them and each is counted once (the web adds only what was logged after the
 * last hydration sync); the Fitbit entries the sync mirrors into the log are already in the roll-up, so they are not
 * added again.
 */
export async function waterOn(store: Store, day: string, tz: string): Promise<number> {
  const [values, logged] = await Promise.all([store.dailyValues({ from: day, to: day }), store.loggedEntries(localMidnight(day, tz), 10_000)]);
  const synced = values.find((v) => v.key === "water")?.value ?? 0;
  const pending = logged
    .filter((e) => e.type === "hydration-log" && e.day === day && e.source === "pulse")
    .reduce((a, e) => a + Number((e.data as LogData["hydration-log"]).ml ?? 0), 0);
  return Number(synced) + pending;
}

export const isReadable = (t: LogType) => READABLE.has(t);

// ── queries/log.ts ──────────────────────────────────────────────────────────

export type LogVM = {
  /** Cycle kinds are absent on a male profile. */
  kinds: LogKind[];
  /** Per sheet: the worst access of the types it writes (weight needs weight and body fat). */
  access: Record<LogKind, LogAccess>;
  /** Today's water, synced roll-up plus what Pulse logged since that sync. */
  waterToday: number;
  /** Today's calories and protein eaten, counted as the nutrition metrics count them (food.ts); null when none logged. */
  foodToday: { kcal: number | null; protein: number | null };
  /** The last 14 days, newest first. */
  recent: LoggedEntry[];
  today: string;
  timeZone: string;
  /** Demo mode: entries stay in Pulse. */
  demo: boolean;
};

const RANK: Record<LogAccess, number> = { ok: 0, demo: 0, reconnect: 1, not_connected: 2 };

/** `demo`: the app runs on the demo person's generated data (the QueryCtx doesn't carry the source). */
export async function getLog(ctx: QueryCtx, opts: { demo?: boolean } = {}): Promise<LogVM> {
  const today = todayOf(ctx);
  const [waterToday, food, recent] = await Promise.all([
    waterOn(ctx.store, today, ctx.timeZone),
    nutritionOn(ctx.store, today, ctx.timeZone),
    recentEntries(ctx.store, localMidnight(addDays(today, -13), ctx.timeZone)),
  ]);
  const byType = logAccess();
  const kinds = LOG_KINDS.filter((k) => ctx.profile.sex === "female" || !isCycleKind(k));
  const access = Object.fromEntries(
    LOG_KINDS.map((k) => [k, KIND_TYPES[k].map((t) => byType[t]).reduce((a, b) => (RANK[b] > RANK[a] ? b : a))]),
  ) as Record<LogKind, LogAccess>;
  return {
    kinds,
    access,
    waterToday,
    foodToday: { kcal: food.kcal, protein: food.protein },
    // A male profile never sees cycle entries, even ones logged before the profile changed.
    recent: recent.filter((e) => ctx.profile.sex === "female" || (e.type !== "menstrual-period" && e.type !== "ovulation-test")),
    today,
    timeZone: ctx.timeZone,
    demo: !!opts.demo,
  };
}
