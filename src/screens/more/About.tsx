import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// About (U21): the user's own wording, version, scoring version, the repo and its issues. Ported from
// pulse (app)/more/About.tsx. Licence and full credits stay in LICENSE, NOTICE and the README.
import { Linking, View } from "react-native";
import { ArrowUpRight } from "lucide-react-native";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { SectionShell } from "@/ui/shells/SectionShell";
import { Text } from "@/ui/Text";
import { cn } from "@/ui/cn";
import { BODY, ROW, ROW_RULE } from "../settings/controls";

export const REPO_URL = "https://github.com/adityaongit/pulse";

export function About({ version, scoringVersion }: { version: string; scoringVersion: number }) {
  useLanguage();
  return (
    <SectionShell variant="card" title={tr("more.About.about")}>
      <Text className={BODY}>{tr("more.About.scoringIsPortedFromNoopPulseIs")}</Text>
      <View className="mt-3 border-t border-border">
        {[
          [tr("more.About.version"), version],
          [tr("more.About.scoringVersion"), String(scoringVersion)],
        ].map(([k, v], i) => (
          <View key={k} className={cn(ROW, i > 0 && ROW_RULE)}>
            <Text className="text-[15px] leading-[22px]">{k}</Text>
            <Text className="font-numeric text-[15px] font-semibold leading-[22px] tabular-nums text-foreground-secondary">{v}</Text>
          </View>
        ))}
      </View>
      {/* On a narrow phone each label shrinks to stay on one line beside its arrow. */}
      <View className="mt-4 flex-row gap-2">
        <Button variant="secondary" className="flex-1" accessibilityLabel={tr("more.About.sourceCodeOpensOutsideTheApp")} onPress={() => Linking.openURL(REPO_URL)}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} className="shrink text-[13px] font-bold uppercase tracking-[0.1em] text-secondary-foreground">{tr("more.About.sourceCode")}</Text>
          <Icon icon={ArrowUpRight} size={16} tone="secondary-foreground" />
        </Button>
        <Button variant="outline" className="flex-1" accessibilityLabel={tr("more.About.reportABugOpensOutsideTheApp")} onPress={() => Linking.openURL(`${REPO_URL}/issues`)}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} className="shrink text-[13px] font-bold uppercase tracking-[0.1em]">{tr("more.About.reportABug")}</Text>
          <Icon icon={ArrowUpRight} size={16} tone="foreground" />
        </Button>
      </View>
    </SectionShell>
  );
}
