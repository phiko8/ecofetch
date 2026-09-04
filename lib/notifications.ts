import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { fetchAPI } from "./fetch";

// expo-notifications remote push is not available in Expo Go (SDK 53+).
// Skip all setup when running inside Expo Go to avoid a fatal crash.
const IN_EXPO_GO = Constants.appOwnership === "expo";

// How notifications behave while the app is in the foreground
if (!IN_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Request permission, get the Expo push token, and save it to the driver's DB record.
 * Call this once when the driver opens the dashboard.
 */
export async function registerDriverPushToken(clerkId: string): Promise<void> {
  if (IN_EXPO_GO) return; // not supported in Expo Go
  try {
    // Android requires a notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("job-alerts", {
        name: "Job Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 150, 500],
        lightColor: "#F97316",
        sound: "ringtone.mp3",
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    const { status } =
      existing === "granted"
        ? { status: existing }
        : await Notifications.requestPermissionsAsync();

    if (status !== "granted") return;

    const { data: token } = await Notifications.getExpoPushTokenAsync();

    // Persist the token so the server can reach this device
    await fetchAPI("/(api)/drivers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clerkId, pushToken: token }),
    });
  } catch {
    // Non-critical — polling remains as fallback
  }
}
