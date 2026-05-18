import Constants from "expo-constants";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Reliable top padding below status bar / notch (Native Tabs can report inset 0). */
export function useTopInset(extra = 0): number {
  const insets = useSafeAreaInsets();
  const statusBar =
    Platform.OS === "ios"
      ? (Constants.statusBarHeight ?? 0)
      : Platform.OS === "android"
        ? (Constants.statusBarHeight ?? 0)
        : 0;
  return Math.max(insets.top, statusBar) + extra;
}
