import { useLanguage } from "@/i18n/react";
import { tr } from "@/i18n";
// Coach setup (spec §7.21 Setup), ported from pulse src/app/(app)/coach/CoachSetup.tsx via halo: "Before you start"
// with Allow, then "Connect your AI provider": provider pills, the API key, the model (pre-filled), and Test and save,
// which stores the key only after one tiny request with it worked.
import { useState } from "react";
import { Linking, View } from "react-native";
import { PROVIDERS, providerOf } from "@/coach/providers";
import { testDeviceKey } from "@/coach/session";
import { saveProvider, setConsent, type CoachSetup } from "@/coach/storage";
import { Button } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { Press } from "@/ui/Press";
import { Text } from "@/ui/Text";
import { BODY, Field, HINT, TextField } from "@/screens/settings/controls";

const HEADING = "text-[22px] font-bold leading-7 text-foreground";
const ERROR = "text-[13px] leading-[18px] text-recovery-red-text";

const consentBullets = () => [
  tr("coach.CoachSetup.toAnswerTheCoachSendsYourQuestions"),
  tr("coach.CoachSetup.yourProviderSTermsAndPricingApply"),
  tr("coach.CoachSetup.chatsAreSavedOnThisPhoneVisible"),
  tr("coach.CoachSetup.answersCanBeWrongAndTheyAre"),
];

export function Consent() {
  useLanguage();
  const [error, setError] = useState<string | null>(null);
  return (
    <View className="gap-4">
      <Text accessibilityRole="header" className={HEADING}>
        {tr("coach.CoachSetup.beforeYouStart")}</Text>
      <View className="gap-3">
        {consentBullets().map((b) => (
          <View key={b} className="flex-row">
            <Text className="w-5 text-[15px] leading-[22px] text-coach-text">•</Text>
            <Text className="flex-1 text-[15px] leading-[22px] text-foreground">{b}</Text>
          </View>
        ))}
      </View>
      {error && <Text className={ERROR}>{error}</Text>}
      <Button onPress={() => void setConsent(true).catch(() => setError(tr("coach.CoachSetup.couldnTSaveThatTryAgain")))}>
        {tr("settings.DataSource.allow")}</Button>
    </View>
  );
}

/** Provider, key and model; `onSaved` runs after the key is stored (settings closes its form). */
export function ConnectProvider({ current, onSaved }: { current: CoachSetup; onSaved?: () => void }) {
  useLanguage();
  const [provider, setProvider] = useState(providerOf(current.provider)?.id ?? PROVIDERS[0].id);
  const p = providerOf(provider)!;
  const [model, setModel] = useState(current.provider === provider && current.model ? current.model : p.model);
  const [key, setKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (id: string) => {
    setProvider(id as typeof provider);
    setModel(providerOf(id)!.model);
    setError(null);
  };
  const save = async () => {
    setTesting(true);
    setError(null);
    const r = await testDeviceKey({ provider, model, apiKey: key });
    if (!r.ok) {
      setTesting(false);
      return setError(r.error);
    }
    try {
      await saveProvider(provider, model.trim(), key.trim());
      setKey("");
      onSaved?.();
    } catch {
      setError(tr("coach.CoachSetup.couldnTSaveTheKeyOnThis"));
    }
    setTesting(false);
  };

  return (
    <View className="gap-5">
      <View className="gap-2">
        <Text accessibilityRole="header" className={HEADING}>
          {tr("coach.CoachSetup.connectYourAiProvider")}</Text>
        <Text className={BODY}>{tr("coach.CoachSetup.theCoachRunsOnYourOwnAccount")}</Text>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel={tr("coach.CoachSettings.provider")} className="flex-row flex-wrap gap-2">
        {PROVIDERS.map((x) => {
          const on = x.id === provider;
          return (
            <Press
              key={x.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => pick(x.id)}
              className={cn("h-10 justify-center rounded-full border px-4", on ? "border-coach/60 bg-secondary" : "border-border")}
            >
              <Text className={cn("text-[14px] font-semibold", on ? "text-foreground" : "text-foreground-secondary")}>{x.label}</Text>
            </Press>
          );
        })}
      </View>
      <Field label={tr("coach.CoachSettings.apiKey")} hint={tr("coach.CoachSetup.storedEncryptedOnThisPhoneAndNever")}>
        <TextField accessibilityLabel={tr("coach.CoachSettings.apiKey")} value={key} onChangeText={setKey} secureTextEntry autoCapitalize="none" autoCorrect={false} spellCheck={false} maxLength={500} placeholder={current.last4 && current.provider === provider ? `••••${current.last4}` : tr("coach.CoachSetup.pasteYourKey")} />
      </Field>
      <Text accessibilityRole="link" onPress={() => void Linking.openURL(p.keyUrl).catch(() => {})} className="-mt-3 text-[13px] font-semibold text-coach-text">
        {tr("coach.getKey", { provider: p.label })}
      </Text>
      <Field label={tr("coach.CoachSettings.model")} hint={tr("coach.CoachSetup.anyModelYourProviderOffers")}>
        <TextField accessibilityLabel={tr("coach.CoachSettings.model")} value={model} onChangeText={setModel} autoCapitalize="none" autoCorrect={false} spellCheck={false} maxLength={120} />
      </Field>
      {error && (
        <Text accessibilityRole="alert" className={ERROR}>
          {error}
        </Text>
      )}
      <Button disabled={testing || !key.trim()} onPress={() => void save()}>
        {testing ? tr("coach.CoachSetup.testing") : tr("coach.CoachSetup.testAndSave")}
      </Button>
      <Text className={HINT}>{tr("coach.CoachSetup.pulseChecksTheKeyWithOneTiny")}</Text>
    </View>
  );
}
