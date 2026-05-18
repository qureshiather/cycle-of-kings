import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "deviceId";

export async function getOrCreateDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) return stored;

  const id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(STORAGE_KEY, id);
  return id;
}
