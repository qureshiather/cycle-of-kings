import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCreatePlayer } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";

function getDeviceId(): string {
  const stored = typeof window !== "undefined" ? localStorage?.getItem?.("deviceId") : null;
  if (stored) return stored;
  const id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  if (typeof window !== "undefined") localStorage?.setItem?.("deviceId", id);
  return id;
}

export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setPlayer } = useGame();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const createPlayer = useCreatePlayer();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  async function handleStart() {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError("Name must be at least 2 characters"); return; }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createPlayer.mutate(
      { data: { deviceId: getDeviceId(), name: trimmed } },
      {
        onSuccess: (player) => {
          setPlayer((player as any).id, (player as any).townId, (player as any).name);
          router.replace("/(tabs)/");
        },
        onError: () => setError("Failed to connect to server. Check your connection."),
      }
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: colors.background }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={[styles.inner, { paddingTop: topPad + 40, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.heroSection}>
          <MaterialCommunityIcons name="crown" size={72} color={colors.gold} />
          <Text style={[styles.title, { color: colors.gold }]}>Cycle of Kings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Build your kingdom. Command your armies.{"\n"}Dominate the realm.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>YOUR RULER NAME</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: error ? colors.destructive : colors.border, color: colors.foreground }]}
            placeholder="Enter your name..."
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            maxLength={24}
            autoFocus
            autoCapitalize="words"
            onSubmitEditing={handleStart}
            returnKeyType="done"
          />
          {!!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.gold, opacity: createPlayer.isPending ? 0.7 : 1 }]}
            onPress={handleStart}
            disabled={createPlayer.isPending}
            activeOpacity={0.8}
          >
            {createPlayer.isPending ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <MaterialCommunityIcons name="castle" size={20} color={colors.background} />
                <Text style={[styles.buttonText, { color: colors.background }]}>Begin Your Reign</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.featureList}>
          {[
            { icon: "home-city", text: "Build a 9×9 town grid with strategic buildings" },
            { icon: "sword-cross", text: "Recruit armies and send them on missions" },
            { icon: "earth", text: "Raid other kingdoms and dominate the leaderboard" },
            { icon: "trophy", text: "Earn permanent trophies across seasonal cycles" },
          ].map(({ icon, text }) => (
            <View key={icon} style={styles.feature}>
              <MaterialCommunityIcons name={icon as any} size={16} color={colors.gold} />
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
  heroSection: { alignItems: "center", gap: 12 },
  title: { fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  formSection: { gap: 8 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  input: { height: 52, borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, fontSize: 16, fontFamily: "Inter_400Regular" },
  error: { fontSize: 12, fontFamily: "Inter_400Regular" },
  button: { height: 52, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 },
  buttonText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  featureList: { gap: 10 },
  feature: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
});
