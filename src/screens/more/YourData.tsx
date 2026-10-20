import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Your data `/more/data` (U21): your daily scores and journal answers as CSV or JSON. Ported from pulse
// (app)/more/data/page.tsx and loading.tsx. A download becomes the system share sheet (src/actions/export.ts): Save to
// Files, AirDrop, Drive, mail. The web's Backup card was never in the page; there is nothing else to export or restore here.
import { useState } from "react";
import { View } from "react-native";
import { Download } from "lucide-react-native";
import { type ExportFormat, type ExportKind, shareExport } from "@/actions/export";
import { DAY, formatDay, FORMATS } from "@/lib/format";
import { getYourData } from "@/queries/settings";
import { queryCtx } from "@/state/app";
import { Button } from "@/ui/Button";
import { haptic } from "@/ui/haptics";
import { Icon } from "@/ui/Icon";
import { CAPTION } from "@/ui/metrics/primitives";
import { Skeleton, SkeletonText } from "@/ui/Skeleton";
import { DetailShell } from "@/ui/shells/DetailShell";
import { SectionShell } from "@/ui/shells/SectionShell";
import { Text } from "@/ui/Text";
import { BODY } from "../settings/controls";
import { toast } from "@/ui/Toast";
import { useScreen } from "../useScreen";



/** A button that opens the share sheet with one export. */
function DownloadLink({ kind, format, busy, setBusy }: { kind: ExportKind; format: ExportFormat; busy: string | null; setBusy: (id: string | null) => void }) {
  useLanguage();
  const id = `${kind}-${format}`;
  return (
    <Button
      variant="secondary"
      className="flex-1"
      disabled={busy !== null}
      accessibilityLabel={`${kind === "daily" ? tr("more.YourData.dailyScores") : tr("ui.shells.TabBar.journal")} ${format.toUpperCase()}`}
      onPress={async () => {
        haptic.tap();
        setBusy(id);
        const r = await shareExport(queryCtx(), kind, format);
        setBusy(null);
        if (!r.ok) toast.error(r.error);
      }}
    >
      <Icon icon={Download} size={20} tone="secondary-foreground" />
      <Text className="text-[13px] font-bold uppercase tracking-[0.1em] text-secondary-foreground">{busy === id ? tr("more.YourData.preparing") : format.toUpperCase()}</Text>
    </Button>
  );
}

const renderCount = () => <SkeletonText className="w-16" />;
const renderButtons = () => (
  <View className="mt-4 flex-row gap-2">
    <Skeleton className="h-11 flex-1 rounded-xl" />
    <Skeleton className="h-11 flex-1 rounded-xl" />
  </View>
);

const renderLoadingPrimary = () => (
  <View accessibilityElementsHidden className="w-full gap-3">
    <SectionShell variant="card" title={tr("more.YourData.dailyScores")} aside={renderCount()}>
      <SkeletonText lh={22} fs={15} className="w-full" />
      <SkeletonText lh={22} fs={15} className="w-full" />
      <SkeletonText lh={22} fs={15} className="w-3/4" />
      {renderButtons()}
    </SectionShell>
    <SectionShell variant="card" title={tr("ui.shells.TabBar.journal")} aside={renderCount()}>
      <Text className={BODY}>{tr("more.YourData.everyCheckInAnswerHiddenBehavioursIncluded")}</Text>
      {renderButtons()}
    </SectionShell>
  </View>
);

function Loading() {
  useLanguage();
  return (
    <DetailShell
      loading
      title={tr("more.MoreScreen.yourData")}
      primary={renderLoadingPrimary()}
      bodySkeleton={renderLoadingPrimary()}
    />
  );
}

export function YourDataScreen() {
  useLanguage();
  const { data } = useScreen(async (ctx) => ({ vm: await getYourData(ctx) }), ["yourData"]);
  const [busy, setBusy] = useState<string | null>(null);
  if (!data) return <Loading />;
  const { vm } = data;
  const since = vm.first ? tr("more.YourData.since", { v0: formatDay(vm.first, DAY.full) }) : "";
  const link = (kind: ExportKind, format: ExportFormat) => <DownloadLink kind={kind} format={format} busy={busy} setBusy={setBusy} />;

  return (
    <View className="flex-1">
      <DetailShell
        title={tr("more.MoreScreen.yourData")}
        bodySkeleton={renderLoadingPrimary()}
        primary={
          <View className="w-full gap-3">
            <SectionShell variant="card" title={tr("more.YourData.dailyScores")} aside={<Text className={`${CAPTION} tabular-nums`}>{FORMATS.grouped(vm.days)}{" "}{tr("unit.day", { count: vm.days })}</Text>}>
              <Text className={BODY}>
                {tr("more.YourData.oneRowPerDay")}{since}{tr("more.YourData.recoveryStrainSleepPerformanceHoursAndConsistency")}</Text>
              <View className="mt-4 flex-row gap-2">
                {link("daily", "csv")}
                {link("daily", "json")}
              </View>
            </SectionShell>

            <SectionShell variant="card" title={tr("ui.shells.TabBar.journal")} aside={<Text className={`${CAPTION} tabular-nums`}>{FORMATS.grouped(vm.answers)}{" "}{tr("unit.answer", { count: vm.answers })}</Text>}>
              <Text className={BODY}>{tr("more.YourData.everyCheckInAnswerHiddenBehavioursIncluded")}</Text>
              <View className="mt-4 flex-row gap-2">
                {link("journal", "csv")}
                {link("journal", "json")}
              </View>
            </SectionShell>

            <Text className={CAPTION}>{tr("more.YourData.exportsHoldOnlyWhatPulseStoredOn")}</Text>
          </View>
        }
      />
    </View>
  );
}
