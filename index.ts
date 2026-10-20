// The entry (package.json `main`). The background task is defined here, outside React and before the router, so a
// headless launch (WorkManager waking Pulse with no UI) finds it: expo-task-manager needs defineTask in global scope.
import "@/i18n/native";
import "@/background/task";
import "expo-router/entry";
