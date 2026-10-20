import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Settings › Notifications & background (`/settings?s=notifications`). Content follows halo's
// src/screens/settings/notifications.tsx, drawn with Pulse's own kit. Two cards. Background sync: the WorkManager task
// (src/background/task.ts), Health Connect's background read permission and the task's last runs. Notifications: the
// alerts (src/background/decide.ts, smart.ts), the daily check-in with its time, the wind-down lead and a test.
// Turning any notification on asks for Android 13's POST_NOTIFICATIONS permission first.
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, View } from "react-native";
import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { applyBedtime } from "@/background/alerts";
import { DEEP_LINK, formatTime, parseTime, recoveryBody } from "@/background/decide";
import { readLog, type RunLogEntry } from "@/background/log";
import { askNotificationPermission, notificationPermission, sendNow, type NotificationPermission } from "@/background/notify";
import { BEDTIME_LEADS, DEFAULT_SETTINGS, readSettings, writeSettings, type BackgroundSettings } from "@/background/settings";
import type { BedtimeReminder } from "@/background/smart";
import { applyCheckIn } from "@/background/startup";
import { backgroundSyncAvailable, isBackgroundSyncRegistered, runBackgroundTask, syncRegistration } from "@/background/task";
import { askBackgroundPermission, permissionState } from "@/health/connect";
import { clock, DAY, formatDay } from "@/lib/format";
import { localDay } from "@/lib/time";
import { deviceTimeZone, useApp } from "@/state/app";
import { Button } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { Segmented } from "@/ui/Segmented";
import { SectionShell } from "@/ui/shells/SectionShell";
import { Text } from "@/ui/Text";
import { toast } from "@/ui/Toast";
import { HINT, ROW, ROW_LABEL, ROW_RULE, ROW_VALUE, SmallButton, Switch } from "./controls";

function SwitchRow({ label, hint, value, onChange, disabled, rule = true }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; rule?: boolean }) {
  useLanguage();
  return (
    <View className={cn(ROW, rule && ROW_RULE, disabled && "opacity-disabled")}>
      <View className="min-w-0 flex-1">
        <Text className={ROW_LABEL}>{label}</Text>
        {!!hint && <Text className={HINT}>{hint}</Text>}
      </View>
      <Switch label={label} value={value} onValueChange={onChange} disabled={disabled} />
    </View>
  );
}

/** Settings and the notification permission, loaded once and re-read when the app returns from system settings. */
function useNotificationSettings() {
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const refresh = useCallback(
    () =>
      Promise.all([readSettings(), notificationPermission()]).then(([s, p]) => {
        setSettings(s);
        setPermission(p);
      }),
    [],
  );
  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (s) => s === "active" && void refresh());
    return () => sub.remove();
  }, [refresh]);
  const update = useCallback(async (patch: Partial<BackgroundSettings>) => {
    const next = await writeSettings(patch);
    setSettings(next);
    return next;
  }, []);
  return { settings, permission, setPermission, update };
}
type Prefs = ReturnType<typeof useNotificationSettings>;

// ── Background sync ──────────────────────────────────────────────────────────

const RESULT_WORD: Record<RunLogEntry["result"], string> = { get ok() { return tr("settings.DataSource.synced"); }, get skipped() { return tr("settings.NotificationsSection.skipped"); }, get failed() { return tr("settings.NotificationsSection.failed"); } };
const RESULT_TONE: Record<RunLogEntry["result"], string> = { ok: "text-optimal-text", skipped: "text-muted-foreground", failed: "text-recovery-red-text" };

function LastRuns({ log, timeZone }: { log: RunLogEntry[]; timeZone: string }) {
  useLanguage();
  if (!log.length) return <Text className={cn(HINT, "mt-2")}>{tr("settings.NotificationsSection.noBackgroundRunsYet")}</Text>;
  return (
    <View className="mt-2">
      <Text accessibilityRole="header" className="text-[13px] font-semibold leading-[18px] text-foreground-secondary">
        {tr("settings.NotificationsSection.lastRuns")}</Text>
      {log.slice(0, 6).map((e, i) => (
        <View key={e.at} className={cn("py-2", i > 0 && ROW_RULE)}>
          <View className="flex-row items-center justify-between gap-3">
            <Text className={cn(ROW_LABEL, "tabular-nums")}>{`${formatDay(localDay(e.at / 1000, timeZone), DAY.monthDay)}, ${clock(e.at, timeZone)}`}</Text>
            <Text className={cn("text-[13px] font-semibold tabular-nums", RESULT_TONE[e.result])}>{`${RESULT_WORD[e.result]} · ${(e.ms / 1000).toFixed(1)} s`}</Text>
          </View>
          {!!e.note && <Text className={HINT}>{e.note}</Text>}
        </View>
      ))}
    </View>
  );
}

function BackgroundCard({ s, timeZone }: { s: Prefs; timeZone: string }) {
  useLanguage();
  const hc = useApp((a) => a.source === "health_connect");
  const [log, setLog] = useState<RunLogEntry[]>([]);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [available, setAvailable] = useState(true);
  const [background, setBackground] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(
    () =>
      Promise.all([readLog(), isBackgroundSyncRegistered(), backgroundSyncAvailable(), hc ? permissionState().catch(() => null) : null]).then(([l, r, a, p]) => {
        setLog(l);
        setRegistered(r);
        setAvailable(a);
        setBackground(p ? p.background : null);
      }),
    [hc],
  );
  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (st) => st === "active" && void refresh());
    return () => sub.remove();
  }, [refresh]);

  const toggle = async (on: boolean) => {
    await s.update({ backgroundSync: on });
    await syncRegistration(on);
    await refresh();
    if (on && background === false) toast.error(tr("settings.NotificationsSection.allowBackgroundAccessSoPulseCanRead"));
  };
  const allow = async () => {
    setBusy(true);
    try {
      const p = await askBackgroundPermission().catch(() => null);
      setBackground(p ? p.background : null);
      if (p?.background) toast.success(tr("settings.NotificationsSection.backgroundAccessAllowed"));
      else toast.error(tr("settings.NotificationsSection.backgroundAccessWasNotAllowed"));
    } finally {
      setBusy(false);
    }
  };
  const runNow = async () => {
    setBusy(true);
    try {
      await runBackgroundTask();
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const access = background === null ? tr("settings.NotificationsSection.checkingHealthConnect") : background ? tr("settings.DataSource.allowed") : tr("settings.DataSource.notAllowed_e03151");
  return (
    <SectionShell variant="card" title={tr("settings.NotificationsSection.backgroundSync")}>
      <SwitchRow
        rule={false}
        label={tr("settings.NotificationsSection.backgroundSync")}
        hint={hc ? tr("settings.NotificationsSection.importsHealthConnectAndRescoresWhilePulse") : tr("settings.NotificationsSection.needsHealthConnectAsTheDataSource")}
        value={s.settings.backgroundSync}
        onChange={(v) => void toggle(v)}
        disabled={!hc}
      />
      <Text className={HINT}>{tr("settings.NotificationsSection.androidRunsItRoughlyEvery15To")}</Text>
      {!available && <Text className="mt-2 text-[13px] font-medium leading-[18px] text-warning-text">{tr("settings.NotificationsSection.backgroundTasksAreRestrictedForPulseOn")}</Text>}
      {hc && (
        <>
          <View className={cn(ROW, ROW_RULE, "mt-2")}>
            <View className="min-w-0 flex-1">
              <Text className={ROW_LABEL}>{tr("settings.NotificationsSection.backgroundAccess")}</Text>
              <Text className={HINT}>{tr("settings.NotificationsSection.healthConnectOnlyAnswersAClosedApp")}</Text>
            </View>
            {background === false ? <SmallButton solid label={tr("settings.DataSource.allow")} accessibilityLabel={tr("settings.NotificationsSection.allowBackgroundAccess")} onPress={() => void allow()} /> : <Text className={ROW_VALUE}>{access}</Text>}
          </View>
        </>
      )}
      <View className={cn(ROW, ROW_RULE)}>
        <Text className={ROW_LABEL}>{tr("settings.NotificationsSection.schedule")}</Text>
        <Text className={ROW_VALUE}>{registered === null ? " " : registered ? tr("settings.NotificationsSection.scheduledWithAndroid") : tr("settings.NotificationsSection.notScheduled")}</Text>
      </View>
      <View className={ROW_RULE}>
        <LastRuns log={log} timeZone={timeZone} />
      </View>
      {__DEV__ && (
        <Button variant="secondary" className="mt-3" onPress={() => void runNow()} disabled={busy}>
          {tr("settings.NotificationsSection.runTheTaskNowDebug")}</Button>
      )}
    </SectionShell>
  );
}

// ── Notifications ────────────────────────────────────────────────────────────

/** The check-in time: the value as a button that opens the system's 24-hour time picker. */
function TimeRow({ value, onCommit, disabled }: { value: string; onCommit: (v: string) => void; disabled?: boolean }) {
  useLanguage();
  const [open, setOpen] = useState(false);
  const t = parseTime(value) ?? { hour: 21, minute: 0 };
  const date = new Date();
  date.setHours(t.hour, t.minute, 0, 0);
  return (
    <View className={cn(ROW, ROW_RULE, disabled && "opacity-disabled")} pointerEvents={disabled ? "none" : "auto"}>
      <Text className={ROW_LABEL}>{tr("settings.NotificationsSection.checkInTime")}</Text>
      <SmallButton label={value} accessibilityLabel={tr("settings.NotificationsSection.checkInTime_0dd35c", { v0: value })} onPress={() => setOpen(true)} />
      {open && (
        <DateTimePicker
          value={date}
          mode="time"
          is24Hour
          onDismiss={() => setOpen(false)}
          onValueChange={(_e, d) => {
            setOpen(false);
            const v = formatTime({ hour: d.getHours(), minute: d.getMinutes() });
            if (v !== value) onCommit(v);
          }}
        />
      )}
    </View>
  );
}

const LEADS = BEDTIME_LEADS.map((m) => ({ value: String(m), label: `${m} min` }));

function NotificationsCard({ s, timeZone }: { s: Prefs; timeZone: string }) {
  useLanguage();
  const store = useApp((a) => a.store);
  const denied = s.permission === "denied";
  // The wind-down reminder on the schedule, for its hint; re-planned on open as after a run.
  const [next, setNext] = useState<BedtimeReminder | null>(null);
  useEffect(() => {
    let live = true;
    void applyBedtime(store, timeZone).then((r) => live && setNext(r));
    return () => {
      live = false;
    };
  }, [store, timeZone]);

  /** Turning something on needs the permission; off never does. Whether the change may go ahead. */
  const allowed = async (on: boolean) => {
    if (!on || s.permission === "granted") return true;
    const p = await askNotificationPermission();
    s.setPermission(p);
    if (p !== "granted") toast.error(tr("settings.NotificationsSection.notificationsAreBlockedAllowThemForPulse"));
    return p === "granted";
  };
  const set = async (key: "recoveryReady" | "cantSync" | "strainTarget" | "healthMonitor" | "weeklyReport", on: boolean) => {
    if (await allowed(on)) await s.update({ [key]: on });
  };
  const setCheckIn = async (on: boolean) => {
    if (await allowed(on)) await applyCheckIn(await s.update({ checkIn: on }));
  };
  const setTime = async (checkInTime: string) => applyCheckIn(await s.update({ checkInTime }));
  const setWindDown = async (patch: Pick<Partial<BackgroundSettings>, "bedtime" | "bedtimeLeadMin">) => {
    if (patch.bedtime && !(await allowed(true))) return;
    await s.update(patch);
    setNext(await applyBedtime(store, timeZone));
  };
  const test = async () => {
    if (!(await allowed(true))) return;
    const ok = await sendNow({ title: tr("settings.NotificationsSection.recoveryReady"), body: tr("settings.NotificationsSection.aTestFromPulse", { v0: recoveryBody(78) }), url: DEEP_LINK.notifications });
    if (ok) toast.success(tr("settings.NotificationsSection.testNotificationSent"));
    else toast.error(tr("settings.NotificationsSection.couldnTShowANotification"));
  };
  const windDownHint = next
    ? tr("settings.NotificationsSection.nextAtForBedBy", { v0: clock(next.at * 1000, timeZone), v1: clock(next.bedtime * 1000, timeZone) })
    : tr("settings.NotificationsSection.beforeTonightSPlannedBedtimeFromThe");

  return (
    <SectionShell variant="card" title={tr("settings.NotificationsSection.notifications")}>
      {denied && (
        <View className="mb-2 gap-2">
          <Text className="text-[13px] font-medium leading-[18px] text-warning-text">{tr("settings.NotificationsSection.notificationsAreBlockedInAndroidSettingsAllow")}</Text>
          <Button variant="outline" onPress={() => void Linking.openSettings()}>
            {tr("settings.DataSource.openSettings")}</Button>
        </View>
      )}
      <SwitchRow rule={false} label={tr("settings.NotificationsSection.recoveryReady")} hint={tr("settings.NotificationsSection.onceADayWhenTodaySRecovery")} value={s.settings.recoveryReady} onChange={(v) => void set("recoveryReady", v)} disabled={denied} />
      <SwitchRow label={tr("settings.NotificationsSection.pulseCanTSync")} hint={tr("settings.NotificationsSection.onceADayWhenHealthConnectHasn")} value={s.settings.cantSync} onChange={(v) => void set("cantSync", v)} disabled={denied} />
      <SwitchRow label={tr("settings.NotificationsSection.strainTargetReached")} hint={tr("settings.NotificationsSection.onceADayWhenDayStrainReaches")} value={s.settings.strainTarget} onChange={(v) => void set("strainTarget", v)} disabled={denied} />
      <SwitchRow
        label={tr("settings.NotificationsSection.healthMonitor")}
        hint={tr("settings.NotificationsSection.whenLastNightSVitalsLeaveYour")}
        value={s.settings.healthMonitor}
        onChange={(v) => void set("healthMonitor", v)}
        disabled={denied}
      />
      <SwitchRow label={tr("settings.NotificationsSection.weeklyReport")} hint={tr("settings.NotificationsSection.mondayMorningWhenLastWeekSReport")} value={s.settings.weeklyReport} onChange={(v) => void set("weeklyReport", v)} disabled={denied} />
      <SwitchRow label={tr("settings.NotificationsSection.dailyCheckIn")} hint={tr("settings.NotificationsSection.everyDayAtTheTimeBelowOpens")} value={s.settings.checkIn} onChange={(v) => void setCheckIn(v)} disabled={denied} />
      <TimeRow value={s.settings.checkInTime} onCommit={(v) => void setTime(v)} disabled={denied || !s.settings.checkIn} />
      <SwitchRow label={tr("settings.NotificationsSection.windDown")} hint={windDownHint} value={s.settings.bedtime} onChange={(v) => void setWindDown({ bedtime: v })} disabled={denied} />
      <View className={cn("gap-2 py-3", ROW_RULE, (denied || !s.settings.bedtime) && "opacity-disabled")} pointerEvents={denied || !s.settings.bedtime ? "none" : "auto"}>
        <Text className={ROW_LABEL}>{tr("settings.NotificationsSection.remindMeBeforeBed")}</Text>
        <Segmented fill label={tr("settings.NotificationsSection.remindMeBeforeBed")} value={String(s.settings.bedtimeLeadMin)} options={LEADS} onChange={(v) => void setWindDown({ bedtimeLeadMin: Number(v) })} />
      </View>
      <Button variant="outline" className="mt-2" onPress={() => void test()} disabled={denied}>
        {tr("settings.NotificationsSection.sendATestNotification")}</Button>
      <Text className={cn(HINT, "mt-3")}>{tr("settings.NotificationsSection.alertsAreCheckedAfterEverySyncIn")}</Text>
    </SectionShell>
  );
}

export function NotificationsSection() {
  useLanguage();
  const s = useNotificationSettings();
  const timeZone = useApp((a) => a.profile?.timeZone) ?? deviceTimeZone();
  return (
    <>
      <BackgroundCard s={s} timeZone={timeZone} />
      <NotificationsCard s={s} timeZone={timeZone} />
    </>
  );
}
