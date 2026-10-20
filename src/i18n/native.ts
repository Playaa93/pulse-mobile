import { getLocales } from "expo-localization";
import { AppState } from "react-native";
import { resolveLanguage, setLanguage } from "./index";

function syncLanguage() {
  setLanguage(resolveLanguage(getLocales().map((locale) => locale.languageTag)));
}

// Runs before both the background task and the router, including headless launches.
syncLanguage();
// Android can change the app language while its process remains alive.
AppState.addEventListener("change", (state) => {
  if (state === "active") syncLanguage();
});
