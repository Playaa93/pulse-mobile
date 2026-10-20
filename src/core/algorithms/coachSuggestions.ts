import type { ReasonCode } from "@/lib/reasons";

export type CoachSuggestion = { key: "brief" | "recovery" | "training" | "hrv" | "sleep" | "strain" | "sync"; text: string };
export type SuggestionSignals = {
  recovery: number | null;
  provisional: boolean;
  reason: ReasonCode | null;
  hrv: number | null;
  hrvBaseline: number | null;
  asleepMinutes: number | null;
  strain: number | null;
  targetHigh: number | null;
};

export type SuggestionCopy = Record<"brief" | "sync" | "provisional" | "trainingEasy" | "trainingControlled" | "trainingHard" | "enough" | "hrv" | "poorSleep" | "betterSleep" | "recovery" | "training", string>;
const ENGLISH_COPY: SuggestionCopy = {
  "brief": "Today's brief",
  "sync": "What can I do while last night's sleep syncs?",
  "provisional": "How should I train while my Recovery is provisional?",
  "trainingEasy": "What easy activity makes sense today?",
  "trainingControlled": "How should I keep today's training controlled?",
  "trainingHard": "How hard can I train within today's target?",
  "enough": "Have I done enough activity today?",
  "hrv": "Why is my HRV below my usual range?",
  "poorSleep": "I slept poorly. How can I recover today?",
  "betterSleep": "How can I improve tonight's sleep?",
  "recovery": "What's shaping my Recovery?",
  "training": "How should I plan today's training?"
};

export function suggestionsFor(s: SuggestionSignals, copy: SuggestionCopy = ENGLISH_COPY): CoachSuggestion[] {
  const out: CoachSuggestion[] = [{ key: "brief", text: copy.brief }];
  if (s.reason === "awaiting_sleep_sync") out.push({ key: "sync", text: copy.sync });
  else if (s.reason === "calibrating" || s.provisional) out.push({ key: "recovery", text: copy.provisional });
  else if (s.recovery !== null) out.push({ key: "training", text: s.recovery < 34 ? copy.trainingEasy : s.recovery < 67 ? copy.trainingControlled : copy.trainingHard });
  if (s.strain !== null && (s.targetHigh !== null ? s.strain >= s.targetHigh : s.strain >= 67)) out.push({ key: "strain", text: copy.enough });
  if (s.hrv !== null && s.hrvBaseline !== null && s.hrvBaseline > 0 && s.hrv < s.hrvBaseline * 0.85) out.push({ key: "hrv", text: copy.hrv });
  if (s.asleepMinutes !== null && s.asleepMinutes < 360) out.push({ key: "sleep", text: copy.poorSleep });
  for (const item of [{ key: "sleep", text: copy.betterSleep }, { key: "recovery", text: copy.recovery }, { key: "training", text: copy.training }] as CoachSuggestion[]) {
    if (!out.some((s) => s.key === item.key)) out.push(item);
  }
  return out.slice(0, 4);
}
