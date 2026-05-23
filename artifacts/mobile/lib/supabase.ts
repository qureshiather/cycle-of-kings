import "@/lib/polyfills";
import { Platform } from "react-native";
import { setupURLPolyfill } from "react-native-url-polyfill";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describeSupabaseConfigError, resolveSupabaseConfig } from "@/lib/resolveSupabaseConfig";

// Native only — on web this breaks expo-router (URLStateMachine needs TextDecoder).
if (Platform.OS !== "web") {
  setupURLPolyfill();
}

const config = resolveSupabaseConfig();

export function isSupabaseConfigured(): boolean {
  return config !== null;
}

export function getSupabaseConfigError(): string | null {
  return config ? null : describeSupabaseConfigError();
}

function createSupabaseClient(): SupabaseClient | null {
  if (!config) return null;
  try {
    return createClient(config.url, config.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    throw new Error(`${msg}\n\n${describeSupabaseConfigError()}`);
  }
}

export const supabase = createSupabaseClient();
