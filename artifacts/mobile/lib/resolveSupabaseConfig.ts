import Constants from "expo-constants";

export type SupabaseConfig = { url: string; anonKey: string };

const PLACEHOLDER = /YOUR_PROJECT|your-anon-key|example\.supabase/i;

function readEnv(name: string): string | undefined {
  const fromProcess = process.env[name]?.trim();
  if (fromProcess) return fromProcess;

  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const camel = name.replace(/^EXPO_PUBLIC_/, "").toLowerCase().replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  // EXPO_PUBLIC_SUPABASE_URL → supabaseUrl
  const fromExtra = extra?.[camel];
  return fromExtra?.trim() || undefined;
}

/** Accepts full URL or bare `xxxx.supabase.co` (adds https://). */
export function normalizeSupabaseUrl(raw: string | undefined): string | null {
  if (!raw || PLACEHOLDER.test(raw)) return null;

  let candidate = raw.trim().replace(/\/+$/, "");
  if (!candidate) return null;

  if (!/^https?:\/\//i.test(candidate)) {
    if (!candidate.includes(".supabase.co")) return null;
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (!parsed.hostname.includes("supabase.co")) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function resolveSupabaseConfig(): SupabaseConfig | null {
  const url = normalizeSupabaseUrl(readEnv("EXPO_PUBLIC_SUPABASE_URL"));
  const anonKey = readEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !anonKey || PLACEHOLDER.test(anonKey)) return null;
  if (anonKey.startsWith("http") || anonKey.includes(".supabase.co")) return null;

  return { url, anonKey };
}

export function describeSupabaseConfigError(): string {
  const rawUrl = readEnv("EXPO_PUBLIC_SUPABASE_URL");
  const rawKey = readEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  if (!rawUrl || !rawKey) {
    return "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in the repo root .env, then restart Expo with --clear.";
  }
  if (PLACEHOLDER.test(rawUrl) || PLACEHOLDER.test(rawKey)) {
    return "Replace placeholder values in .env with your Supabase project URL and anon key (Dashboard → Settings → API).";
  }
  if (rawKey.includes(".supabase.co") || rawKey.startsWith("http")) {
    return "EXPO_PUBLIC_SUPABASE_ANON_KEY should be the anon public key (starts with eyJ…), not the project URL.";
  }
  if (rawUrl.startsWith("eyJ")) {
    return "EXPO_PUBLIC_SUPABASE_URL should be the project URL (https://xxxx.supabase.co), not the anon key.";
  }
  if (rawUrl.startsWith("postgresql://")) {
    return "EXPO_PUBLIC_SUPABASE_URL must be the HTTPS API URL, not the database connection string.";
  }

  const url = normalizeSupabaseUrl(rawUrl);
  if (!url) {
    return `EXPO_PUBLIC_SUPABASE_URL is invalid: "${rawUrl}". Use https://YOUR_REF.supabase.co (no trailing path).`;
  }

  return "Supabase config looks invalid. Check .env and restart Expo.";
}
