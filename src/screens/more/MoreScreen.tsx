import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// More `/more` (spec §7.14, U21): everything that isn't configuration. Ported from pulse (app)/more/page.tsx and
// loading.tsx: "Account & settings" (Profile, Data source, App, each a row to `/settings?s=`), Reports, Trends, Journal,
// Help, Your data, then About. The account row is Profile (no accounts); Coach opens the coach's settings.
import { View } from "react-native";
import { Activity, Archive, Bell, Bluetooth, BotMessageSquare, BookOpen, CalendarDays, CalendarRange, ChartLine, Database, ListChecks, Palette, Plug, Target, UserRound, Wind } from "lucide-react-native";
import { formatDay, rangeLabel } from "@/lib/format";
import { SCORING_VERSION } from "@/pipeline";
import { APP_VERSION, getMore } from "@/queries/settings";
import { LinkList, LinkListSkeleton, MORE_COLUMN, type LinkListRow } from "@/ui/shells/LinkList";
import { PageShell } from "@/ui/shells/PageShell";
import { useScreen } from "../useScreen";
import { About } from "./About";
import { SCORE_DOCS } from "./howItWorksContent";

/** Each part of Settings is a row here, as the reference app's "Account & settings". */
const settings: LinkListRow[] = [
  { icon: UserRound, get label() { return tr("settings.ProfileCard.profile"); }, href: "/settings?s=profile" },
  { icon: Plug, get label() { return tr("settings.DataSource.dataSource"); }, href: "/settings?s=source" },
  { icon: Palette, get label() { return tr("settings.AppSettings.app"); }, href: "/settings?s=app" },
  { icon: Bell, get label() { return tr("settings.AppSettings.notificationsBackground"); }, href: "/settings?s=notifications" },
  { icon: Bluetooth, get label() { return tr("settings.LiveHeartRate.liveHeartRate"); }, href: "/settings?s=live" },
  { icon: BotMessageSquare, label: "Coach", href: "/coach/settings" },
  { icon: Target, get label() { return tr("goals.Goals.goals"); }, href: "/settings?s=goals" },
];

/** Both sessions that run on the band's live heart rate (halo's "Live" group). */
const LIVE_LINKS: LinkListRow[] = [
  { icon: Wind, get label() { return tr("breathe.BreatheScreen.breathe"); }, get description() { return tr("more.MoreScreen.pacedBreathingWithHrvBeforeAndAfter"); }, href: "/breathe" },
  { icon: Activity, get label() { return tr("more.MoreScreen.liveWorkout"); }, get description() { return tr("more.MoreScreen.strainCoachOnYourBandSLive"); }, href: "/workout-live" },
];

/** The More tab's key; Home prefetches it with getMore. */
export const MORE_KEY = ["more"] as const;

export function MoreScreen() {
  useLanguage();
  const { data: vm } = useScreen(getMore, MORE_KEY);
  if (!vm)
    return (
      <PageShell loading title={tr("ui.shells.TabBar.more")}>
        <View className={MORE_COLUMN}>
          <LinkListSkeleton title={tr("more.MoreScreen.accountSettings")} rows={settings} />
          <LinkListSkeleton
            title={tr("reports.ReportsScreen.reports")}
            rows={[
              { icon: CalendarRange, label: tr("settings.NotificationsSection.weeklyReport") },
              { icon: CalendarDays, label: tr("reports.ReportScreen.monthlyReport") },
              { icon: Archive, label: tr("more.MoreScreen.allReports") },
            ]}
          />
          <LinkListSkeleton title={tr("more.MoreScreen.trends")} rows={[{ icon: ChartLine, label: tr("more.MoreScreen.trends") }]} />
          <LinkListSkeleton title={tr("more.MoreScreen.live")} rows={LIVE_LINKS} />
          <LinkListSkeleton title={tr("ui.shells.TabBar.journal")} rows={[{ icon: ListChecks, label: tr("more.Behaviours.behaviours") }]} />
          <LinkListSkeleton title={tr("more.MoreScreen.help")} rows={[{ icon: BookOpen, label: tr("more.HowItWorks.howPulseWorks") }]} />
          <LinkListSkeleton title={tr("more.MoreScreen.yourData")} rows={[{ icon: Database, label: tr("more.MoreScreen.export") }]} />
          <About version={APP_VERSION} scoringVersion={SCORING_VERSION} />
        </View>
      </PageShell>
    );

  const reports: LinkListRow[] = [
    ...(vm.latestWeek ? [{ icon: CalendarRange, label: tr("settings.NotificationsSection.weeklyReport"), aside: rangeLabel(vm.latestWeek.start, vm.latestWeek.end), href: `/reports/${vm.latestWeek.period}` }] : []),
    ...(vm.latestMonth ? [{ icon: CalendarDays, label: tr("reports.ReportScreen.monthlyReport"), aside: formatDay(vm.latestMonth.start, { month: "long" }), href: `/reports/${vm.latestMonth.period}` }] : []),
    { icon: Archive, label: tr("more.MoreScreen.allReports"), aside: vm.reportCount ? String(vm.reportCount) : undefined, href: "/reports" },
  ];
  return (
    <PageShell title={tr("ui.shells.TabBar.more")}>
      {/* One column, as Settings: a list reads top to bottom. */}
      <View className={MORE_COLUMN}>
        <LinkList title={tr("more.MoreScreen.accountSettings")} rows={settings} />
        <LinkList title={tr("reports.ReportsScreen.reports")} rows={reports} />
        <LinkList title={tr("more.MoreScreen.trends")} rows={[{ icon: ChartLine, label: tr("more.MoreScreen.trends"), aside: tr("more.MoreScreen.upTo1Year"), href: "/trends" }]} />
        <LinkList title={tr("more.MoreScreen.live")} rows={LIVE_LINKS} />
        <LinkList title={tr("ui.shells.TabBar.journal")} rows={[{ icon: ListChecks, label: tr("more.Behaviours.behaviours"), aside: tr("more.MoreScreen.ofShown", { v0: vm.behaviours.shown, v1: vm.behaviours.total }), href: "/more/behaviours" }]} />
        <LinkList title={tr("more.MoreScreen.help")} rows={[{ icon: BookOpen, label: tr("more.HowItWorks.howPulseWorks"), aside: tr("more.MoreScreen.scores", { v0: SCORE_DOCS.length }), href: "/more/how-it-works" }]} />
        <LinkList title={tr("more.MoreScreen.yourData")} rows={[{ icon: Database, label: tr("more.MoreScreen.export"), aside: "CSV, JSON", href: "/more/data" }]} />
        <About version={vm.version} scoringVersion={vm.scoringVersion} />
      </View>
    </PageShell>
  );
}
