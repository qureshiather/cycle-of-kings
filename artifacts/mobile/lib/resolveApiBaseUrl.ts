import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_API_PORT = "8080";

function getMetroHostIp(): string | null {
  const candidates: Array<string | undefined> = [
    Constants.expoConfig?.hostUri,
    (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost,
    Constants.manifest?.debuggerHost,
    (Constants.manifest2 as { extra?: { expoGo?: { debuggerHost?: string } } } | null)?.extra
      ?.expoGo?.debuggerHost,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const host = raw.split(":")[0]?.trim();
    if (host) return host;
  }
  return null;
}

/** Android/iOS devices cannot use localhost — point at the dev machine instead. */
function rewriteLocalHostForPlatform(url: string): string {
  if (!/localhost|127\.0\.0\.1/i.test(url)) return url;

  const metroHost = getMetroHostIp();
  const replacement =
    metroHost && !/^localhost|127\.0\.0\.1$/i.test(metroHost)
      ? metroHost
      : Platform.OS === "android"
        ? "10.0.2.2"
        : Platform.OS === "ios"
          ? metroHost ?? "localhost"
          : "localhost";

  return url.replace(/localhost|127\.0\.0\.1/gi, replacement);
}

export function resolveApiBaseUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return rewriteLocalHostForPlatform(fromEnv);

  if (__DEV__) {
    const metroHost = getMetroHostIp();
    const host =
      metroHost && !/^localhost|127\.0\.0\.1$/i.test(metroHost)
        ? metroHost
        : Platform.OS === "android"
          ? "10.0.2.2"
          : "localhost";
    const port = process.env.EXPO_PUBLIC_API_PORT ?? DEFAULT_API_PORT;
    return `http://${host}:${port}`;
  }

  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (domain) return `https://${domain.replace(/^https?:\/\//, "")}`;

  return null;
}
