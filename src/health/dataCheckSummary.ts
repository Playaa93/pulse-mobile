import { tr } from "@/i18n";
// Data check, pure part: per local day, what Health Connect holds for each metric — split by the app and device that
// wrote it — next to what Pulse stored. Lets a mismatch with the Fitbit app be traced to its cause (another source,
// a day boundary, a missing record, or Pulse's own mapping). The Health Connect reads live in dataCheck.ts.
import { localDay } from "@/lib/time";
import type { Metrics, Session } from "@/data/types";
import { DEVICE_NAME, isFitbit } from "./sourcePolicy";
import type { ReadType } from "./connect";

export type RawRecord = {
  metadata?: { dataOrigin?: string; device?: { type?: number } | null; recordingMethod?: number };
  time?: string;
  startTime?: string;
  endTime?: string;
  [k: string]: unknown;
};

/** The metrics the check covers, with how a record's value is read and how a day's values combine. */
export const CHECK_METRICS: { key: string; label: string; type: ReadType; unit: string; combine: "sum" | "mean" | "latest" | "list"; value: (r: RawRecord) => number | null; pulse?: (m: Metrics) => number | null }[] = [
  { key: "steps", get label() { return tr("health.dataCheckSummary.steps"); }, type: "Steps", unit: "", combine: "sum", value: (r) => num(r.count), pulse: (m) => m.steps },
  { key: "spo2", label: "SpO2", type: "OxygenSaturation", unit: "%", combine: "list", value: (r) => num(r.percentage), pulse: (m) => m.spo2Pct },
  { key: "hrv", get label() { return tr("breathe.BreatheScreen.hrv_49a6fe"); }, type: "HeartRateVariabilityRmssd", unit: "ms", combine: "list", value: (r) => num(r.heartRateVariabilityMillis), pulse: (m) => m.hrvMs },
  { key: "rhr", get label() { return tr("chart.model.restingHr"); }, type: "RestingHeartRate", unit: "bpm", combine: "list", value: (r) => num(r.beatsPerMinute), pulse: (m) => m.rhrBpm },
  { key: "resp", get label() { return tr("health.dataCheckSummary.breathing"); }, type: "RespiratoryRate", unit: "rpm", combine: "list", value: (r) => num(r.rate), pulse: (m) => m.respBpm },
  { key: "distance", get label() { return tr("health.dataCheckSummary.distance"); }, type: "Distance", unit: "km", combine: "sum", value: (r) => { const d = r.distance as { inMeters?: number } | undefined; return d?.inMeters == null ? null : d.inMeters / 1000; } },
  { key: "calories", get label() { return tr("health.dataCheckSummary.calories"); }, type: "TotalCaloriesBurned", unit: "kcal", combine: "sum", value: (r) => { const e = r.energy as { inKilocalories?: number } | undefined; return e?.inKilocalories ?? null; }, pulse: (m) => m.calories },
  { key: "vo2", get label() { return tr("health.dataCheckSummary.vo2Max"); }, type: "Vo2Max", unit: "", combine: "list", value: (r) => num(r.vo2MillilitersPerMinuteKilogram), pulse: (m) => m.vo2maxDaily ?? m.vo2maxRun },
];

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export const sourceOf = (r: RawRecord): string => {
  const t = r.metadata?.device?.type;
  const app = (r.metadata?.dataOrigin || "unknown app").replace(/^com\.fitbit\.FitbitMobile$/, tr("health.dataCheckSummary.fitbitApp")).replace(/^com\.google\.android\.apps\.fitness$/, "Google Fit");
  return `${app}/${t == null ? tr("health.dataCheckSummary.noDevice") : (DEVICE_NAME[t] ?? `type ${t}`)}`;
};

const startOf = (r: RawRecord): number | null => {
  const iso = r.time ?? r.startTime;
  const ms = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
};

const hhmm = (s: number, tz: string) => {
  const d = new Date(s * 1000);
  const f = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz });
  return f.format(d);
};

export type SourceLine = { source: string; fitbit: boolean; records: number; value: number | null; detail: string };
export type MetricLine = { key: string; label: string; unit: string; pulse: number | null; sources: SourceLine[] };
export type DayCheck = { day: string; metrics: MetricLine[]; sleep: { pulse: string[]; sources: SourceLine[] } };

/** Groups each metric's raw records by local day and source; `pulse` is what Pulse stored for that day. */
export function summarize(raw: Partial<Record<ReadType, RawRecord[]>>, sleepRaw: RawRecord[], metrics: Metrics[], sessions: Session[], days: string[], tz: string, values: { day: string; key: string; value: number }[] = []): DayCheck[] {
  const byDay = new Map(metrics.map((m) => [m.day, m]));
  const valueOn = (day: string, key: string) => values.find((v) => v.day === day && v.key === key)?.value ?? null;
  return days.map((day) => {
    const lines: MetricLine[] = CHECK_METRICS.map((cm) => {
      const groups = new Map<string, { fitbit: boolean; values: { t: number; v: number }[] }>();
      for (const r of raw[cm.type] ?? []) {
        const t = startOf(r);
        if (t == null || localDay(t, tz) !== day) continue;
        const v = cm.value(r);
        if (v == null) continue;
        const key = sourceOf(r);
        const g = groups.get(key) ?? { fitbit: isFitbit(cm.type, r), values: [] };
        g.values.push({ t, v });
        groups.set(key, g);
      }
      const sources: SourceLine[] = [...groups].map(([source, g]) => {
        const vs = g.values.sort((a, b) => a.t - b.t);
        const total = vs.reduce((a, x) => a + x.v, 0);
        const value = cm.combine === "sum" ? total : cm.combine === "mean" || cm.combine === "list" ? total / vs.length : vs[vs.length - 1].v;
        const detail =
          cm.combine === "list"
            ? vs.slice(0, 8).map((x) => `${hhmm(x.t, tz)} ${round(x.v)}`).join(", ") + (vs.length > 8 ? ` +${vs.length - 8}` : "")
            : `${hhmm(vs[0].t, tz)}–${hhmm(vs[vs.length - 1].t, tz)}`;
        return { source, fitbit: g.fitbit, records: vs.length, value: round(value), detail };
      });
      sources.sort((a, b) => Number(b.fitbit) - Number(a.fitbit) || b.records - a.records);
      const m = byDay.get(day);
      const pulse = cm.key === "distance" ? valueOn(day, "distance") : m && cm.pulse ? cm.pulse(m) : null;
      return { key: cm.key, label: cm.label, unit: cm.unit, pulse, sources };
    });
    // Sleep: Health Connect sessions ending on this day, and the sessions Pulse kept.
    const sleepSources: SourceLine[] = [];
    for (const r of sleepRaw) {
      const end = r.endTime ? Math.floor(Date.parse(r.endTime) / 1000) : null;
      const start = startOf(r);
      if (end == null || start == null || localDay(end, tz) !== day) continue;
      const stages = (r.stages as { stage: number }[] | undefined) ?? [];
      const kinds = [...new Set(stages.map((s) => s.stage))].sort().join(",");
      sleepSources.push({ source: sourceOf(r), fitbit: isFitbit("SleepSession", r), records: 1, value: round((end - start) / 3600), detail: tr("diagnostic.stages", { start: hhmm(start, tz), end: hhmm(end, tz), count: stages.length, codes: kinds || tr("diagnostic.none") }) });
    }
    const pulseSleep = sessions
      .filter((s) => s.day === day)
      .map((s) => tr("diagnostic.session", { kind: tr(s.isMain ? "diagnostic.main" : "diagnostic.nap"), start: hhmm(s.startTs, tz), end: hhmm(s.endTs, tz), minutes: s.asleepMin ?? "?", staged: s.stagesStatus === "SUCCEEDED" ? tr("health.dataCheckSummary.staged") : "" }));
    return { day, metrics: lines, sleep: { pulse: pulseSleep, sources: sleepSources } };
  });
}

const round = (v: number) => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10);

/**
 * Plain-text report (for Share and for reading back from the device). `opts.source` and `opts.legend` replace the
 * Health Connect header and star legend (the Google check, src/google/dataCheck.ts).
 */
export function formatReport(days: DayCheck[], policy: string, opts: { source?: string; legend?: string } = {}): string {
  const out: string[] = [
    opts.source ? tr("health.dataCheckSummary.pulseDataCheck", { v0: opts.source }) : tr("health.dataCheckSummary.pulseDataCheckSourcePolicy", { v0: policy }),
    opts.legend ?? tr("diagnostic.legend"),
  ];
  for (const d of days) {
    out.push("", `■ ${d.day}`);
    for (const m of d.metrics) {
      if (!m.sources.length && m.pulse == null) continue;
      out.push(`  ${m.label}: Pulse ${m.pulse == null ? "—" : round(m.pulse)}${m.unit ? ` ${m.unit}` : ""}`);
      for (const s of m.sources) out.push(`    ${s.fitbit ? "★" : " "} ${s.source}: ${s.value}${m.unit ? ` ${m.unit}` : ""} (${tr("diagnostic.records", { count: s.records, detail: s.detail })})`);
    }
    if (d.sleep.sources.length || d.sleep.pulse.length) {
      out.push(tr("health.dataCheckSummary.sleepPulse", { v0: d.sleep.pulse.join(" | ") || "—" }));
      for (const s of d.sleep.sources) out.push(`    ${s.fitbit ? "★" : " "} ${s.source}: ${s.value} h (${s.detail})`);
    }
  }
  return out.join("\n");
}
