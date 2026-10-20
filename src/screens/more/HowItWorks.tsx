import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// How Pulse works `/more/how-it-works` (U21): one row per score, each opening its explainer. Ported from pulse
// (app)/more/how-it-works/page.tsx; the copy (howItWorks.ts) is the web's content.ts, unchanged.
import { View } from "react-native";
import { LinkList } from "@/ui/shells/LinkList";
import { DetailShell } from "@/ui/shells/DetailShell";
import { Text } from "@/ui/Text";
import { SCORE_DOCS } from "./howItWorksContent";

export function HowItWorksScreen() {
  useLanguage();
  return (
    <DetailShell
      title={tr("more.HowItWorks.howPulseWorks")}
      primary={
        <View className="w-full gap-6">
          <Text className="text-[15px] leading-[22px] text-foreground-secondary">
            {tr("more.HowItWorks.whatGoesIntoEachScoreHowIt")}</Text>
          <LinkList title={tr("more.HowItWorks.scores")} rows={SCORE_DOCS.map((d) => ({ label: d.name, description: d.summary, href: `/more/how-it-works/${d.slug}` }))} />
        </View>
      }
    />
  );
}
