import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetLeaderboard, useListTowns, useLaunchRaid, useGetTownArmy, useGetTownRaids,
  getGetTownRaidsQueryKey, getGetTownArmyQueryKey, getGetTownQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";

export default function WorldScreen() {
  const colors = useColors();
  const { townId } = useGame();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"leaderboard" | "raids">("leaderboard");
  const [selectedTarget, setSelectedTarget] = useState<any | null>(null);
  const [infantry, setInfantry] = useState(0);
  const [archers, setArchers] = useState(0);
  const [cavalry, setCavalry] = useState(0);
  const [catapults, setCatapults] = useState(0);
  const [raidError, setRaidError] = useState<string | null>(null);

  const { data: leaderboard, isLoading: lbLoading } = useGetLeaderboard({ query: { refetchInterval: 120_000 } });
  const { data: towns } = useListTowns({ query: { staleTime: 60_000 } });
  const { data: raids, isLoading: raidsLoading, refetch: refetchRaids } = useGetTownRaids(townId ?? 0, { query: { enabled: !!townId } });
  const { data: army } = useGetTownArmy(townId ?? 0, { query: { enabled: !!townId } });
  const launchRaid = useLaunchRaid();

  const availableInfantry = (army?.infantry ?? 0) - (army?.onMissionInfantry ?? 0);
  const availableArchers  = (army?.archers  ?? 0) - (army?.onMissionArchers  ?? 0);
  const availableCavalry  = (army?.cavalry  ?? 0) - (army?.onMissionCavalry  ?? 0);
  const availableCatapults = (army?.catapults ?? 0) - (army?.onMissionCatapults ?? 0);

  const handleRaid = () => {
    if (!townId || !selectedTarget) return;
    setRaidError(null);
    launchRaid.mutate(
      { data: { attackerTownId: townId, defenderTownId: selectedTarget.id, infantry, archers, cavalry, catapults } },
      {
        onSuccess: (result) => {
          Haptics.notificationAsync(result.result === "victory" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
          setSelectedTarget(null); setInfantry(0); setArchers(0); setCavalry(0); setCatapults(0);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <MaterialCommunityIcons name="earth" size={20} color={colors.gold} />
        <Text style={[styles.topTitle, { color: colors.foreground }]}>World</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(["leaderboard", "raids"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.gold : colors.textSecondary }]}>
              {tab === "leaderboard" ? "Leaderboard" : "Raids"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "leaderboard" && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
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
                  <Text style={[styles.rankScore, { color: colors.gold }]}>{entry.score.toLocaleString()}</Text>
                  <Text style={[styles.rankMil, { color: colors.textSecondary }]}>⚔ {entry.militaryPower}</Text>
                </View>
                {entry.townId !== townId && (
                  <TouchableOpacity
                    style={[styles.raidBtn, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive + "44" }]}
                    onPress={() => { setSelectedTarget({ id: entry.townId, name: entry.townName }); setInfantry(0); setArchers(0); setCavalry(0); setCatapults(0); }}
                  >
                    <MaterialCommunityIcons name="sword" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                )}
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

      <Modal visible={!!selectedTarget} transparent animationType="slide" onRequestClose={() => setSelectedTarget(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedTarget(null)}>
          <View style={[styles.raidSheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.raidSheetTitle, { color: colors.foreground }]}>Raid {selectedTarget?.name}</Text>
            <Text style={[styles.raidSheetDesc, { color: colors.textSecondary }]}>
              Deployed troops can't defend. Victory grants 30% of their resources.
            </Text>

            {([
              { key: "infantry",  label: "Infantry",  available: availableInfantry,  val: infantry,  set: setInfantry },
              { key: "archers",   label: "Archers",   available: availableArchers,   val: archers,   set: setArchers },
              { key: "cavalry",   label: "Cavalry",   available: availableCavalry,   val: cavalry,   set: setCavalry },
              { key: "catapults", label: "Catapults", available: availableCatapults, val: catapults, set: setCatapults },
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
              style={[styles.launchBtn, { backgroundColor: infantry + archers + cavalry + catapults > 0 ? colors.destructive : colors.muted }]}
              onPress={handleRaid}
              disabled={infantry + archers + cavalry + catapults === 0 || launchRaid.isPending}
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
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1 },
  topTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scrollContent: { padding: 12, paddingBottom: 100, gap: 8 },
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
});
