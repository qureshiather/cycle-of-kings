/**
 * Must load before @supabase/supabase-js (Auth uses TextDecoder + crypto).
 * Import this module first from app entry / supabase client setup.
 */
import { Platform } from "react-native";
import "react-native-get-random-values";

function installTextDecoder(): void {
  if (typeof globalThis.TextDecoder !== "undefined") return;

  if (Platform.OS === "web" && typeof window !== "undefined" && window.TextDecoder) {
    globalThis.TextDecoder = window.TextDecoder;
    return;
  }

  try {
    const { TextDecoder } = require("expo/src/winter/TextDecoder") as {
      TextDecoder: typeof globalThis.TextDecoder;
    };
    globalThis.TextDecoder = TextDecoder;
  } catch (err) {
    console.warn("[polyfills] TextDecoder install failed:", err);
  }
}

installTextDecoder();
