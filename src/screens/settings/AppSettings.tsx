import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Settings › App (appearance, notifications). Ported from pulse (app)/settings/SettingsView.tsx (Appearance), SettingsClient
// `ThemePicker` and AppSettings.tsx. The theme is system, light or dark, kept on the device (AsyncStorage `pulse.theme`, applied
// at launch by src/state/app.ts boot). The notification toggles live in Settings › Notifications & background
// (NotificationsSection.tsx); this section links there.
import { useState } from "react";
import { colorScheme } from "nativewind";
import { Bell, Monitor, Moon, Sun } from "lucide-react-native";
import { saveTheme, type AppPrefs, type Theme } from "@/actions/preferences";
import { LinkList } from "@/ui/shells/LinkList";
import { SectionShell } from "@/ui/shells/SectionShell";
import { Text } from "@/ui/Text";
import { HINT, RadioSegments } from "./controls";

const THEMES = [
  { value: "system", get label() { return tr("settings.AppSettings.system"); }, icon: Monitor },
  { value: "light", get label() { return tr("settings.AppSettings.light"); }, icon: Sun },
  { value: "dark", get label() { return tr("settings.AppSettings.dark"); }, icon: Moon },
] as const;

/** Appearance: system, light or dark, as a radio group styled like the profile's segmented control. Kept per device. */
function ThemePicker({ initial }: { initial: Theme }) {
  useLanguage();
  const [theme, setTheme] = useState(initial);
  return (
    <RadioSegments
      label={tr("settings.AppSettings.theme")}
      value={theme}
      options={THEMES}
      feedback="toggle"
      onChange={(v) => {
        setTheme(v);
        colorScheme.set(v);
        void saveTheme(v);
      }}
    />
  );
}

export function AppSettings({ prefs }: { prefs: AppPrefs }) {
  useLanguage();
  return (
    <>
      <SectionShell variant="card" title={tr("settings.AppSettings.appearance")}>
        <ThemePicker initial={prefs.theme} />
        <Text className={`${HINT} mt-2`}>{tr("settings.AppSettings.systemFollowsThisDeviceSLightOr")}</Text>
      </SectionShell>
      <LinkList title={tr("settings.AppSettings.app")} rows={[{ icon: Bell, label: tr("settings.AppSettings.notificationsBackground"), href: "/settings?s=notifications" }]} />
    </>
  );
}
