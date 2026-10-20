import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Settings › Live heart rate (`/settings?s=live`), from halo src/screens/settings/liveHr.tsx (its behaviour and copy;
// drawn with Pulse's kit). Three cards: the band (status, the remembered band, auto-connect, Go live / Stop, Forget),
// the permissions, and Go live: the three steps in Google Health, then the scan, the bands it finds and the
// connection. A scan runs only when asked: Search / Go live here, or once on arrival from Heart rate's Go live (`go=1`).
//
// The band shares heart rate with the standard Bluetooth Heart Rate Service once Google Health › Fitbit Air ›
// Connections › Share heart rate is on (src/health/ble.ts). Live readings are for viewing only: scores keep using what
// Pulse reads from Health Connect.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { BatteryMedium, Bluetooth, BluetoothOff, ChevronRight, ExternalLink, Info, Watch, type LucideIcon } from "lucide-react-native";
import { BACKGROUND_GRACE_MS } from "@/health/ble";
import { signalWord } from "@/health/bleHr";
import { MISSING } from "@/lib/format";
import { showsLive, useLiveBle, useLiveBleControl, type FoundDevice, type LiveControl, type LiveData } from "@/state/liveBle";
import { Button } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { Icon } from "@/ui/Icon";
import { BeatingHeart, GoLiveButton, LivePill, StopLiveButton } from "@/ui/metrics/LiveHeartRate";
import { CAPTION, ValueUnit } from "@/ui/metrics/primitives";
import { Press } from "@/ui/Press";
import { SectionShell } from "@/ui/shells/SectionShell";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";
import { openApp } from "../../../modules/pulse-bt";
import { BODY, ConfirmDialog, HINT, ROW, ROW_LABEL, ROW_RULE, ROW_VALUE, Switch } from "./controls";

type Live = LiveControl & LiveData;

const GOOGLE_HEALTH = "com.fitbit.FitbitMobile";
/** How long Pulse keeps the band after leaving the foreground, in words. */
const graceWords = () => tr("format.seconds", { count: Math.round(BACKGROUND_GRACE_MS / 1000) });
const WARN = "text-[13px] font-semibold leading-[18px] text-warning-text";

/** The status in a few words. */
function statusLabel(l: Live): string {
  switch (l.status) {
    case "live":
      return tr("settings.LiveHeartRate.liveBpm", { v0: l.bpm ?? MISSING });
    case "lost":
      return tr("settings.LiveHeartRate.reconnecting");
    case "connecting":
      return tr("settings.LiveHeartRate.connecting");
    case "scanning":
      return tr("settings.LiveHeartRate.searching");
    case "unauthorized":
      return tr("settings.LiveHeartRate.needsPermission");
    case "off":
      return l.radio === "unsupported" ? tr("settings.LiveHeartRate.noBluetooth") : l.radio === "unavailable" ? tr("settings.LiveHeartRate.notAvailable") : tr("settings.LiveHeartRate.bluetoothOff");
    default:
      return tr("settings.DataSource.notConnected");
  }
}

function Row({ label, value, tone, rule }: { label: string; value: string; tone?: string; rule?: boolean }) {
  useLanguage();
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} className={cn(ROW, rule && ROW_RULE)}>
      <Text className={ROW_LABEL}>{label}</Text>
      <Text className={cn(ROW_VALUE, tone)}>{value}</Text>
    </View>
  );
}

/** A tinted box with an icon and a line or two: the band's state when there is no list to show. */
function Panel({ icon, title, body }: { icon: ReactNode; title: string; body?: string | null }) {
  useLanguage();
  return (
    <View accessibilityRole="summary" className="flex-row items-center gap-3 rounded-xl bg-foreground/[0.04] p-4">
      <View className="size-11 shrink-0 items-center justify-center rounded-xl bg-fill-faint">{icon}</View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold leading-[22px]">{title}</Text>
        {!!body && <Text className={HINT}>{body}</Text>}
      </View>
    </View>
  );
}

// ── The band ─────────────────────────────────────────────────────────────────

// The per-beat rows read the live data themselves (≤ 4 renders a second); the cards around them take the controller only.
function StatusRow() {
  useLanguage();
  const live = useLiveBle();
  return <Row label={tr("settings.LiveHeartRate.status")} value={statusLabel(live)} tone={live.status === "live" ? "text-recovery-red-text" : undefined} />;
}

function HrvRow() {
  useLanguage();
  const live = useLiveBle();
  return <Row rule label={tr("settings.LiveHeartRate.hrvRmssd")} value={live.rmssd === null ? (live.rrMs.length ? tr("settings.LiveHeartRate.measuring") : tr("settings.LiveHeartRate.notSentByTheBand")) : `${Math.round(live.rmssd)} ms`} />;
}

function BandCard({ live, onFind }: { live: LiveControl; onFind: () => void }) {
  useLanguage();
  const [confirmForget, setConfirmForget] = useState(false);
  const [forgetting, setForgetting] = useState(false);
  const linked = live.status === "live" || live.status === "connecting" || live.status === "lost";
  const noRadio = live.radio === "unsupported" || live.radio === "unavailable";
  const remembered = live.remembered;
  return (
    <SectionShell variant="card" title={tr("settings.LiveHeartRate.liveHeartRate")}>
      <View>
        <StatusRow />
        <Row rule label={tr("settings.LiveHeartRate.band")} value={remembered ? (remembered.name ?? tr("copy.fallback.unnamed_band")) : tr("settings.LiveHeartRate.noneYet")} />
        {live.status === "live" && <HrvRow />}
        <View className={cn(ROW, ROW_RULE, !remembered && "opacity-disabled")}>
          <View className="min-w-0 flex-1">
            <Text className={ROW_LABEL}>{tr("settings.LiveHeartRate.connectAutomatically")}</Text>
            <Text className={HINT}>{tr("settings.LiveHeartRate.offByDefaultToSaveTheBand")}</Text>
          </View>
          <Switch label={tr("settings.LiveHeartRate.connectAutomatically")} value={live.autoConnect} disabled={!remembered} onValueChange={(v) => void live.setAutoConnect(v)} />
        </View>
      </View>
      {!!live.error && !linked && (
        <Text accessibilityRole="alert" className={cn(WARN, "mt-2")}>
          {live.error}
        </Text>
      )}
      <View className="mt-4 gap-2">
        {linked ? (
          <StopLiveButton onPress={() => void live.disconnect()} />
        ) : (
          <GoLiveButton status={live.status} onPress={() => (remembered ? void live.connect(remembered.id) : onFind())} disabled={noRadio} />
        )}
        {remembered && (
          <Button variant="outline" textClassName="text-recovery-red-text" onPress={() => setConfirmForget(true)}>
            {tr("settings.LiveHeartRate.forgetBand")}</Button>
        )}
      </View>
      <ConfirmDialog
        open={confirmForget}
        title={tr("settings.LiveHeartRate.forgetThisBand")}
        description={tr("settings.LiveHeartRate.pulseDisconnectsAndStopsReconnectingToIt")}
        confirmLabel={tr("settings.LiveHeartRate.forgetBand")}
        pendingLabel={tr("settings.LiveHeartRate.forgetting")}
        pending={forgetting}
        onCancel={() => setConfirmForget(false)}
        onConfirm={async () => {
          setForgetting(true);
          await live.forget();
          setForgetting(false);
          setConfirmForget(false);
        }}
      />
    </SectionShell>
  );
}

function PermissionsCard({ live }: { live: LiveControl }) {
  useLanguage();
  const [btHint, setBtHint] = useState<string | null>(null);
  const noRadio = live.radio === "unsupported" || live.radio === "unavailable";
  const permission = live.permission === "granted" ? tr("settings.DataSource.allowed") : live.permission === "blocked" ? tr("settings.LiveHeartRate.blockedInAndroidSettings") : tr("settings.LiveHeartRate.notAllowedYet");
  const radio = live.radio === "on" ? tr("settings.LiveHeartRate.on") : live.radio === "off" ? tr("settings.LiveHeartRate.off") : live.radio === "turning" ? tr("settings.LiveHeartRate.turningOnOrOff") : noRadio ? tr("settings.LiveHeartRate.notAvailable") : tr("settings.LiveHeartRate.unknown");
  return (
    <SectionShell variant="card" title={tr("settings.LiveHeartRate.permissions")}>
      <View>
        <Row label={tr("settings.LiveHeartRate.nearbyDevices")} value={permission} tone={live.permission === "granted" ? undefined : "text-warning-text"} />
        <Row rule label="Bluetooth" value={radio} tone={live.radio === "on" ? undefined : "text-warning-text"} />
      </View>
      <Text className={cn(HINT, "mt-2")}>{tr("settings.LiveHeartRate.androidAsksForNearbyDevicesScanAnd")}</Text>
      {live.permission !== "granted" && (
        <Button className="mt-4" onPress={() => void live.requestPermission()}>
          {live.permission === "blocked" ? tr("settings.LiveHeartRate.openAndroidSettings") : tr("settings.LiveHeartRate.allowNearbyDevices")}
        </Button>
      )}
      {live.permission === "granted" && live.radio === "off" && (
        <Button className="mt-4" onPress={() => void live.turnOnBluetooth().then((ok) => setBtHint(ok ? null : tr("settings.LiveHeartRate.turnBluetoothOnFromQuickSettings")))}>
          {tr("settings.LiveHeartRate.turnOnBluetooth")}</Button>
      )}
      {!!btHint && <Text className={cn(WARN, "mt-2")}>{btHint}</Text>}
    </SectionShell>
  );
}

// ── Go live ──────────────────────────────────────────────────────────────────

const STEPS: { title: string; body: string }[] = [
  { get title() { return tr("settings.LiveHeartRate.shareHeartRate"); }, get body() { return tr("settings.LiveHeartRate.inGoogleHealthOpenYourFitbitAir"); } },
  { get title() { return tr("settings.LiveHeartRate.alwaysVisibleOptional"); }, get body() { return tr("settings.LiveHeartRate.turnItOnSoTheBandKeeps"); } },
  { get title() { return tr("settings.LiveHeartRate.connect"); }, get body() { return tr("settings.LiveHeartRate.comeBackToPulseItLooksFor"); } },
];

function Steps() {
  useLanguage();
  const [missing, setMissing] = useState(false);
  return (
    <View className="gap-4">
      {/* Straight to where the setting lives. */}
      <Button variant="secondary" onPress={() => setMissing(!openApp(GOOGLE_HEALTH))} accessibilityLabel={tr("settings.LiveHeartRate.openGoogleHealth")}>
        <Icon icon={ExternalLink} size={16} tone="secondary-foreground" strokeWidth={2.25} />
        <Text className="text-[13px] font-bold uppercase tracking-[0.1em] text-secondary-foreground">{tr("settings.LiveHeartRate.openGoogleHealth")}</Text>
      </Button>
      {missing && <Text className={WARN}>{tr("settings.LiveHeartRate.couldnTOpenGoogleHealthOpenIt")}</Text>}
      {STEPS.map((s, i) => (
        <View key={s.title} accessible accessibilityLabel={tr("settings.LiveHeartRate.step", { v0: i + 1, v1: s.title, v2: s.body })} className="flex-row gap-3">
          <View className="size-8 items-center justify-center rounded-full bg-fill-faint">
            <Text className="font-numeric text-base font-bold">{String(i + 1)}</Text>
          </View>
          <View className="min-w-0 flex-1 pt-1">
            <Text className="text-[15px] font-semibold leading-[22px]">{s.title}</Text>
            <Text className={BODY}>{s.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function Note({ icon, children }: { icon: LucideIcon; children: string }) {
  useLanguage();
  return (
    <View className="flex-row gap-2.5">
      <View className="mt-0.5">
        <Icon icon={icon} size={16} tone="muted-foreground" strokeWidth={2} />
      </View>
      <Text className={cn(HINT, "flex-1")}>{children}</Text>
    </View>
  );
}

function DeviceRow({ d, onPress, aside, rule }: { d: FoundDevice; onPress: () => void; aside?: string; rule?: boolean }) {
  useLanguage();
  const signal = signalWord(d.rssi);
  const detail = [d.paired ? tr("settings.LiveHeartRate.pairedWithThisPhone") : d.likely ? tr("settings.LiveHeartRate.likelyYourBand") : null, signal ? tr("settings.LiveHeartRate.signal", { v0: signal }) : null, aside ?? null].filter(Boolean).join(" · ");
  return (
    <Press
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel={tr("settings.LiveHeartRate.connectTo", { v0: d.name ?? tr("copy.fallback.unnamed_device"), v1: detail ? `, ${detail}` : "" })}
      onPress={onPress}
      className={cn("min-h-14 flex-row items-center gap-3 py-2", rule && ROW_RULE)}
    >
      <View className="size-11 shrink-0 items-center justify-center rounded-xl bg-fill-faint">
        <Icon icon={Watch} size={20} tone={d.likely ? "recovery-red-text" : "foreground-secondary"} strokeWidth={2} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[15px] font-semibold leading-[22px]">{d.name ?? tr("copy.fallback.unnamed_device")}</Text>
        {!!detail && <Text className={HINT}>{detail}</Text>}
      </View>
      <Text className="text-xs font-bold uppercase leading-4 tracking-[0.1em] text-foreground-secondary">{tr("settings.LiveHeartRate.connect")}</Text>
      <Icon icon={ChevronRight} size={16} tone="foreground-secondary" strokeWidth={2} />
    </Press>
  );
}

function secondsUntil(at: number | null, now: number) {
  return at === null ? null : Math.max(0, Math.ceil((at - now) / 1000));
}

/** What the link is doing, or the scan's list. */
function BandState() {
  useLanguage();
  const live = useLiveBle();
  const { c } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (live.retryAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live.retryAt]);
  const name = live.device?.name ?? live.remembered?.name ?? tr("display.band");

  if (live.status === "off") {
    if (live.radio === "unsupported" || live.radio === "unavailable")
      return (
        <Panel
          icon={<Icon icon={BluetoothOff} size={20} tone="foreground-secondary" strokeWidth={2} />}
          title={live.radio === "unsupported" ? tr("settings.LiveHeartRate.noBluetoothHere") : tr("settings.LiveHeartRate.bluetoothIsnTAvailable")}
          body={live.radio === "unsupported" ? tr("settings.LiveHeartRate.thisPhoneOrEmulatorHasNoBluetooth") : tr("settings.LiveHeartRate.thisBuildOfPulseCanTUse")}
        />
      );
    return <Panel icon={<Icon icon={BluetoothOff} size={20} tone="warning-text" strokeWidth={2} />} title={tr("settings.LiveHeartRate.bluetoothIsOff")} body={tr("settings.LiveHeartRate.turnItOnToFindYourBand")} />;
  }
  if (live.status === "unauthorized")
    return (
      <Panel
        icon={<Icon icon={Bluetooth} size={20} tone="warning-text" strokeWidth={2} />}
        title={tr("settings.LiveHeartRate.allowNearbyDevices")}
        body={live.permission === "blocked" ? tr("settings.LiveHeartRate.nearbyDevicesIsOffForPulseAllow") : tr("settings.LiveHeartRate.pulseNeedsItToFindAndConnect")}
      />
    );
  if (showsLive(live))
    return (
      <View accessibilityRole="summary" className="flex-row items-center gap-4 rounded-xl bg-foreground/[0.04] p-4">
        <View className="size-13 items-center justify-center rounded-xl bg-fill-faint">
          <BeatingHeart bpm={live.bpm ?? 60} live={live.status === "live"} size={26} />
        </View>
        <View className="min-w-0 flex-1 gap-1.5">
          <ValueUnit value={live.bpm === null ? MISSING : String(live.bpm)} unit="bpm" className="font-numeric text-[34px] font-bold leading-[38px]" />
          <LivePill name={live.device?.name ?? null} lost={live.status === "lost"} />
        </View>
      </View>
    );
  if (live.status === "connecting" || live.status === "lost") {
    const wait = secondsUntil(live.retryAt, now);
    return (
      <Panel
        icon={<ActivityIndicator size="small" color={c["recovery-red"]} />}
        title={`${live.status === "lost" ? tr("settings.LiveHeartRate.reconnectingTo") : tr("settings.LiveHeartRate.connectingTo")} ${name}…`}
        body={wait !== null && wait > 0 ? tr("settings.LiveHeartRate.tryingAgainInS", { v0: live.error ? `${live.error} ` : "", v1: wait }) : live.error}
      />
    );
  }

  // idle / scanning: the list.
  const remembered = live.remembered && !live.found.some((d) => d.id === live.remembered!.id) ? live.remembered : null;
  return (
    <View>
      {live.status === "scanning" && (
        <View className="flex-row items-center gap-2.5 py-2">
          <ActivityIndicator size="small" color={c["recovery-red"]} />
          <Text className={cn(BODY, "flex-1")}>{tr("settings.LiveHeartRate.lookingForBandsSharingHeartRate")}</Text>
        </View>
      )}
      {live.found.map((d, i) => (
        <DeviceRow key={d.id} rule={i > 0} d={d} onPress={() => void live.connect(d.id)} aside={live.remembered?.id === d.id ? tr("settings.LiveHeartRate.lastUsed") : undefined} />
      ))}
      {remembered && (
        <DeviceRow
          rule={live.found.length > 0}
          d={{ id: remembered.id, name: remembered.name, rssi: null, likely: true }}
          onPress={() => void live.connect(remembered.id)}
          aside={live.status === "scanning" ? tr("settings.LiveHeartRate.lastUsedNotSeenYet") : tr("settings.LiveHeartRate.lastUsed")}
        />
      )}
      {live.status === "idle" && !!live.error && (
        <Text accessibilityRole="alert" className={cn(WARN, "mt-2")}>
          {live.error}
        </Text>
      )}
    </View>
  );
}

/** The one action the band's state calls for (halo's Go-live sheet footer). */
function BandAction({ live }: { live: LiveControl }) {
  useLanguage();
  const [btHint, setBtHint] = useState<string | null>(null);
  let action: ReactNode = null;
  if (live.status === "off") {
    if (live.radio !== "unsupported" && live.radio !== "unavailable")
      action = <Button onPress={() => void live.turnOnBluetooth().then((ok) => setBtHint(ok ? null : tr("settings.LiveHeartRate.turnBluetoothOnFromQuickSettingsThen")))}>{tr("settings.LiveHeartRate.turnOnBluetooth")}</Button>;
  } else if (live.status === "unauthorized")
    action = <Button onPress={() => void live.requestPermission()}>{live.permission === "blocked" ? tr("settings.DataSource.openSettings") : tr("settings.LiveHeartRate.allowNearbyDevices")}</Button>;
  else if (live.status === "live" || live.status === "connecting" || live.status === "lost")
    action = (
      <Button variant="secondary" onPress={() => void live.disconnect()}>
        {live.status === "live" ? tr("settings.LiveHeartRate.disconnect") : tr("common.cancel")}
      </Button>
    );
  else if (live.status === "scanning")
    action = (
      <Button variant="secondary" onPress={live.stopScan}>
        {tr("settings.LiveHeartRate.stopSearching")}</Button>
    );
  else action = <Button onPress={() => void live.scan()}>{live.found.length || live.error ? tr("settings.LiveHeartRate.searchAgain") : tr("settings.LiveHeartRate.searchForMyBand")}</Button>;
  return (
    <>
      {action}
      {!!btHint && live.status === "off" && <Text className={WARN}>{btHint}</Text>}
    </>
  );
}

/**
 * Scans only when the person asks: Search / Go live here, or once on arrival from Heart rate's Go live button (`go=1`).
 * Never again by itself, not on coming back to the app nor when Bluetooth comes on. Leaving stops a scan still running.
 */
function useScanOnce(live: LiveControl, on: boolean) {
  const latest = useRef(live);
  useEffect(() => {
    latest.current = live;
  });
  const done = useRef(false);
  const ready = live.loaded && live.status === "idle";
  useEffect(() => {
    if (!on || !ready || done.current) return;
    done.current = true;
    void latest.current.scan();
  }, [on, ready]);
  useEffect(() => () => latest.current.stopScan(), []);
}

function GoLiveCard({ live, scanOnArrival }: { live: LiveControl; scanOnArrival: boolean }) {
  useLanguage();
  useScanOnce(live, scanOnArrival);
  return (
    <SectionShell variant="card" title={tr("settings.LiveHeartRate.goLive")}>
      <Text className={cn(BODY, "mb-4")}>{tr("settings.LiveHeartRate.beatByBeatFromYourBandOver")}</Text>
      <Steps />
      <Text className={cn(CAPTION, "mb-2 mt-6 uppercase tracking-[0.1em]")}>{tr("settings.LiveHeartRate.yourBand")}</Text>
      <View className="gap-3">
        <BandState />
        <BandAction live={live} />
      </View>
      <View className="mt-6 gap-2.5">
        <Note icon={BatteryMedium}>
          {tr("settings.LiveHeartRate.sharingUsesTheBandSBatteryAnd", { v0: graceWords() })}
        </Note>
        <Note icon={Info}>{tr("settings.LiveHeartRate.liveReadingsAreForViewingScoresUse")}</Note>
      </View>
    </SectionShell>
  );
}

/** Settings › Live heart rate (`/settings?s=live`; `&go=1` scans on arrival). */
export function LiveHeartRate() {
  useLanguage();
  const live = useLiveBleControl();
  const { go } = useLocalSearchParams<{ go?: string }>();
  return (
    <>
      <BandCard live={live} onFind={() => void live.scan()} />
      <GoLiveCard live={live} scanOnArrival={go === "1"} />
      <PermissionsCard live={live} />
    </>
  );
}
