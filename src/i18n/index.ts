import { createInstance, type TOptions } from "i18next";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

export type Language = "en" | "fr";
type PluralBase<K> = K extends `${infer Base}_${"one" | "other"}` ? Base : never;
export type TranslationKey = keyof typeof en | PluralBase<keyof typeof en>;

/** Resources ship inside the app. Translation never requires a network request. */
export const i18n = createInstance();
void i18n.init({
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en", "fr"],
  resources: { en: { translation: en }, fr: { translation: fr } },
  initAsync: false,
  keySeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
});

export function tr(key: TranslationKey, options?: TOptions): string {
  return i18n.t(key, options);
}

export const language = (): Language => (i18n.resolvedLanguage === "fr" ? "fr" : "en");
export const formatLocale = () => (language() === "fr" ? "fr-FR" : "en-US");

/** Respect the ordered language preferences, including regional variants. */
export function resolveLanguage(tags: readonly string[]): Language {
  for (const tag of tags) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (base === "fr" || base === "en") return base;
  }
  return "en";
}

export function setLanguage(next: Language): void {
  if (language() !== next) void i18n.changeLanguage(next);
}
