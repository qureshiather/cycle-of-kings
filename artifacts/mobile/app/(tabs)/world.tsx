import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetLeaderboard, useListTowns, useLaunchRaid, useGetTownArmy, useGetTownRaids, useResetTown,
  useGetTown, useSetPeacefulMode, useGetGameState,
  getGetTownRaidsQueryKey, getGetTownArmyQueryKey, getGetTownQueryKey,
  getGetBuildingSlotsQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import ScreenHeader from "@/components/ScreenHeader";
import { useColorSchemePreference, type ColorSchemePreference } from "@/context/ColorSchemeContext";

export default function WorldScreen() {
  const colors = useColors();
  const { townId } = useGame();
  const qc = useQueryClient();
  const { preference: schemePref, setPreference: setScheme } = useColorSchemePreference();

  const [activeTab, setActiveTab] = useState<"leaderboard" | "raids" | "settings">("leaderboard");
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [infantry, setInfantry] = useState(0);
  const [archers, setArchers] = useState(0);
  const [cavalry, setCavalry] = useState(0);
  const [raidError, setRaidError] = useState<string | null>(null);

  const { data: leaderboard, isLoading: lbLoading } = useGetLeaderboard({ query: { refetchInterval: 120_000 } as any });
  const { data: towns } = useListTowns({ query: { staleTime: 60_000 } as any });
  const { data: raids, isLoading: raidsLoading, refetch: refetchRaids } = useGetTownRaids(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: army } = useGetTownArmy(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: myTown } = useGetTown(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: gameState } = useGetGameState({ query: { staleTime: 300_000 } as any });
  const launchRaid = useLaunchRaid();
  const resetTown = useResetTown();
  const setPeacefulMode = useSetPeacefulMode();

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
          onPress: () => setPeacefulMode.mutate(
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

  const availableInfantry = army?.availableInfantry ?? 0;
  const availableArchers  = army?.availableArchers  ?? 0;
  const availableCavalry  = army?.availableCavalry  ?? 0;

  const handleRaid = () => {
    if (!townId || !selectedTarget) return;
    setRaidError(null);
    launchRaid.mutate(
      { data: { attackerTownId: townId, defenderTownId: selectedTarget.id, infantry, archers, cavalry, catapults: 0 } },
      {
        onSuccess: (result) => {
          Haptics.notificationAsync(result.result === "victory" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
          setSelectedTarget(null); setInfantry(0); setArchers(0); setCavalry(0);
          qc.invalidateQueries({ queryKey: getGetTownRaidsQueryKey(townId) });
          qc.invalidateQueries({ queryKey: getGetTownArmyQueryKey(townId) });
          qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
        },
        onError: (e: any) => {
          setRaidError(e?.data?.error ?? "Raid failed");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  };

  const otherTowns = (towns ?? []).filter((t: any) => t.id !== townId);

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
            resetTown.mutate({ townId: id }, {
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
            });
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader icon="earth" title="World" />

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(["leaderboard", "raids", "settings"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.gold : colors.textSecondary }]}>
              {tab === "leaderboard" ? "Leaderboard" : tab === "raids" ? "Raids" : "Settings"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "leaderboard" && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isPeaceful && (
            <View style={[styles.peacefulBanner, { backgroundColor: "#3d7a9a18", borderColor: "#3d7a9a44" }]}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#3d7a9a" />
              <Text style={[styles.peacefulBannerText, { color: colors.textSecondary }]}>
                Peaceful kingdoms are hidden from the leaderboard.
              </Text>
            </View>
          )}
          {lbLoading ? <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} /> : (
            (leaderboard ?? []).map((entry: any) => (
              <View
                key={entry.townId}
                style={[styles.rankRow, { backgroundColor: entry.townId === townId ? colors.gold + "11" : colors.surface, borderColor: entry.townId === townId ? colors.gold + "44" : colors.border }]}
              >
                <Text style={[styles.rank, { color: entry.rank <= 3 ? colors.gold : colors.textSecondary }]}>
                  {entry.rank <= 3 ? ["👑", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                </Text>
                <View style={styles.rankInfo}>
                  <Text style={[styles.rankName, { color: colors.foreground }]}>{entry.townName}</Text>
                  <Text style={[styles.rankPlayer, { color: colors.textSecondary }]}>{entry.playerName}</Text>
                </View>
                <View style={styles.rankStats}>
                  <Text style={[styles.rankScore, { color: colors.gold }]}>{(entry.score ?? 0).toLocaleString()}</Text>
                  <Text style={[styles.rankMil, { color: colors.textSecondary }]}>📈 {entry.economyScore ?? 0} · ⚔ {entry.armyScore ?? 0}</Text>
                </View>
                {entry.townId !== townId && (() => {
                  const targetTown = (towns ?? []).find((t: any) => t.id === entry.townId);
                  const targetPeaceful = targetTown?.peacefulMode ?? false;
                  if (targetPeaceful) {
                    return (
                      <View style={[styles.raidBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <MaterialCommunityIcons name="shield-check" size={14} color={colors.textSecondary} />
                      </View>
                    );
                  }
                  if (isPeaceful) return null;
                  return (
                    <TouchableOpacity
                      style={[styles.raidBtn, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive + "44" }]}
                      onPress={() => { setSelectedTarget({ id: entry.townId, name: entry.townName }); setInfantry(0); setArchers(0); setCavalry(0); }}
                    >
                      <MaterialCommunityIcons name="sword" size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  );
                })()}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === "raids" && (
        <ScrollView contentContainerStyle={styles.scrollContent}
          refreshControl={<View />}>
          {raidsLoading ? <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} /> : (raids ?? []).length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="sword-cross" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No raids yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Attack kingdoms from the Leaderboard tab</Text>
            </View>
          ) : (
            (raids ?? []).map((raid: any) => {
              const isAttacker = raid.attackerTownId === townId;
              const victory = raid.result === "victory";
              const resultColor = victory ? colors.food : colors.destructive;
              return (
                <View key={raid.id} style={[styles.raidCard, { backgroundColor: colors.surface, borderColor: resultColor + "33", borderLeftColor: resultColor, borderLeftWidth: 3 }]}>
                  <View style={styles.raidHeader}>
                    <MaterialCommunityIcons name={victory ? "sword" : "shield-off"} size={16} color={resultColor} />
                    <Text style={[styles.raidTitle, { color: colors.foreground }]}>
                      {isAttacker ? `Attacked ${raid.defenderTownName}` : `Defended vs ${raid.attackerTownName}`}
                    </Text>
                    <Text style={[styles.raidResult, { color: resultColor }]}>{raid.result.toUpperCase()}</Text>
                  </View>
                  {victory && isAttacker && (
                    <Text style={[styles.raidLoot, { color: colors.gold }]}>
                      Looted: {Math.round(raid.lootGold)}g {Math.round(raid.lootFood)}f {Math.round(raid.lootWood)}w {Math.round(raid.lootStone)}s
                    </Text>
                  )}
                  {raid.attackerCasualties > 0 && isAttacker && (
                    <Text style={[styles.raidCas, { color: colors.destructive }]}>{raid.attackerCasualties} casualties</Text>
                  )}
                  <Text style={[styles.raidDate, { color: colors.textSecondary }]}>{new Date(raid.createdAt).toLocaleDateString()}</Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {activeTab === "settings" && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Appearance */}
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingsHeader}>
              <MaterialCommunityIcons name="theme-light-dark" size={16} color={colors.textSecondary} />
              <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Appearance</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.schemeRow}>
              {(["auto", "light", "dark"] as ColorSchemePreference[]).map(pref => {
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

          {/* Peaceful Mode */}
          <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingsHeader}>
              <MaterialCommunityIcons name="shield-check" size={16} color="#3d7a9a" />
              <Text style={[styles.settingsTitle, { color: colors.foreground }]}>Peaceful Mode</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.resetSection}>
              <View style={styles.resetInfo}>
                <MaterialCommunityIcons name={isPeaceful ? "shield-check" : "shield-off-outline"} size={20} color={isPeaceful ? "#3d7a9a" : colors.textSecondary} />
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
                  style={[styles.resetBtn, { borderColor: "#3d7a9a55", backgroundColor: "#3d7a9a11" }]}
                  onPress={handleEnablePeaceful}
                  disabled={setPeacefulMode.isPending}
                  activeOpacity={0.7}
                >
                  {setPeacefulMode.isPending
                    ? <ActivityIndicator size="small" color="#3d7a9a" />
                    : <Text style={[styles.resetBtnText, { color: "#3d7a9a" }]}>Enable Peaceful Mode</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Start Fresh */}
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
                    Demolishes all buildings, disbands your army, and cancels all missions. Restores starting resources: 200G · 200F · 150W · 100St.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.resetBtn, { borderColor: colors.destructive + "55", backgroundColor: colors.destructive + "11" }]}
                onPress={handleReset}
                disabled={resetTown.isPending}
                activeOpacity={0.7}
              >
                {resetTown.isPending
                  ? <ActivityIndicator size="small" color={colors.destructive} />
                  : <Text style={[styles.resetBtnText, { color: colors.destructive }]}>Start Fresh</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      <Modal visible={!!selectedTarget} transparent animationType="slide" onRequestClose={() => setSelectedTarget(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedTarget(null)}>
          <View style={[styles.raidSheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.raidSheetTitle, { color: colors.foreground }]}>Raid {selectedTarget?.name}</Text>
            <Text style={[styles.raidSheetDesc, { color: colors.textSecondary }]}>
              Deployed troops can't defend. Victory grants 30% of their resources.
            </Text>

            {([
              { key: "infantry", label: "Infantry", available: availableInfantry, val: infantry, set: setInfantry },
              { key: "archers",  label: "Archers",  available: availableArchers,  val: archers,  set: setArchers },
              { key: "cavalry",  label: "Cavalry",  available: availableCavalry,  val: cavalry,  set: setCavalry },
            ] as const).map(({ key, label, available, val, set }) => (
              <View key={key} style={styles.raidSlider}>
                <Text style={[styles.raidSliderLabel, { color: colors.foreground }]}>{label}: {val} / {available}</Text>
                <View style={styles.sliderBtns}>
                  <TouchableOpacity style={[styles.sliderBtn, { backgroundColor: colors.surface }]} onPress={() => (set as any)(Math.max(0, val - 1))}>
                    <Text style={{ color: colors.foreground }}>−</Text>
                  </TouchableOpacity>
                  <View style={[styles.sliderTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.sliderFill, { width: `${available > 0 ? (val / available) * 100 : 0}%`, backgroundColor: colors.destructive }]} />
                  </View>
                  <TouchableOpacity style={[styles.sliderBtn, { backgroundColor: colors.surface }]} onPress={() => (set as any)(Math.min(available, val + 1))}>
                    <Text style={{ color: colors.foreground }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {raidError && <Text style={[styles.raidError, { color: colors.destructive }]}>{raidError}</Text>}

            <TouchableOpacity
              style={[styles.launchBtn, { backgroundColor: infantry + archers + cavalry > 0 ? colors.destructive : colors.muted }]}
              onPress={handleRaid}
              disabled={infantry + archers + cavalry === 0 || launchRaid.isPending}
            >
              <MaterialCommunityIcons name="sword" size={16} color="#ffffff" />
              <Text style={[styles.launchText, { color: "#ffffff" }]}>
                {launchRaid.isPending ? "Attacking..." : "Launch Raid"}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scrollContent: { padding: 12, paddingBottom: 100, gap: 8 },
  peacefulBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  peacefulBannerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  rank: { width: 28, fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rankPlayer: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rankStats: { alignItems: "flex-end" },
  rankScore: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rankMil: { fontSize: 11, fontFamily: "Inter_400Regular" },
  raidBtn: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  raidCard: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  raidHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  raidTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  raidResult: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  raidLoot: { fontSize: 12, fontFamily: "Inter_400Regular" },
  raidCas: { fontSize: 11, fontFamily: "Inter_400Regular" },
  raidDate: { fontSize: 10, fontFamily: "Inter_400Regular" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000099" },
  raidSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, gap: 12, paddingBottom: 40 },
  raidSheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  raidSheetDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  raidSlider: { gap: 6 },
  raidSliderLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sliderBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  sliderBtn: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  sliderTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  sliderFill: { height: "100%", borderRadius: 3 },
  raidError: { fontSize: 12, fontFamily: "Inter_400Regular" },
  launchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 10 },
  launchText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  settingsCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 10 },
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
