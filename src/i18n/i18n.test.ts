import { afterEach, describe, expect, it } from "vitest";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import { language, resolveLanguage, setLanguage, tr } from "./index";
import { ago, dayLabel, durationWords, formatDay, formatValue, DAY, pillLabel, spoken } from "@/lib/format";
import { FORMATS as QUERY_FORMATS } from "@/queries/_lib";

afterEach(() => setLanguage("en"));

describe("embedded translations", () => {
  it("covers every English key in French with the same interpolation variables", () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    const variables = (text: string) => [...text.matchAll(/\{\{([^}]+)}}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(fr[key].trim(), key).not.toBe("");
      expect(variables(fr[key]), key).toEqual(variables(en[key]));
    }
  });

  it("follows ordered system preferences and supports regional French", () => {
    expect(resolveLanguage(["fr-CA", "en-US"])).toBe("fr");
    expect(resolveLanguage(["de-DE", "fr-FR"])).toBe("fr");
    expect(resolveLanguage(["en-GB", "fr-FR"])).toBe("en");
    expect(resolveLanguage([])).toBe("en");
    expect(resolveLanguage(["it-IT"])).toBe("en");
  });

  it("changes language synchronously, including plural rules", () => {
    setLanguage("fr");
    expect(language()).toBe("fr");
    expect(tr("common.save")).toBe("Enregistrer");
    expect(durationWords(60)).toBe("1 heure");
    expect(durationWords(120)).toBe("2 heures");
    expect(durationWords(0)).toBe("0 minute");
    setLanguage("en");
    expect(tr("common.save")).toBe("Save");
    expect(durationWords(0)).toBe("0 minutes");
  });
});

describe("French display formatting", () => {
  it("refreshes cached dates and numbers when the language changes", () => {
    expect(formatDay("2026-10-20", DAY.monthDay)).toBe("Oct 20");
    setLanguage("fr");
    expect(formatDay("2026-10-20", DAY.monthDay)).toBe("20 oct.");
    expect(pillLabel("2026-10-19", "2026-10-21")).toBe("lun. 19 oct.");
    expect(dayLabel("2026-10-20", "2026-10-20")).toBe("Aujourd’hui");
    expect(formatValue("decimal1", 12.5)).toBe("12,5");
    expect(QUERY_FORMATS.decimal1(12.5)).toBe("12,5");
    expect(formatValue("signed1", -0.01)).toBe("0,0");
    expect(formatValue("pct", 72)).toBe("72 %");
    expect(formatValue("grouped", 12345)).toBe("12 345");
    setLanguage("en");
    expect(formatDay("2026-10-20", DAY.monthDay)).toBe("Oct 20");
    expect(formatValue("decimal1", 12.5)).toBe("12.5");
  });

  it("translates relative time and spoken units without changing measured values", () => {
    setLanguage("fr");
    expect(ago(0, 3_600_000)).toBe("il y a 1 heure");
    expect(spoken("−3", "bpm")).toBe("moins 3 battements par minute");
    expect(formatValue("duration", 72)).toBe("1:12");
    expect(formatValue("decimal1", null)).toBe("--");
  });
});
