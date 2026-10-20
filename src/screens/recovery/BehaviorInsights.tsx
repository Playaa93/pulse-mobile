import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// The reference app's Behavior Insights card on Recovery (recovery-11, spec §11 R34): a lightbulb title linking to
// Journal insights, one line of copy, then a chip per behaviour from the day before, green up when it has gone with a
// higher next-day Recovery, orange down when lower, grey when no clear effect. Ported from pulse
// src/components/metrics/BehaviorInsights.tsx.
import { View } from "react-native"
import { Lightbulb } from "lucide-react-native"
import type { BehaviorChip } from "@/queries/mobileExtras"
import { Icon } from "@/ui/Icon"
import { StatusChip } from "@/ui/metrics/primitives"
import { SectionShell } from "@/ui/shells/SectionShell"
import { Text } from "@/ui/Text"

const TONE = { up: "optimal", down: "warning", neutral: "neutral" } as const
const DIR = { up: "up", down: "down", neutral: "flat" } as const
const SPOKEN = { get up() { return tr("recovery.BehaviorInsights.wentWithHigherRecovery"); }, get down() { return tr("recovery.BehaviorInsights.wentWithLowerRecovery"); }, get neutral() { return tr("recovery.BehaviorInsights.noClearEffect"); } } as const

export function BehaviorInsights({ chips, href }: { chips: BehaviorChip[]; href: string }) {
  useLanguage();
  if (!chips.length) return null
  return (
    <SectionShell variant="card" title={tr("recovery.BehaviorInsights.behaviorInsights")} info={false} href={href} icon={<Icon icon={Lightbulb} size={20} tone="foreground" />}>
      <Text className="text-[15px] leading-[22px] text-foreground-secondary">{tr("recovery.BehaviorInsights.someOfYourBehaviorsFromYesterdayMay")}</Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {chips.map((c) => (
          <View key={c.key} accessible accessibilityLabel={`${c.label}${SPOKEN[c.effect]}`}>
            <StatusChip tone={TONE[c.effect]} delta={DIR[c.effect]} className="min-h-8 rounded-lg px-3" textClassName="text-[13px]">
              {c.label}
            </StatusChip>
          </View>
        ))}
      </View>
    </SectionShell>
  )
}
