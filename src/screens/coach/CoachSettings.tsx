import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Coach settings `/coach/settings` (spec §7.21 Settings › Coach), ported from pulse src/app/(app)/coach/CoachSettings.tsx
// via halo: Provider, Model and the key as ••••last4; Change, Remove key, Delete chats, Turn off; and About you, up to
// 500 characters of the person's own notes for the coach. Without consent or a provider, the setup steps instead.
import { useState } from "react";
import { View } from "react-native";
import { MAX_NOTES } from "@/coach/instructions";
import { providerLabel } from "@/coach/providers";
import { useCoachSetup } from "@/coach/session";
import { deleteAllChats, removeProvider, setConsent, setInstructions } from "@/coach/storage";
import { Card } from "@/ui/Card";
import { Text } from "@/ui/Text";
import { toast } from "@/ui/Toast";
import { DetailShell } from "@/ui/shells/DetailShell";
import { GROUP_LABEL } from "@/ui/shells/LinkList";
import { ConfirmDialog, Field, HINT, ROW, ROW_LABEL, ROW_RULE, ROW_VALUE, SmallButton, TextField } from "@/screens/settings/controls";
import { cn } from "@/ui/cn";
import { ConnectProvider, Consent } from "./CoachSetup";

const failed = () => toast.error(tr("coach.CoachSettings.couldnTSaveThatOnThisPhone"));

function Row({ label, value, first }: { label: string; value: string; first?: boolean }) {
  useLanguage();
  return (
    <View className={cn(ROW, "px-4", !first && ROW_RULE)}>
      <Text className={ROW_LABEL}>{label}</Text>
      <Text className={ROW_VALUE}>{value}</Text>
    </View>
  );
}

function Notes({ saved }: { saved: string | null }) {
  useLanguage();
  const [text, setText] = useState(saved ?? "");
  return (
    <Field label={tr("coach.CoachSettings.aboutYou")} hint={tr("coach.CoachSettings.howYouDLikeTheCoachTo")} optional>
      <TextField
        accessibilityLabel={tr("coach.CoachSettings.aboutYou")}
        value={text}
        onChangeText={setText}
        onBlur={() => text.trim() !== (saved ?? "") && void setInstructions(text).catch(failed)}
        multiline
        maxLength={MAX_NOTES}
        placeholder={tr("coach.CoachSettings.shortAndDirectILiftFourDays")}
        className="min-h-24 py-3"
        textAlignVertical="top"
      />
    </Field>
  );
}

type Confirm = "key" | "chats" | "off" | null;

export function CoachSettings() {
  useLanguage();
  const setup = useCoachSetup();
  const [changing, setChanging] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pending, setPending] = useState(false);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setPending(true);
    try {
      await fn();
      toast.success(done);
    } catch {
      failed();
    }
    setPending(false);
    setConfirm(null);
  };
  const DIALOG = {
    key: { title: tr("coach.CoachSettings.removeYourKey"), description: tr("coach.CoachSettings.theCoachStopsAnsweringUntilYouAdd"), label: tr("coach.CoachSettings.removeKey"), go: () => run(removeProvider, tr("coach.CoachSettings.keyRemoved")) },
    chats: { title: tr("coach.CoachSettings.deleteEveryChat"), description: tr("coach.CoachSettings.everyChatOnThisPhoneIsRemoved"), label: tr("coach.CoachSettings.deleteChats"), go: () => run(deleteAllChats, tr("coach.CoachSettings.chatsDeleted")) },
    off: { title: tr("coach.CoachSettings.turnOffTheCoach"), description: tr("coach.CoachSettings.yourKeyIsRemovedAndTheCoach"), label: tr("coach.CoachSettings.turnOff"), go: () => run(async () => (await removeProvider(), await setConsent(false)), tr("coach.CoachSettings.coachTurnedOff")) },
  } as const;

  const body =
    setup === undefined ? null : !setup.consent ? (
      <Consent />
    ) : !setup.provider || changing ? (
      <View className="gap-4">
        <ConnectProvider current={setup} onSaved={() => setChanging(false)} />
        {changing && <SmallButton label={tr("common.cancel")} onPress={() => setChanging(false)} />}
      </View>
    ) : (
      <View className="gap-6">
        <View className="gap-2">
          <Text className={GROUP_LABEL}>{tr("coach.CoachSettings.provider")}</Text>
          <Card>
            <Row first label={tr("coach.CoachSettings.provider")} value={providerLabel(setup.provider)} />
            <Row label={tr("coach.CoachSettings.model")} value={setup.model ?? ""} />
            <Row label={tr("coach.CoachSettings.apiKey")} value={setup.last4 ? `••••${setup.last4}` : tr("coach.CoachSettings.notSaved")} />
          </Card>
          <View className="flex-row flex-wrap gap-2">
            <SmallButton label={tr("onboarding.ProfileForm.change")} onPress={() => setChanging(true)} />
            <SmallButton label={tr("coach.CoachSettings.removeKey")} onPress={() => setConfirm("key")} />
          </View>
        </View>
        <Notes key={setup.instructions ?? ""} saved={setup.instructions} />
        <View className="gap-2">
          <Text className={GROUP_LABEL}>{tr("coach.ChatsScreen.chats")}</Text>
          <Text className={HINT}>{tr("coach.CoachSettings.savedOnThisPhoneVisibleOnlyTo")}</Text>
          <View className="flex-row flex-wrap gap-2">
            <SmallButton label={tr("coach.CoachSettings.deleteChats")} onPress={() => setConfirm("chats")} />
            <SmallButton label={tr("coach.CoachSettings.turnOff")} onPress={() => setConfirm("off")} />
          </View>
        </View>
      </View>
    );

  const d = confirm && DIALOG[confirm];
  return (
    <DetailShell
      title={tr("coach.CoachScreen.coachSettings")}
      backHref="/more"
      loading={setup === undefined}
      primary={
        <View>
          {body}
          <ConfirmDialog open={!!d} title={d?.title ?? ""} description={d?.description ?? ""} confirmLabel={d?.label ?? ""} pendingLabel={tr("onboarding.ProfileForm.saving")} pending={pending} onCancel={() => setConfirm(null)} onConfirm={() => void d?.go()} />
        </View>
      }
    />
  );
}
