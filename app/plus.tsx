import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
import { useLocalSearchParams } from "expo-router";
import { PlusPage } from "@/screens/home/PlusMenu";

// The menu under My Day's "+" (src/screens/home/PlusMenu.tsx); `label` is "Add to today" or "Add to Mon., Sep. 28".
export default function Plus() {
  useLanguage();
  const { label } = useLocalSearchParams<{ label?: string }>();
  return <PlusPage label={label ?? tr("home.HomeScreen.addToToday")} />;
}
