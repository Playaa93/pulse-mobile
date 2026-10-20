import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// The Sample data card at the top of every tab root (docs/onboarding.md), while the database holds onboarding's generated
// demo. "Connect your data" opens `/connect`: Health Connect grants access first, then the sample is cleared.
import { ArrowUpRight } from "lucide-react-native";
import { Card } from "../Card";
import { Icon } from "../Icon";
import { LABEL } from "../metrics/primitives";
import { push } from "../navigate";
import { Press } from "../Press";
import { Text } from "../Text";
import { useShellSync } from "./ShellStatus";

export function SampleCard() {
  useLanguage();
  if (!useShellSync()?.sample) return null;
  return (
    <Card className="mb-6 gap-1 px-4">
      <Text className={LABEL}>{tr("settings.DataSource.sampleData")}</Text>
      <Text className="text-[13px] leading-[18px] text-foreground-secondary">{tr("ui.shells.SampleCard.theseNumbersAreGeneratedForExploringThe")}</Text>
      <Press activeOpacity={0.7} accessibilityRole="link" onPress={() => push("/connect")} className="mt-2 min-h-11 flex-row items-center justify-between">
        <Text className="text-[15px] font-semibold leading-5">{tr("ui.shells.SampleCard.connectYourData")}</Text>
        <Icon icon={ArrowUpRight} size={18} tone="foreground-secondary" strokeWidth={1.75} />
      </Press>
    </Card>
  );
}
