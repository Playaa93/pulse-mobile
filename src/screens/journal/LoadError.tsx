import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
import { CircleAlert } from "lucide-react-native";
import { View } from "react-native";
import { EmptyState } from "@/ui/shells/EmptyState";

/** The web's error view for every (app) route (app/(app)/error.tsx): the screen offers a retry. */
export function LoadError({ retry }: { retry: () => void }) {
  useLanguage();
  return (
    <View accessibilityRole="alert" className="pt-16">
      <EmptyState icon={CircleAlert} body={tr("health.ErrorView.couldnTLoadThisScreen")} action={{ label: tr("common.retry"), onClick: retry }} />
    </View>
  );
}
