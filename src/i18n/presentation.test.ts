import { afterEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/data/memory";
import type { QueryCtx } from "@/queries/ctx";
import { getBehaviours, tagRows } from "@/queries/journal";
import { saveBehaviors, saveJournalEntry } from "@/actions/journal";
import { behavior, BEHAVIORS, followUpText } from "@/lib/behaviors";
import { dayTickLevels, monthDayText, shortDayText } from "@/lib/chartmath";
import { reasonCopy } from "@/lib/reasons";
import { TREND_METRICS, trendGroupLabel } from "@/queries/trends";
import { categoryWord, ageDelta, ordinal } from "@/screens/health/format";
import { CARD_INFO, cardInfo } from "@/ui/shells/cardInfo";
import { coachInstructions } from "@/coach/instructions";
import { setLanguage, tr } from "./index";

const context = (): QueryCtx => ({
  store: new MemoryStore(),
  profile: { birthDate: "1990-01-01", sex: "male", maxHr: 183, heightCm: 178, timeZone: "Europe/Paris" },
  timeZone: "Europe/Paris",
  today: "2026-10-20",
  now: Date.parse("2026-10-20T12:00:00Z") / 1000,
  sync: { lastSyncTs: null, firstDay: null, lastError: null },
});
afterEach(() => setLanguage("en"));

describe("language changes in existing screens", () => {
  it("changes chart labels, metric titles and categories without changing metric identifiers", () => {
    const identifiers = TREND_METRICS.map(({ key, group, href, column }) => ({ key, group, href, column }));
    expect(monthDayText("2026-10-20")).toBe("Oct 20");
    setLanguage("fr");
    expect(monthDayText("2026-10-20")).toBe("20 oct.");
    expect(shortDayText("2026-10-20")).toBe("mar. 20 oct.");
    expect(dayTickLevels(["2026-10-19", "2026-10-20"])[0].ticks.map((t) => t.text)).toEqual(["lun. 19", "mar. 20"]);
    expect(TREND_METRICS.map(({ key, group, href, column }) => ({ key, group, href, column }))).toEqual(identifiers);
    expect(trendGroupLabel("Activity")).toBe("Activité");
    expect(TREND_METRICS.find((m) => m.key === "steps")?.label).toBe("Pas");
    expect(categoryWord("excellent")).toBe("Excellent");
    expect(categoryWord("good")).toBe("Bon");
    expect(ordinal(1)).toBe("1er");
    expect(ordinal(78)).toBe("78e");
    expect(ageDelta(0).text).toBe("Identique à votre âge");
    expect(reasonCopy("calibrating", 1).long).toBe("Étalonnage : encore 1 nuit");
    expect(reasonCopy("calibrating", 2).long).toBe("Étalonnage : encore 2 nuits");
    setLanguage("en");
    expect(ordinal(78)).toBe("78th");
    expect(TREND_METRICS.find((m) => m.key === "steps")?.label).toBe("Steps");
  });

  it("keeps every card's explanation reachable by its original or translated title", () => {
    setLanguage("fr");
    for (const entry of CARD_INFO) {
      const expected = { title: tr(entry.title), body: tr(entry.body) };
      expect(cardInfo(entry.sourceTitle), entry.sourceTitle).toEqual(expected);
      expect(cardInfo(tr(entry.title)), entry.sourceTitle).toEqual(expected);
    }
    expect(cardInfo("This is not a card")).toBeUndefined();
  });

  it("displays old journal records in French without rewriting identifiers, answers or custom text", async () => {
    const ctx = context();
    const action = { ...ctx, nowS: () => ctx.now };
    await tagRows(ctx.store);
    await ctx.store.insertJournalTags([{ tag: "custom_balcony", label: "Mon rituel du balcon", isDefault: false, hidden: false, position: 10 }]);
    const initialKeys = BEHAVIORS.map((b) => b.key);
    setLanguage("fr");
    expect(behavior("late_caffeine")?.label).toBe("Caféine tardive");
    expect(followUpText(behavior("caffeine")!.followUp!, 15 * 60 + 30)).toBe("15:30");
    expect((await saveBehaviors(action, { tags: ["alcohol", "caffeine", "custom_balcony"] })).ok).toBe(true);
    expect((await saveJournalEntry(action, { day: ctx.today, tag: "caffeine", value: 1 })).ok).toBe(true);
    expect((await ctx.store.journalTags()).find((t) => t.tag === "caffeine")?.label).toBe("Caffeine");
    const before = await ctx.store.allJournal();
    const french = await getBehaviours(ctx);
    expect(french.tags.find((t) => t.tag === "alcohol")?.label).toBe("Alcool");
    expect(french.tags.find((t) => t.tag === "custom_balcony")?.label).toBe("Mon rituel du balcon");
    setLanguage("en");
    expect((await getBehaviours(ctx)).tags.find((t) => t.tag === "alcohol")?.label).toBe("Alcohol");
    expect(BEHAVIORS.map((b) => b.key)).toEqual(initialKeys);
    expect(await ctx.store.allJournal()).toEqual(before);
  });

  it("asks the coach for the current language while preserving user notes and tool contracts", () => {
    const ctx = context();
    setLanguage("fr");
    const french = coachInstructions(ctx, undefined, "Réponds brièvement.");
    expect(french).toContain("The app language is French");
    expect(french).toContain("unless the user explicitly asks for another language");
    expect(french).toContain("Keep tool names, argument keys, identifiers and measurement values unchanged");
    expect(french).toContain("<user_notes>\nRéponds brièvement.\n</user_notes>");
    setLanguage("en");
    expect(coachInstructions(ctx)).toContain("The app language is English");
  });
});
