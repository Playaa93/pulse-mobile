import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// The web's (app)/error.tsx: the shell stays, the screen offers a retry. Pulse's copy.
import { View } from "react-native";
import { CircleAlert } from "lucide-react-native";
import { DetailShell } from "@/ui/shells/DetailShell";
import { EmptyState } from "@/ui/shells/EmptyState";
import { PageShell } from "@/ui/shells/PageShell";

function Body({ retry }: { retry: () => void }) {
  useLanguage();
  return (
    <View accessibilityRole="alert" className="pt-16">
      <EmptyState icon={CircleAlert} body={tr("health.ErrorView.couldnTLoadThisScreen")} action={{ label: tr("common.retry"), onClick: retry }} />
    </View>
  );
}

/** `detail`: a pushed screen keeps its Back button. */
export function ErrorView({ retry, detail }: { retry: () => void; detail?: boolean }) {
  useLanguage();
  return detail ? <DetailShell title="Pulse" primary={<Body retry={retry} />} /> : <PageShell title="Pulse"><Body retry={retry} /></PageShell>;
}
