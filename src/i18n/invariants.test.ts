import { afterEach, describe, expect, it } from "vitest";
import { assessPeriod, type AssessmentDay } from "@/core/algorithms/reports";
import { reportCopy } from "@/queries/reportCopy";
import { coachSuggestions } from "@/coach/suggestions";
import { MemoryStore } from "@/data/memory";
import type { QueryCtx } from "@/queries/ctx";
import type { Profile } from "@/data/types";
import { saveProfileAction } from "@/actions/profile";
import { behaviorLabel } from "@/lib/behaviors";
import { describeEntry, mealOptions, moodOptions, symptomOptions, flowOptions, ovulationOptions, valenceOptions } from "@/queries/log";
import { ageText, parseWeeklyTarget, planTargetText } from "@/screens/goals/weeklyPlanView";
import { setLanguage } from "./index";

const profile: Profile = { birthDate: "1990-01-01", sex: "male", maxHr: 183, heightCm: 178, timeZone: "Europe/Paris" };
const ctx = (): QueryCtx => ({ store: new MemoryStore(), profile, today: "2026-10-20", timeZone: "Europe/Paris", now: Date.parse("2026-10-20T12:00:00Z") / 1000, sync: { lastSyncTs: null, firstDay: null, lastError: null } });
const week = (values: Partial<AssessmentDay> = {}, n = 7): AssessmentDay[] => Array.from({ length: n }, (_, i) => ({
  day: `2026-10-${String(12 + i).padStart(2, "0")}`, recovery: 60, strain: 10, sleepPerf: 80, hrv: 50, rhr: 55,
  zone13Min: 30, zone45Min: 15, strengthSessions: i === 0 || i === 3 ? 1 : 0, steps: 9000,
  consistency: 85, sleptMin: 480, needMin: 450, ...values,
}));
afterEach(() => setLanguage("en"));

describe("localization preserves data and scoring", () => {
  it.each([
    [week({ recovery: 35 }), week()],
    [week({ sleptMin: 360, steps: 3000 }), week()],
    [week({ hrv: 80 }), week()],
    [week({}, 1), week()],
    [week(), week({}, 1)],
    [week(), week()],
  ])("changes report prose without changing assessment values or ranking", (current, previous) => {
    const original = assessPeriod(current, previous, "week");
    setLanguage("fr");
    const translated = assessPeriod(current, previous, "week", undefined, reportCopy);
    const { focus: english, ...enData } = original;
    const { focus: french, ...frData } = translated;
    expect(frData).toEqual(enData);
    expect(french).toHaveLength(english.length);
    expect(french).not.toEqual(english);
    expect(french.every((line) => line && !line.includes("{{"))).toBe(true);
    // The engine's default remains independent of the app's global language.
    expect(assessPeriod(current, previous, "week")).toEqual(original);
  });

  it("keeps coach suggestion keys and log option values stable across languages", async () => {
    const context = ctx();
    const english = await coachSuggestions(context);
    const options = () => [mealOptions(), moodOptions(), symptomOptions(), flowOptions(), ovulationOptions(), valenceOptions()];
    const before = options();
    setLanguage("fr");
    const french = await coachSuggestions(context);
    expect(french.map((s) => s.key)).toEqual(english.map((s) => s.key));
    expect(french.map((s) => s.text)).not.toEqual(english.map((s) => s.text));
    expect(options().map((items) => items.map(([value]) => value))).toEqual(before.map((items) => items.map(([value]) => value)));
    expect(options()).not.toEqual(before);
  });

  it("preserves a renamed built-in behavior and a user's meal name", () => {
    setLanguage("fr");
    expect(behaviorLabel("alcohol", "Alcohol")).toBe("Alcool");
    expect(behaviorLabel("alcohol", "Mon libellé personnel")).toBe("Mon libellé personnel");
    const meal = describeEntry("nutrition-log", { name: "Lunch with Alex", meal: "LUNCH", kcal: 1200, protein: 30, carbs: null, fat: 12.5 });
    expect(meal.title).toBe("Lunch with Alex");
    expect(meal.detail).toBe("1 200 kcal, 30 g de protéines, 12,5 g de lipides");
  });
});

describe("French form entry", () => {
  it("accepts decimal commas and persists numeric profile values, keeping names verbatim", async () => {
    setLanguage("fr");
    const saved: Profile[] = [];
    const form = { birthDate: "1990-01-01", sex: "male", maxHr: "183", heightCm: "178,5", timeZone: "Europe/Paris", name: "Jean Smith" };
    expect(await saveProfileAction(form, profile, async (p) => { saved.push(p); })).toEqual({ ok: true });
    expect(saved[0]).toMatchObject({ maxHr: 183, heightCm: 178.5, name: "Jean Smith", timeZone: "Europe/Paris" });
    const invalid = await saveProfileAction({ ...form, heightCm: "abc" }, profile, async (p) => { saved.push(p); });
    expect(invalid).toMatchObject({ ok: false, fields: { heightCm: "Saisissez un nombre" } });
    expect(saved).toHaveLength(1);
  });

  it("accepts French grouped targets while retaining whole-number validation", () => {
    setLanguage("fr");
    expect(parseWeeklyTarget("steps", "8 000")).toEqual({ value: 8000, error: null });
    expect(parseWeeklyTarget("strength", "2,5")).toEqual({ value: null, error: "Nombres entiers uniquement" });
    expect(parseWeeklyTarget("strength", "8").value).toBeNull();
    expect(planTargetText({ key: "strength", target: 1, format: "int" })).toBe("sur 1 séance");
    expect(planTargetText({ key: "strength", target: 2, format: "int" })).toBe("sur 2 séances");
    expect(ageText(-0.64)).toBe("−0,6 an");
    setLanguage("en");
    expect(parseWeeklyTarget("steps", "8,000")).toEqual({ value: 8000, error: null });
  });
});
