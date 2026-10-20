import { formatLocale, language, tr, type TranslationKey } from "@/i18n";
import type { DeltaDir, Tone } from "./bands";

// Number, date and spoken-label formatting (spec §3.3, §6). Formatters are referenced by key so a
// server component can hand them to a client component (functions do not cross that boundary).

/** The product name for the Healthspan age. Swap to "Pulse Age" here if preferred (spec §11). */
export const AGE_LABEL = "Pulse Age";
export const MISSING = "--";
const MINUS = "−";

/** Joins a number to its unit or word so the pair never wraps apart: `10${NBSP}MB`. */
export const NBSP = " ";

const numbers = new Map<string, Intl.NumberFormat>();
function number(v: number, digits: number, useGrouping = false) {
  const locale = formatLocale();
  const key = `${locale}:${digits}:${useGrouping}`;
  let formatter = numbers.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping });
    numbers.set(key, formatter);
  }
  return formatter.format(v === 0 ? 0 : v);
}
const minus = (s: string) => s.replace("-", MINUS);
// "-0.0" collapses to "0.0"; the hyphen becomes a real minus sign.
const fixed = (v: number, d: number) => {
  return minus(number(Number(v.toFixed(d)), d));
};
const signed = (v: number, d: number) => (Number(v.toFixed(d)) > 0 ? `+${fixed(v, d)}` : fixed(v, d));
const pad = (n: number) => String(n).padStart(2, "0");

/** Minutes → "7:42". */
export function hmm(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}:${pad(m % 60)}`;
}

export const FORMATS = {
  int: (v: number) => fixed(v, 0),
  grouped: (v: number) => minus(number(Math.round(v), 0, true)),
  decimal1: (v: number) => fixed(v, 1),
  /** A whole percent with its sign tight: Strain "42%". */
  pct: (v: number) => `${fixed(v, 0)}${language() === "fr" ? NBSP : ""}%`,
  decimal2: (v: number) => fixed(v, 2),
  signed1: (v: number) => signed(v, 1),
  signedInt: (v: number) => signed(v, 0),
  /** Minutes → h:mm. */
  duration: hmm,
  /** Seconds (per km) → m:ss, the pace "5:32". */
  pace: (s: number) => {
    const t = Math.max(0, Math.round(s));
    return `${Math.floor(t / 60)}:${pad(t % 60)}`;
  },
  /** Seconds → h:mm:ss. */
  durationHMS: (s: number) => {
    const t = Math.max(0, Math.round(s));
    return `${Math.floor(t / 3600)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
  },
} satisfies Record<string, (v: number) => string>;
export type FormatKey = keyof typeof FORMATS;

/** Formats a value by key; null, undefined and non-finite numbers render as "--". */
export function formatValue(key: FormatKey, v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? MISSING : FORMATS[key](v);
}

/** Symbol units sit tight against the value (`ml-0.5`); word units get a gap (`ml-1`). */
export const isSymbolUnit = (unit: string) => unit === "%" || unit === "x";

// --- Dates and clock times ---

const dates = new Map<string, Intl.DateTimeFormat>();
/**
 * A calendar day ("2026-09-28", or a month "2026-09") through Intl.DateTimeFormat in LOCALE: formatDay(day, DAY.short)
 * → "Mon, Sep 28". Read and formatted in UTC, so the runtime's zone never shifts the day.
 */
export function formatDay(day: string, opts: Intl.DateTimeFormatOptions) {
  const key = `${formatLocale()}:${JSON.stringify(opts)}`;
  let f = dates.get(key);
  if (!f) dates.set(key, (f = new Intl.DateTimeFormat(formatLocale(), { ...opts, timeZone: "UTC" })));
  return f.format(new Date(`${day.length === 7 ? `${day}-01` : day}T00:00:00Z`));
}

/** The app's date shapes (spec §6) as Intl options for formatDay. */
export const DAY = {
  /** "Mon, Sep 28" */
  short: { weekday: "short", month: "short", day: "numeric" },
  /** "Monday, September 28", for spoken labels */
  long: { weekday: "long", month: "long", day: "numeric" },
  /** "Sep 28" */
  monthDay: { month: "short", day: "numeric" },
  /** "Sep 28, 1990" */
  full: { month: "short", day: "numeric", year: "numeric" },
  /** "September 2026" */
  monthYear: { month: "long", year: "numeric" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/** "Today", "Yesterday", else "Mon, Sep 28". Dates are YYYY-MM-DD in the user's zone. */
export function dayLabel(date: string, today: string) {
  if (date === today) return tr("common.today");
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  if (date === y.toISOString().slice(0, 10)) return tr("common.yesterday");
  return formatDay(date, DAY.short);
}

/** The date pill's label: "Today", "Yesterday", else "Mon., Sep. 28", abbreviations marked with a period as the
 * reference app prints them ("TUE., APR. 14", home-03); a month short enough to need none stays bare ("May 4"). */
export function pillLabel(date: string, today: string) {
  const label = dayLabel(date, today);
  if (date === today || label === tr("common.yesterday") || language() === "fr") return label;
  const month = formatDay(date, { month: "short" });
  const dot = month === formatDay(date, { month: "long" }) ? "" : ".";
  return `${formatDay(date, { weekday: "short" })}., ${month}${dot} ${formatDay(date, { day: "numeric" })}`;
}

/** "Sep 22 - Sep 28". */
export const rangeLabel = (from: string, to: string) => `${formatDay(from, DAY.monthDay)} - ${formatDay(to, DAY.monthDay)}`;

const clocks = new Map<string, Intl.DateTimeFormat>();
/** Epoch ms → 24-hour "HH:mm" in `timeZone` (default: the runtime zone). */
export function clock(ms: number, timeZone?: string) {
  const key = `${formatLocale()}:${timeZone ?? ""}`;
  let f = clocks.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(formatLocale(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
    clocks.set(key, f);
  }
  return f.format(ms);
}

/** "38 minutes", "1 hour 12 minutes". */
export function durationWords(minutes: number) {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  const part = (count: number, word: "minute" | "hour") => tr(`format.duration.${word}`, { count });
  if (!h) return part(r, "minute");
  return r ? `${part(h, "hour")} ${part(r, "minute")}` : part(h, "hour");
}

/** Relative age of a timestamp: "12 minutes ago", "3 hours ago". */
export function ago(ms: number, now: number) {
  const min = Math.max(0, Math.round((now - ms) / 60000));
  if (min < 1) return tr("format.ago.now");
  if (min < 60) return tr("format.ago.minute", { count: min });
  const h = Math.round(min / 60);
  if (h < 48) return tr("format.ago.hour", { count: h });
  return tr("format.ago.day", { count: Math.round(h / 24) });
}

/** Header sync age, the reference app's battery slot (spec §4.3.2): "Now", "12m", "3h", "2d". */
export function agoShort(ms: number, now: number) {
  const min = Math.max(0, Math.floor((now - ms) / 60000));
  if (min < 1) return tr("common.now");
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return h < 48 ? `${h}h` : tr("format.ago.shortDays", { count: Math.floor(h / 24) });
}

// --- Spoken labels (aria) ---

const UNIT_WORDS: Record<string, TranslationKey> = {
  "%": "format.unit.percent",
  "ms": "format.unit.milliseconds",
  "bpm": "format.unit.bpm",
  "rpm": "format.unit.rpm",
  "°C": "format.unit.degrees",
  "kcal": "format.unit.calories",
  "ml/kg/min": "format.unit.vo2max",
  "x": "format.unit.times",
  "min": "format.unit.minutes",
  "h": "format.unit.hours",
  "km": "format.unit.kilometres",
  "/km": "format.unit.perKilometre",
};

/** "124 milliseconds", "−0.4 degrees" → reads the minus sign as "minus". */
export function spoken(value: string, unit?: string) {
  const v = value.replace(MINUS, tr("format.minus"));
  if (!unit) return v;
  return `${v} ${UNIT_WORDS[unit] ? tr(UNIT_WORDS[unit]) : displayUnit(unit)}`;
}

export type DialAria = {
  variant: "recovery" | "strain" | "sleep" | "stat" | "gauge";
  label: string;
  value?: number | null;
  valueText?: string;
  unit?: string;
  provisional?: boolean;
  reason?: string | null;
  reasonText?: string;
  bandWord?: string;
  target?: readonly [number, number] | null;
  soFar?: boolean;
};

/** "Recovery 72 percent, green", "Strain 42 percent so far, target 40 to 60 percent", "Recovery unavailable: calibrating, 4 nights left". */
export function dialAriaLabel(a: DialAria) {
  if (a.value === null || a.value === undefined) {
    const why = (a.reasonText ?? tr("format.noData")).replace(/^(\w)/, (c) => c.toLowerCase()).replace(": ", ", ");
    return tr("format.unavailable", { label: a.label, reason: why });
  }
  const v = spoken(a.valueText ?? String(a.value), a.unit);
  const prov = a.provisional ? tr("format.provisional") : "";
  if (a.variant === "strain") {
    const t = a.target ? tr("format.target", { from: fixed(a.target[0], 0), to: fixed(a.target[1], 0) }) : "";
    return `${a.label}${prov} ${v}${a.soFar ? tr("format.soFar") : ""}${t}`;
  }
  const word = a.bandWord ? `, ${a.bandWord.toLowerCase()}` : "";
  return `${a.label}${prov} ${v}${word}`;
}

const TONE_WORD: Record<Tone, TranslationKey | null> = { good: "format.tone.good", bad: "format.tone.bad", neutral: null };

/** "Heart rate variability 124 milliseconds, above your 30-day average of 98, good". */
export function statSentence(o: {
  label: string;
  valueText: string;
  unit?: string;
  averageText?: string;
  averageLabel?: string;
  dir?: DeltaDir;
  tone?: Tone;
}) {
  let s = `${o.label} ${spoken(o.valueText, o.unit)}`;
  if (o.averageText && o.averageText !== MISSING) {
    const rel = o.dir === "up" ? "up" : o.dir === "down" ? "down" : "flat";
    s += tr(`format.comparison.${rel}`, { period: o.averageLabel ?? tr("format.average"), value: o.averageText });
    const toneKey = o.tone ? TONE_WORD[o.tone] : null;
    if (toneKey) s += tr(toneKey);
  }
  return s;
}

/** Translate visible units without changing their canonical keys used by formatters and data. */
const DISPLAY_UNITS: Record<string, TranslationKey> = {
  "day": "format.display.day",
  "days": "format.display.days",
  "week": "format.display.week",
  "weeks": "format.display.weeks",
  "month": "format.display.month",
  "months": "format.display.months",
  "year": "format.display.year",
  "years": "format.display.years",
  "steps": "format.display.steps",
  "floors": "format.display.floors",
  "sessions": "format.display.sessions",
  "session": "format.display.session",
  "night": "format.display.night",
  "nights": "format.display.nights",
  "step": "format.display.step",
  "yr": "format.display.yr",
  "hrs": "format.display.hrs",
  "hr": "format.display.hr",
  "hours": "format.display.hours",
  "left": "format.display.left",
  "bpm avg": "format.display.bpm_avg",
  "of 100": "format.display.of_100",
  "of 5": "format.display.of_5",
  "a month": "format.display.a_month",
  "sessions a week": "format.display.sessions_a_week",
  "steps a day, on average": "format.display.steps_a_day_on_average",
  "% sleep consistency": "format.display.sleep_consistency",
  "nights a week": "format.display.nights_a_week",
  "min a week": "format.display.min_a_week",
  "percentage points": "format.display.percentage_points",
  "baseline SD": "format.display.baseline_SD",
  "SD": "format.display.SD",
  "g protein": "format.display.g_protein",
  "g carbs": "format.display.g_carbs",
  "g fat": "format.display.g_fat",
};
export const displayUnit = (unit: string) => DISPLAY_UNITS[unit] ? tr(DISPLAY_UNITS[unit]) : unit;
