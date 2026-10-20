import { HEALTH_RECORD_LABEL } from "@/lib/healthRecordLabels";
import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Settings › Data source: Health Connect, as halo's src/screens/settings/sections.tsx shows it, in Pulse's section look.
// The source row (availability, last sync), what needs doing (access revoked, permissions missing, the last failure),
// the running import, Sync now and Re-import, the sample data, the source policy, the data check, and every record
// type's permission folded underneath. The state is the app's (src/state/app.ts); permissions are re-read whenever the
// app comes back from Health Connect's settings.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppState, Pressable, Share, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Check, ChevronDown, Minus, RefreshCw, TriangleAlert } from "lucide-react-native";
import { askPermissions, openHealthConnectSettings, permissionState, READ_TYPES, type PermissionState } from "@/health/connect";
import { runDataCheck } from "@/health/dataCheck";
import { getSourcePolicy, setSourcePolicy, SOURCE_POLICIES, SOURCE_POLICY_LABELS, type SourcePolicy } from "@/health/sourcePolicy";
import { ago } from "@/lib/format";
import { appState, appStore, exploreSample, refresh, reimport, stepLabel, useApp } from "@/state/app";
import { BandIcon } from "@/ui/brand";
import { HealthConnectMark } from "@/ui/HealthConnectMark";
import { cn } from "@/ui/cn";
import { haptic } from "@/ui/haptics";
import { Button, BUTTON_LABEL } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { CAPTION } from "@/ui/metrics/primitives";
import { push } from "@/ui/navigate";
import { SectionShell } from "@/ui/shells/SectionShell";
import { Text } from "@/ui/Text";
import { toast } from "@/ui/Toast";
import { useTheme } from "@/ui/theme";
import { DURATION } from "@/ui/motion";
import { BODY, ConfirmDialog, HINT, ProgressBar, RadioSegments, ROW_LABEL, ROW_RULE } from "./controls";

/** What Health Connect has granted, re-read whenever the app comes back to the foreground (from its settings). */
function usePermissions(enabled: boolean) {
  const [state, setState] = useState<PermissionState | null>(null);
  const read = useCallback(() => permissionState().then(setState, () => setState(null)), []);
  useEffect(() => {
    if (!enabled) return;
    void read();
    const sub = AppState.addEventListener("change", (s) => s === "active" && void read());
    return () => sub.remove();
  }, [enabled, read]);
  return { state, read };
}

/** Per record type, folded under one summary line; it opens itself when something is not allowed. */
function DataTypes({ perms }: { perms: PermissionState }) {
  useLanguage();
  const missing = perms.missing.length + (perms.history ? 0 : 1);
  const rows = [...READ_TYPES.map((t) => ({ key: t, label: HEALTH_RECORD_LABEL[t], ok: perms.granted.includes(t) })), { key: "history", label: tr("settings.DataSource.pastData"), ok: perms.history }];
  const summary = missing ? tr("settings.DataSource.notAllowed_7326f9", { v0: missing }) : tr("settings.DataSource.allAllowed");
  const [open, setOpen] = useState(missing > 0);
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withTiming(open ? "180deg" : "0deg", { duration: DURATION.base }) }] }), [open]);
  return (
    <View className="mt-4 border-t border-border">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptic.toggle(!open);
          setOpen(!open);
        }}
        className="min-h-13 flex-row items-center justify-between gap-3 rounded-md py-2"
      >
        <Text className={ROW_LABEL}>{tr("settings.DataSource.dataTypes")}</Text>
        <View className="shrink flex-row items-center gap-2">
          <Text className={cn("text-[13px] leading-[18px]", missing ? "text-warning-text" : "text-muted-foreground")}>{summary}</Text>
          <Animated.View style={chevron}>
            <Icon icon={ChevronDown} size={16} tone="muted-foreground" strokeWidth={2} />
          </Animated.View>
        </View>
      </Pressable>
      {open && (
        <View className="border-t border-border">
          {rows.map((r, i) => (
            <View key={r.key} accessible accessibilityLabel={`${r.label}, ${r.ok ? tr("settings.DataSource.allowed") : tr("settings.DataSource.notAllowed")}`} className={cn("min-h-12 flex-row items-center gap-3 py-2", i > 0 && ROW_RULE)}>
              <Text numberOfLines={1} className="min-w-0 flex-1 text-[15px] leading-[22px]">
                {r.label}
              </Text>
              <Text className={cn(CAPTION, "shrink-0", !r.ok && "text-warning-text")}>{r.ok ? tr("settings.DataSource.allowed") : tr("settings.DataSource.notAllowed_e03151")}</Text>
              {r.ok ? <Icon icon={Check} size={16} tone="optimal-text" strokeWidth={2.5} /> : <Icon icon={Minus} size={16} tone="muted-foreground" strokeWidth={2} />}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Spinner({ spinning }: { spinning: boolean }) {
  useLanguage();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (spinning) turn.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
    else {
      cancelAnimation(turn);
      turn.value = 0;
    }
  }, [spinning, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <Icon icon={RefreshCw} size={20} tone="secondary-foreground" strokeWidth={2} />
    </Animated.View>
  );
}

function SyncNowButton({ syncing }: { syncing: boolean }) {
  useLanguage();
  return (
    <Button
      variant="secondary"
      className="basis-48 grow"
      disabled={syncing}
      onPress={async () => {
        haptic.tap();
        await refresh();
        const { error } = appState();
        if (error) toast.error(tr("settings.DataSource.lastSyncFailed", { v0: error }));
        else toast.success(tr("settings.DataSource.synced"));
      }}
    >
      <Spinner spinning={syncing} />
      <Text className={cn(BUTTON_LABEL, "text-secondary-foreground")}>{syncing ? tr("settings.DataSource.syncing") : tr("settings.DataSource.syncNow")}</Text>
    </Button>
  );
}

/** Which Health Connect records Pulse uses: Fitbit only (default), Fitbit first, or every app. A change re-imports. */
function SourcePolicyPicker({ syncing }: { syncing: boolean }) {
  useLanguage();
  const [policy, setPolicy] = useState<SourcePolicy | null>(null);
  useEffect(() => {
    let live = true;
    void getSourcePolicy().then((p) => live && setPolicy(p));
    return () => {
      live = false;
    };
  }, []);
  const choose = async (p: SourcePolicy) => {
    if (p === policy || syncing) return;
    setPolicy(p);
    await setSourcePolicy(p);
    toast.success(tr("settings.DataSource.reImportingYourHistory", { v0: SOURCE_POLICY_LABELS[p].label }));
    void reimport();
  };
  return (
    <View className="mt-4 gap-2 border-t border-border pt-4">
      <Text className={ROW_LABEL}>{tr("settings.DataSource.useDataFrom")}</Text>
      <RadioSegments
        label={tr("settings.DataSource.useDataFrom")}
        value={policy}
        textClassName="text-[13px] leading-[18px]"
        options={SOURCE_POLICIES.map((p) => ({ value: p, label: tr(`sourcePolicy.${p}.short`), accessibilityLabel: SOURCE_POLICY_LABELS[p].label }))}
        onChange={(p) => void choose(p)}
      />
      {policy && <Text className={HINT}>{SOURCE_POLICY_LABELS[policy].detail}</Text>}
    </View>
  );
}

type Confirm = "sample" | "reimport" | null;

/** The running sync's step and percent. It reads the progress itself, so a tick redraws this line, not the card. */
function SyncProgress() {
  useLanguage();
  const progress = useApp((s) => s.progress);
  if (!progress || progress.total <= 0) return null;
  return (
    <View accessibilityLiveRegion="polite" className="mt-4 gap-2">
      <Text className="text-[15px] leading-[22px] tabular-nums">
        {stepLabel(progress.step)}… {Math.floor((progress.done / progress.total) * 100)}%
      </Text>
      <ProgressBar value={(progress.done / progress.total) * 100} label={tr("settings.DataSource.syncProgress")} />
    </View>
  );
}

export function DataSource({ now }: { now: number }) {
  useLanguage();
  const { c } = useTheme();
  const source = useApp((s) => s.source);
  const status = useApp((s) => s.status);
  const lastSyncTs = useApp((s) => s.sync.lastSyncTs);
  const error = useApp((s) => s.error ?? s.sync.lastError);
  const availability = useApp((s) => s.availability);
  const warnings = useApp((s) => s.warnings);
  const hc = source === "health_connect";
  const sample = source === "demo";
  const syncing = status === "syncing";
  const perms = usePermissions(hc);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [checking, setChecking] = useState(false);
  const last = lastSyncTs ? lastSyncTs * 1000 : null;
  const revoked = hc && !!perms.state && perms.state.granted.length === 0;
  const needsPermissions = hc && !!perms.state && !revoked && (perms.state.missing.length > 0 || !perms.state.history);

  const label = sample ? tr("settings.DataSource.sampleData") : hc ? "Health Connect" : tr("settings.DataSource.notConnected");
  const state: { line: string; tone?: string; body?: string } = sample
    ? { line: tr("settings.DataSource.180DaysOfADemoPerson"), body: tr("settings.DataSource.everyScreenRunsOnGeneratedDataConnect") }
    : !hc
      ? { line: tr("settings.DataSource.notConnected"), body: tr("settings.DataSource.connectHealthConnectWhereTheGoogleHealth") }
      : revoked
        ? { line: tr("settings.DataSource.accessRevoked"), tone: "text-recovery-red-text", body: tr("settings.DataSource.healthConnectAccessWasRemovedSyncIs") }
        : availability === "update_required"
          ? { line: last ? tr("ui.shells.SyncStatus.synced", { v0: ago(last, Math.max(now, last)) }) : tr("settings.DataSource.notSyncedYet"), tone: "text-warning-text", body: tr("settings.DataSource.healthConnectNeedsAnUpdateUpdateIt") }
          : availability === "unavailable"
            ? { line: tr("settings.LiveHeartRate.notAvailable"), tone: "text-warning-text", body: tr("onboarding.Connect.healthConnectIsnTAvailableOnThis") }
            : { line: syncing ? tr("settings.DataSource.syncing") : last ? tr("ui.shells.SyncStatus.synced", { v0: ago(last, Math.max(now, last)) }) : tr("settings.DataSource.notSyncedYet") };

  const allow = async () => {
    const p = await askPermissions().catch(() => null);
    await perms.read();
    if (p && p.granted.length) void refresh();
  };

  const dataCheck = async () => {
    setChecking(true);
    try {
      const { text } = await runDataCheck(appStore(), { timeZone: appState().profile?.timeZone ?? "UTC" });
      await Share.share({ message: text, title: tr("settings.DataSource.pulseDataCheck") });
    } catch {
      toast.error(tr("settings.DataSource.couldnTRunTheDataCheckTry"));
    }
    setChecking(false);
  };

  return (
    <SectionShell variant="card" title={tr("settings.DataSource.dataSource")}>
      <View className="min-h-11 flex-row items-center gap-3">
        <View accessibilityElementsHidden className="size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-fill-faint">
          {sample ? <BandIcon size={24} color={c.foreground} /> : <HealthConnectMark size={26} />}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold leading-[22px]">{label}</Text>
          <Text numberOfLines={1} className={cn("text-[13px] leading-[18px] tabular-nums text-muted-foreground", state.tone)}>
            {state.line}
          </Text>
        </View>
      </View>
      {state.body && <Text className={cn(BODY, "mt-3")}>{state.body}</Text>}
      {!!error && !syncing && (
        <Text accessibilityRole="alert" className={cn(CAPTION, "mt-3 text-recovery-red-text")}>
          {tr("settings.DataSource.lastSyncFailed", { v0: error })}
        </Text>
      )}
      {hc && !syncing && warnings.includes("no_fitbit_records") && (
        <Callout
          title={tr("settings.DataSource.nothingFromYourFitbitYet")}
          body={tr("settings.DataSource.withFitbitOnlyPulseFoundNoRecords")}
        />
      )}
      {needsPermissions && (
        <Callout title={tr("settings.DataSource.pulseNeedsMorePermissions")} body={tr("settings.DataSource.allowEveryDataTypeIncludingPastData")}>
          <View className="mt-3 flex-row gap-2">
            <Button className="flex-1" onPress={() => void allow()}>
              {tr("settings.DataSource.allow")}</Button>
            <Button variant="secondary" className="flex-1" onPress={() => void openHealthConnectSettings()}>
              {tr("settings.DataSource.openSettings")}</Button>
          </View>
        </Callout>
      )}
      {syncing && <SyncProgress />}
      <View className="mt-4 gap-2">
        {hc ? (
          <>
            <View className="flex-row flex-wrap gap-2">
              {revoked ? (
                <Button className="basis-48 grow" onPress={() => void allow()}>
                  {tr("settings.DataSource.allowAccess")}</Button>
              ) : (
                <SyncNowButton syncing={syncing} />
              )}
              <Button variant="outline" className="basis-36 grow" disabled={syncing} onPress={() => setConfirm("reimport")}>
                {tr("settings.DataSource.reImport")}</Button>
            </View>
            <Button variant="secondary" onPress={() => void openHealthConnectSettings()}>
              {tr("onboarding.Connect.openHealthConnect")}</Button>
            <Button variant="secondary" disabled={syncing} onPress={() => setConfirm("sample")}>
              {tr("settings.DataSource.useSampleData")}</Button>
          </>
        ) : (
          <Button disabled={syncing || availability === "unavailable"} onPress={() => push("/connect")}>
            {tr("settings.DataSource.connectHealthConnect")}</Button>
        )}
      </View>
      {hc && <SourcePolicyPicker syncing={syncing} />}
      {hc && (
        <View className="mt-4 gap-2 border-t border-border pt-4">
          <Text className={ROW_LABEL}>{tr("settings.DataSource.dataCheck")}</Text>
          <Text className={HINT}>{tr("settings.DataSource.comparesTheLast10DaysInHealth")}</Text>
          <Button variant="secondary" disabled={checking} onPress={() => void dataCheck()}>
            {checking ? tr("settings.DataSource.checking") : tr("settings.DataSource.runDataCheck")}
          </Button>
        </View>
      )}
      {hc && perms.state && <DataTypes key={String(perms.state.missing.length)} perms={perms.state} />}
      <ConfirmDialog
        open={confirm === "reimport"}
        title={tr("settings.DataSource.reImportYourHistory")}
        description={tr("settings.DataSource.pulseReadsTheLast180DaysFrom")}
        confirmLabel={tr("settings.DataSource.reImport")}
        pendingLabel={tr("settings.DataSource.reImport")}
        pending={false}
        confirmVariant="primary"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void reimport();
        }}
      />
      <ConfirmDialog
        open={confirm === "sample"}
        title={tr("settings.DataSource.useSampleData_65e361")}
        description={tr("settings.DataSource.pulseRemovesWhatItImportedFromHealth")}
        confirmLabel={tr("settings.DataSource.useSampleData")}
        pendingLabel={tr("settings.DataSource.useSampleData")}
        pending={false}
        confirmVariant="primary"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          exploreSample().catch(() => toast.error(tr("onboarding.OnboardingScreen.couldnTBuildTheSampleDataTry")));
        }}
      />
    </SectionShell>
  );
}

/** Something that needs doing: the section's callout (a tinted box with a warning title). */
function Callout({ title, body, children }: { title: string; body: string; children?: ReactNode }) {
  useLanguage();
  return (
    <View accessibilityRole="summary" className="mt-4 rounded-xl bg-foreground/[0.04] p-4">
      <View className="flex-row items-center gap-2">
        <Icon icon={TriangleAlert} size={16} tone="warning-text" strokeWidth={2} />
        <Text accessibilityRole="header" className="shrink text-[15px] font-semibold leading-[22px]">
          {title}
        </Text>
      </View>
      <Text className={cn(BODY, "mt-1")}>{body}</Text>
      {children}
    </View>
  );
}
