import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";

export type ColorSchemePreference = "auto" | "light" | "dark";
export type ResolvedColorScheme = "light" | "dark";

interface ColorSchemeContextType {
  preference: ColorSchemePreference;
  resolved: ResolvedColorScheme;
  setPreference: (pref: ColorSchemePreference) => Promise<void>;
}

const ColorSchemeContext = createContext<ColorSchemeContextType>({
  preference: "auto",
  resolved: "dark",
  setPreference: async () => {},
});

const STORAGE_KEY = "colorSchemePreference";

export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ColorSchemePreference>("auto");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === "light" || val === "dark" || val === "auto") {
        setPreferenceState(val);
      }
    }).catch(() => {});
  }, []);

  const setPreference = useCallback(async (pref: ColorSchemePreference) => {
    setPreferenceState(pref);
    await AsyncStorage.setItem(STORAGE_KEY, pref);
  }, []);

  const resolved: ResolvedColorScheme =
    preference === "auto" ? (systemScheme === "light" ? "light" : "dark") : preference;

  return (
    <ColorSchemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export const useColorSchemePreference = () => useContext(ColorSchemeContext);
