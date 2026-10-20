import { useTranslation } from "react-i18next";
import { i18n, language } from "./index";

/** Subscribe at the component that renders translated text, preserving form state. */
export function useLanguage() {
  useTranslation(undefined, { i18n, useSuspense: false });
  return language();
}
