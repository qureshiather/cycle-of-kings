import AsyncStorage from "@react-native-async-storage/async-storage";

const storageKey = (townId: number) => `activityLastSeen:${townId}`;

export async function getLastSeenActivityId(townId: number): Promise<number | null> {
  const raw = await AsyncStorage.getItem(storageKey(townId));
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export async function setLastSeenActivityId(townId: number, activityId: number): Promise<void> {
  await AsyncStorage.setItem(storageKey(townId), String(activityId));
}

export function countUnreadActivities(
  activities: { id: number }[],
  lastSeenId: number | null,
): number {
  if (lastSeenId === null) return 0;
  return activities.filter((a) => a.id > lastSeenId).length;
}
