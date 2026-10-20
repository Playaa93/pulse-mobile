import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Nap `/sleep/nap/[id]` (spec §7.4), ported from pulse src/app/(app)/sleep/nap/[id]/page.tsx: the nap on its own, as `/sleep`
// shows the main sleep. Back falls back to that day's Sleep.
import { clock, dayLabel } from "@/lib/format";
import { dayHref } from "@/lib/url";
import { todayOf } from "@/queries/common";
import { getNap } from "@/queries/mobileExtras";
import { SleepStages } from "@/ui/metrics/SleepStages";
import { DetailShell } from "@/ui/shells/DetailShell";
import { EmptyState } from "@/ui/shells/EmptyState";
import { SectionShell } from "@/ui/shells/SectionShell";
import { useScreen } from "../useScreen";
import { napBodySkeleton, NapSkeleton } from "./NapSkeleton";

export function NapScreen({ id }: { id: string }) {
  useLanguage();
  const { data } = useScreen(async (ctx) => ({ vm: await getNap(id, ctx), today: todayOf(ctx), timeZone: ctx.timeZone }), ["nap", id]);
  if (!data) return <NapSkeleton />;
  const { vm, today, timeZone } = data;
  // The web calls notFound(): its default page says this.
  if (!vm) return <DetailShell title={tr("lib.behaviors.nap")} align="start" primary={<EmptyState body={tr("sleep.NapScreen.thisPageCouldNotBeFound")} />} />;
  return (
    <DetailShell
      title={tr("lib.behaviors.nap")}
      bodySkeleton={napBodySkeleton()}
      subtitle={tr("activity.ActivityScreen.to", { v0: dayLabel(vm.day, today), v1: clock(vm.start, timeZone), v2: clock(vm.end, timeZone) })}
      align="start"
      backHref={dayHref("/sleep", vm.day, today)}
      primary={
        <SectionShell variant="card" title={tr("lib.behaviors.nap")}>
          <SleepStages hours={vm.hours} hr={vm.hr} data={vm.stages} />
        </SectionShell>
      }
    />
  );
}
