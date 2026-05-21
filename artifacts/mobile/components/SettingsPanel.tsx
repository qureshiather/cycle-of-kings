import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTown,
  useSetPeacefulMode,
  useGetGameState,
  useResetTown,
  useGetBuildingSlots,
  getGetTownQueryKey,
  getGetBuildingSlotsQueryKey,
  getGetTownArmyQueryKey,
  getGetTownRaidsQueryKey,
} from "@workspace/api-client-react";
import BuildingProgressionModal from "@/components/BuildingProgressionModal";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useGame } from "@/context/GameContext";
import { useColorSchemePreference, type ColorSchemePreference } from "@/context/ColorSchemeContext";

export default function SettingsPanel({ onOpenAchievements }: { onOpenAchievements: () => void }) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const { townId } = useGame();
  const qc = useQueryClient();
  const { preference: schemePref, setPreference: setScheme } = useColorSchemePreference();

  const { data: myTown } = useGetTown(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: gameState } = useGetGameState({ query: { staleTime: 300_000 } as any });
  const setPeacefulMode = useSetPeacefulMode();
  const resetTown = useResetTown();
  const { data: slots = [] } = useGetBuildingSlots(townId ?? 0, { query: { enabled: !!townId } as any });
  const [guideOpen, setGuideOpen] = useState(false);

  const isPeaceful = myTown?.peacefulMode ?? false;
  const peacefulLocked = (myTown as any)?.peacefulOptedInCycle != null;
  const cycleNumber = gameState?.cycleNumber;

  const handleEnablePeaceful = () => {
    if (!townId || isPeaceful) return;
    const cycleLabel = cycleNumber != null ? `Cycle ${cycleNumber}` : "this cycle";
    Alert.alert(
      "Enable Peaceful Mode?",
      `This is permanent — you cannot return to PvP or appear on leaderboards.\n\nYou may only opt into peaceful mode once per cycle. This uses your opt-in for ${cycleLabel}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Enable Forever",
          style: "destructive",
          onPress: () =>
            setPeacefulMode.mutate(
              { townId, data: { peaceful: true } },
              {
                onSuccess: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
                },
                onError: (e: any) => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  Alert.alert("Peaceful Mode", e?.data?.error ?? e?.message ?? "Could not enable peaceful mode");
                },
              },
            ),
        },
      ],
    );
  };

  const handleReset = () => {
    const id = townId;
    if (!id) return;
    Alert.alert(
      "Start Fresh?",
      "This will demolish all buildings, disband your army, and cancel all missions. You'll restart with 200 Gold, 200 Food, 150 Wood, and 100 Stone. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Fresh",
          style: "destructive",
          onPress: () => {
            resetTown.mutate(
              { townId: id },
              {
                onSuccess: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  qc.invalidateQueries({ queryKey: getGetTownQueryKey(id) });
                  qc.invalidateQueries({ queryKey: getGetBuildingSlotsQueryKey(id) });
                  qc.invalidateQueries({ queryKey: getGetTownArmyQueryKey(id) });
                  qc.invalidateQueries({ queryKey: getGetTownRaidsQueryKey(id) });
                },
                onError: (e: any) => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  const msg = e?.response?.data?.error ?? e?.error ?? e?.message ?? "Something went wrong. Try again.";
                  Alert.alert("Reset Failed", msg);
                },
              },
            );
          },
        },
      ],
    );
  };

  const slotsForGuide = slots.map((s) => ({
    slotType: s.slotType,
    level: s.level ?? 0,
    upgrading: s.upgrading,
  }));

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onOpenAchievements();
        }}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="View achievements"
      >
        <View style={styles.linkRow}>
          <MaterialCommunityIcons name="trophy" size={20} color={colors.gold} />
          <View style={styles.linkText}>
            <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Achievements</Text>
            <Text style={[styles.linkDesc, { color: colors.textSecondary }]}>
              Re-earn each cycle · view past cycle history
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setGuideOpen(true);
        }}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Open building progression guide"
      >
        <View style={styles.linkRow}>
          <MaterialCommunityIcons name="book-open-page-variant" size={20} color={colors.gold} />
          <View style={styles.linkText}>
            <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Building progression guide</Text>
            <Text style={[styles.linkDesc, { color: colors.textSecondary }]}>
              Town Hall requirements and unlock order
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      <BuildingProgressionModal
        visible={guideOpen}
        onClose={() => setGuideOpen(false)}
        slots={slotsForGuide}
      />

      <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.settingsHeader}>
          <MaterialCommunityIcons name="theme-light-dark" size={16} color={colors.textSecondary} />
          <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Appearance</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.schemeRow}>
          {(["auto", "light", "dark"] as ColorSchemePreference[]).map((pref) => {
            const icons = { auto: "brightness-auto", light: "white-balance-sunny", dark: "moon-waning-crescent" } as const;
            const labels = { auto: "Auto", light: "Light", dark: "Dark" };
            const active = schemePref === pref;
            return (
              <TouchableOpacity
                key={pref}
                style={[
                  styles.schemeBtn,
                  {
                    backgroundColor: active ? colors.gold + "22" : colors.background,
                    borderColor: active ? colors.gold : colors.border,
                  },
                ]}
                onPress={() => setScheme(pref)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name={icons[pref]} size={18} color={active ? colors.gold : colors.textSecondary} />
                <Text style={[styles.schemeBtnText, { color: active ? colors.gold : colors.textSecondary }]}>
                  {labels[pref]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.settingsHeader}>
          <MaterialCommunityIcons name="shield-check" size={16} color={colors.peaceful} />
          <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Peaceful Mode</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.resetSection}>
          <View style={styles.resetInfo}>
            <MaterialCommunityIcons
              name={isPeaceful ? "shield-check" : "shield-off-outline"}
              size={20}
              color={isPeaceful ? colors.peaceful : colors.textSecondary}
            />
            <View style={styles.resetText}>
              <Text style={[styles.resetLabel, { color: colors.foreground }]}>
                {isPeaceful ? "Peaceful Mode On" : "Peaceful Mode Off"}
              </Text>
              <Text style={[styles.resetDesc, { color: colors.textSecondary }]}>
                {isPeaceful
                  ? `Permanent since Cycle ${(myTown as any)?.peacefulOptedInCycle ?? "?"}. No raids, no leaderboard.`
                  : peacefulLocked
                    ? "Peaceful mode is locked for this kingdom."
                    : "Opt in once per cycle. Permanent — no PvP and no leaderboard ranking."}
              </Text>
            </View>
          </View>
          {!isPeaceful && !peacefulLocked && (
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: withAlpha(colors.peaceful, 0.35), backgroundColor: withAlpha(colors.peaceful, 0.08) }]}
              onPress={handleEnablePeaceful}
              disabled={setPeacefulMode.isPending}
              activeOpacity={0.7}
            >
              {setPeacefulMode.isPending ? (
                <ActivityIndicator size="small" color={colors.peaceful} />
              ) : (
                <Text style={[styles.resetBtnText, { color: colors.peaceful }]}>Enable Peaceful Mode</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.settingsHeader}>
          <MaterialCommunityIcons name="cog-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Kingdom</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.resetSection}>
          <View style={styles.resetInfo}>
            <MaterialCommunityIcons name="restore" size={20} color={colors.destructive} />
            <View style={styles.resetText}>
              <Text style={[styles.resetLabel, { color: colors.foreground }]}>Start Fresh</Text>
              <Text style={[styles.resetDesc, { color: colors.textSecondary }]}>
                Demolishes all buildings, disbands your army, and cancels all missions. Restores starting resources:
                200G · 200F · 150W · 100St.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.destructive + "55", backgroundColor: colors.destructive + "11" }]}
            onPress={handleReset}
            disabled={resetTown.isPending}
            activeOpacity={0.7}
          >
            {resetTown.isPending ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Text style={[styles.resetBtnText, { color: colors.destructive }]}>Start Fresh</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  settingsCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  linkText: { flex: 1, gap: 3 },
  linkDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  settingsHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  settingsTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  divider: { height: 1 },
  schemeRow: { flexDirection: "row", gap: 8, padding: 14 },
  schemeBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10, borderWidth: 1, gap: 6 },
  schemeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  resetSection: { padding: 14, gap: 14 },
  resetInfo: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  resetText: { flex: 1, gap: 4 },
  resetLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  resetDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  resetBtn: { borderRadius: 8, borderWidth: 1, paddingVertical: 12, alignItems: "center" },
  resetBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
