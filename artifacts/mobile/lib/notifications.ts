import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const PREFS_KEY = "notifications_enabled";

type ExpoNotifications = typeof import("expo-notifications");

let notificationsModule: ExpoNotifications | null | undefined;

/** Local notifications are unavailable in Expo Go on Android (SDK 53+). */
export function isLocalNotificationsAvailable(): boolean {
  return !(Constants.appOwnership === "expo" && Platform.OS === "android");
}

function getNotifications(): ExpoNotifications | null {
  if (!isLocalNotificationsAvailable()) return null;
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-notifications") as ExpoNotifications;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationsModule = mod;
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

export async function areNotificationsEnabled(): Promise<boolean> {
  const v = await AsyncStorage.getItem(PREFS_KEY);
  return v !== "false";
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, enabled ? "true" : "false");
  if (!enabled) {
    const Notifications = getNotifications();
    if (Notifications) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }
}

export async function requestPermissionIfNeeded(): Promise<boolean> {
  if (!(await areNotificationsEnabled())) return false;
  const Notifications = getNotifications();
  if (!Notifications) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function scheduleIfEnabled(
  identifier: string,
  title: string,
  body: string,
  date: Date,
): Promise<void> {
  if (!(await areNotificationsEnabled())) return;
  const Notifications = getNotifications();
  if (!Notifications) return;

  const granted = await requestPermissionIfNeeded();
  if (!granted) return;

  const ms = date.getTime() - Date.now();
  if (ms < 5_000) return;

  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: { title, body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

export async function scheduleUpgradeEnd(
  townId: number,
  slotType: string,
  slotName: string,
  endsAt: string,
): Promise<void> {
  await scheduleIfEnabled(
    `upgrade-${townId}-${slotType}`,
    "Construction complete",
    `${slotName} is ready.`,
    new Date(endsAt),
  );
}

export async function scheduleMissionReturn(
  missionId: number,
  title: string,
  returnsAt: string,
): Promise<void> {
  await scheduleIfEnabled(
    `mission-${missionId}`,
    "Mission complete",
    `${title} — your troops have returned.`,
    new Date(returnsAt),
  );
}

export async function scheduleRaidBattle(
  raidId: number,
  defenderName: string,
  arrivesAt: string,
): Promise<void> {
  await scheduleIfEnabled(
    `raid-${raidId}`,
    "Raid battle",
    `Your forces reach ${defenderName}.`,
    new Date(arrivesAt),
  );
}

export async function scheduleTrainingComplete(
  townId: number,
  unitLabel: string,
  endsAt: string,
): Promise<void> {
  await scheduleIfEnabled(
    `training-${townId}`,
    "Recruitment complete",
    `${unitLabel} have finished training.`,
    new Date(endsAt),
  );
}

export async function cancelAllForTown(townId: number): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = new RegExp(`^(upgrade|training|mission|raid)-${townId}-`);
  for (const n of scheduled) {
    if (prefix.test(n.identifier) || n.identifier === `training-${townId}`) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
    }
  }
}

export async function cancelAllScheduled(): Promise<void> {
  const Notifications = getNotifications();
  if (Notifications) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}
