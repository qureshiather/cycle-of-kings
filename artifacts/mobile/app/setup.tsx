import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreatePlayer } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useGame } from "@/context/GameContext";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import { resolveApiBaseUrl } from "@/lib/resolveApiBaseUrl";

function formatConnectError(err: unknown): string {
  const msg =
    (err as { message?: string })?.message ??
    (err as { error?: string })?.error ??
    String(err);

  if (/network request failed|failed to fetch|network error/i.test(msg)) {
    const base = resolveApiBaseUrl() ?? "(not configured)";
    if (Platform.OS === "android") {
      return `Cannot reach API at ${base}. Run pnpm dev:api on your computer. Emulator uses 10.0.2.2; a physical device needs your Mac's Wi‑Fi IP in .env.`;
    }
    return `Cannot reach API at ${base}. Run pnpm dev:api and check EXPO_PUBLIC_API_URL in .env.`;
  }

  if (msg.toLowerCase().includes("name") || msg.toLowerCase().includes("taken")) {
    return "That ruler name is already taken. Choose another.";
  }

  return "Failed to connect to server. Try again.";
}

export default function SetupScreen() {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const insets = useSafeAreaInsets();
  const { setPlayer } = useGame();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const createPlayer = useCreatePlayer();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function handleStart() {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError("Name must be at least 2 characters"); return; }
    if (trimmed.length > 24) { setError("Name must be 24 characters or less"); return; }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let deviceId: string;
    try {
      deviceId = await getOrCreateDeviceId();
    } catch {
      setError("Could not save device identity. Try again.");
      return;
    }

    createPlayer.mutate(
      { data: { deviceId, name: trimmed } },
      {
        onSuccess: (player) => {
          setPlayer((player as any).id, (player as any).townId, (player as any).name);
          router.replace("/(tabs)" as any);
        },
        onError: (err: unknown) => {
          setError(formatConnectError(err));
        },
      }
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.inner, { paddingTop: topPad + 32, paddingBottom: insets.bottom + 32 }]}>

        <View style={styles.heroSection}>
          <View style={[styles.crownRing, { borderColor: withAlpha(colors.gold, 0.28), backgroundColor: withAlpha(colors.gold, 0.08) }]}>
            <MaterialCommunityIcons name="crown" size={56} color={colors.gold} />
          </View>
          <Text style={[styles.title, { color: colors.gold }]}>Cycle of Kings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Build your kingdom. Command your armies.{"\n"}Dominate the realm.
          </Text>
        </View>

        <View style={styles.formSection}>
          <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: error ? colors.destructive : colors.border }]}>
            <MaterialCommunityIcons name="shield-crown" size={20} color={colors.gold} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Enter your ruler name..."
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={t => { setName(t); setError(""); }}
              maxLength={24}
              autoFocus
              autoCapitalize="words"
              onSubmitEditing={handleStart}
              returnKeyType="go"
            />
          </View>
          <Text style={[styles.inputHint, { color: colors.textSecondary }]}>Must be unique — no two rulers share the same name</Text>
          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: withAlpha(colors.destructive, 0.1), borderColor: withAlpha(colors.destructive, 0.28) }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.gold, opacity: createPlayer.isPending ? 0.7 : 1 }]}
            onPress={handleStart}
            disabled={createPlayer.isPending}
            activeOpacity={0.8}
          >
            {createPlayer.isPending ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <>
                <MaterialCommunityIcons name="castle" size={20} color={colors.onPrimary} />
                <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Begin Your Reign</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.featureList, { borderTopColor: colors.border }]}>
          {[
            { icon: "home-city",   text: "Build your kingdom across 12 strategic building slots" },
            { icon: "sword-cross", text: "Armies grow from your military buildings" },
            { icon: "earth",       text: "Raid other kingdoms and dominate the leaderboard" },
            { icon: "trophy",      text: "Earn permanent trophies across seasonal cycles" },
          ].map(({ icon, text }) => (
            <View key={icon} style={styles.feature}>
              <MaterialCommunityIcons name={icon as any} size={15} color={colors.gold} />
              <Text style={[styles.featureText, { color: colors.textSecondary }]}>{text}</Text>
            </View>
          ))}
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 28, justifyContent: "space-between" },
  heroSection: { alignItems: "center", gap: 14 },
  crownRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  formSection: { gap: 10 },
  inputCard: { flexDirection: "row", alignItems: "center", height: 54, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, gap: 10 },
  inputIcon: { flexShrink: 0 },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  inputHint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  button: { height: 54, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 },
  buttonText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  featureList: { gap: 10, borderTopWidth: 1, paddingTop: 20 },
  feature: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
});
