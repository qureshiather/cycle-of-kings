import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMissions, useGetTownMissions, useDispatchMission, useGetTownArmy,
  getGetTownMissionsQueryKey, getGetTownArmyQueryKey, getGetTownQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";

const DIFF_COLORS: Record<string, string> = { safe: "#3d7a35", moderate: "#d4a520", risky: "#c4673a", deadly: "#b03020" };
const TYPE_ICONS: Record<string, string> = { explore: "compass", patrol: "shield-half-full", raid: "sword", siege: "castle" };

function timeLeft(returnsAt: string): string {
  const ms = new Date(returnsAt).getTime() - Date.now();
  if (ms <= 0) return "Returning...";
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  return `${mins}m`;
}

export default function MissionsScreen() {
  const colors = useColors();
  const { townId } = useGame();
  const qc = useQueryClient();

  const { data: missionCards, isLoading: cardsLoading } = useGetMissions(
    { townId: townId ?? 0 },
    { query: { enabled: !!townId, refetchInterval: 60_000 } }
  );
  const { data: activeMissions, isLoading: activeLoading, refetch } = useGetTownMissions(townId ?? 0, { query: { enabled: !!townId } });
  const { data: army } = useGetTownArmy(townId ?? 0, { query: { enabled: !!townId } });
  const dispatchMission = useDispatchMission();

  const [selected, setSelected] = useState<any | null>(null);
  const [infantry, setInfantry] = useState(0);
  const [archers, setArchers] = useState(0);
  const [cavalry, setCavalry] = useState(0);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const availableInfantry = (army?.infantry ?? 0) - (army?.onMissionInfantry ?? 0);
  const availableArchers  = (army?.archers  ?? 0) - (army?.onMissionArchers  ?? 0);
  const availableCavalry  = (army?.cavalry  ?? 0) - (army?.onMissionCavalry  ?? 0);
  const totalDeployed = infantry + archers + cavalry;
  const successRate = selected
    ? Math.min(0.95, selected.baseSuccessRate + Math.max(0, totalDeployed - selected.minTroops) * 0.005)
    : 0;

  const handleDispatch = () => {
    if (!townId || !selected) return;
    setDispatchError(null);
    dispatchMission.mutate(
      { townId, data: { missionCardId: selected.id, infantry, archers, cavalry } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSelected(null); setInfantry(0); setArchers(0); setCavalry(0);
          qc.invalidateQueries({ queryKey: getGetTownMissionsQueryKey(townId) });
          qc.invalidateQueries({ queryKey: getGetTownArmyQueryKey(townId) });
          qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
        },
        onError: (e: any) => {
          setDispatchError(e?.data?.error ?? "Failed to dispatch");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  };

  const activeMissionsList = (activeMissions ?? []).filter((m: any) => m.status === "active");
  const completedMissions = (activeMissions ?? []).filter((m: any) => m.status !== "active").slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <MaterialCommunityIcons name="map-legend" size={20} color={colors.gold} />
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Missions</Text>
        <Text style={[styles.hourNote, { color: colors.textSecondary }]}>5 cards / hour</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}
        refreshControl={<View />}>

        {activeMissionsList.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACTIVE</Text>
            {activeMissionsList.map((m: any) => (
              <View key={m.id} style={[styles.activeCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <MaterialCommunityIcons name={TYPE_ICONS[m.missionType] as any ?? "map"} size={20} color={colors.gold} />
                <View style={styles.activeInfo}>
                  <Text style={[styles.activeName, { color: colors.foreground }]}>{m.missionTitle}</Text>
                  <Text style={[styles.activeTime, { color: colors.textSecondary }]}>
                    {m.infantry + m.archers + m.cavalry} troops — returns in {timeLeft(m.returnsAt)}
                  </Text>
                </View>
                <View style={[styles.activeDot, { backgroundColor: colors.food }]} />
              </View>
            ))}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AVAILABLE MISSIONS</Text>
        {cardsLoading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
        ) : (
          (missionCards ?? []).map((card: any) => {
            const diffColor = DIFF_COLORS[card.difficulty] ?? colors.textSecondary;
            return (
              <TouchableOpacity
                key={card.id}
                style={[styles.missionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: diffColor, borderLeftWidth: 3 }]}
                onPress={() => { setSelected(card); setInfantry(0); setArchers(0); setCavalry(0); }}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <MaterialCommunityIcons name={TYPE_ICONS[card.type] as any ?? "map"} size={18} color={diffColor} />
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{card.title}</Text>
                      <Text style={[styles.cardType, { color: diffColor }]}>{card.type.toUpperCase()} · {card.difficulty.toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={[styles.cardSuccessRate, { color: diffColor }]}>{Math.round(card.baseSuccessRate * 100)}%</Text>
                    <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>base success</Text>
                  </View>
                </View>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{card.description}</Text>
                <View style={styles.cardLoot}>
                  {card.lootGold  > 0 && <Text style={[styles.loot, { color: colors.gold  }]}>+{card.lootGold} gold</Text>}
                  {card.lootFood  > 0 && <Text style={[styles.loot, { color: colors.food  }]}>+{card.lootFood} food</Text>}
                  {card.lootWood  > 0 && <Text style={[styles.loot, { color: colors.wood  }]}>+{card.lootWood} wood</Text>}
                  {card.lootStone > 0 && <Text style={[styles.loot, { color: colors.stone }]}>+{card.lootStone} stone</Text>}
                  <Text style={[styles.loot, { color: colors.textSecondary }]}>{card.durationMinutes}m</Text>
                </View>
                <Text style={[styles.cardMinTroops, { color: colors.textSecondary }]}>Min {card.minTroops} troops</Text>
              </TouchableOpacity>
            );
          })
        )}

        {completedMissions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 16 }]}>RECENT</Text>
            {completedMissions.map((m: any) => (
              <View key={m.id} style={[styles.completedCard, { backgroundColor: colors.surface, borderColor: m.result === "victory" ? colors.food + "44" : colors.destructive + "44" }]}>
                <MaterialCommunityIcons
                  name={m.result === "victory" ? "check-circle" : "close-circle"}
                  size={16} color={m.result === "victory" ? colors.food : colors.destructive}
                />
                <View style={styles.completedInfo}>
                  <Text style={[styles.completedName, { color: colors.foreground }]}>{m.missionTitle}</Text>
                  {m.result === "victory" && (
                    <Text style={[styles.completedLoot, { color: colors.gold }]}>
                      +{[m.lootGold&&`${Math.round(m.lootGold)}g`, m.lootFood&&`${Math.round(m.lootFood)}f`, m.lootWood&&`${Math.round(m.lootWood)}w`].filter(Boolean).join(" ")}
                    </Text>
                  )}
                  {m.casualties > 0 && <Text style={[styles.completedCas, { color: colors.destructive }]}>{m.casualties} casualties</Text>}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={[styles.deploySheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            {selected && (
              <>
                <Text style={[styles.deployTitle, { color: colors.foreground }]}>Deploy Troops</Text>
                <Text style={[styles.deployMission, { color: colors.gold }]}>{selected.title}</Text>
                <Text style={[styles.deployDesc, { color: colors.textSecondary }]}>Min {selected.minTroops} troops · {selected.durationMinutes}min duration</Text>

                {([
                  { key: "infantry",  label: "Infantry",  available: availableInfantry, val: infantry, set: setInfantry },
                  { key: "archers",   label: "Archers",   available: availableArchers,  val: archers,  set: setArchers },
                  { key: "cavalry",   label: "Cavalry",   available: availableCavalry,  val: cavalry,  set: setCavalry },
                ] as const).map(({ key, label, available, val, set }) => (
                  <View key={key} style={styles.sliderRow}>
                    <View style={styles.sliderLabel}>
                      <Text style={[styles.sliderLabelText, { color: colors.foreground }]}>{label}</Text>
                      <Text style={[styles.sliderCount, { color: colors.gold }]}>{val} / {available}</Text>
                    </View>
                    {available > 0 ? (
                      <View style={styles.sliderBtns}>
                        <TouchableOpacity style={[styles.sliderBtn, { backgroundColor: colors.surface }]} onPress={() => (set as any)(Math.max(0, val - 1))}>
                          <Text style={{ color: colors.foreground, fontSize: 16 }}>−</Text>
                        </TouchableOpacity>
                        <View style={[styles.sliderTrack, { backgroundColor: colors.border }]}>
                          <View style={[styles.sliderFill, { width: `${available > 0 ? (val / available) * 100 : 0}%`, backgroundColor: colors.gold }]} />
                        </View>
                        <TouchableOpacity style={[styles.sliderBtn, { backgroundColor: colors.surface }]} onPress={() => (set as any)(Math.min(available, val + 1))}>
                          <Text style={{ color: colors.foreground, fontSize: 16 }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={[styles.noTroops, { color: colors.textSecondary }]}>None available</Text>
                    )}
                  </View>
                ))}

                <View style={[styles.successPreview, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.successLabel, { color: colors.textSecondary }]}>Deployed: {totalDeployed} troops</Text>
                  <Text style={[styles.successRate, { color: totalDeployed >= selected.minTroops ? colors.food : colors.destructive }]}>
                    Success: {Math.round(successRate * 100)}%
                  </Text>
                </View>

                {dispatchError && (
                  <Text style={[styles.deployError, { color: colors.destructive }]}>{dispatchError}</Text>
                )}

                <TouchableOpacity
                  style={[styles.dispatchBtn, { backgroundColor: totalDeployed >= selected.minTroops ? colors.gold : colors.muted }]}
                  onPress={handleDispatch}
                  disabled={totalDeployed < selected.minTroops || dispatchMission.isPending}
                >
                  <MaterialCommunityIcons name="send" size={16} color={totalDeployed >= selected.minTroops ? colors.background : colors.textSecondary} />
                  <Text style={[styles.dispatchText, { color: totalDeployed >= selected.minTroops ? colors.background : colors.textSecondary }]}>
                    {dispatchMission.isPending ? "Dispatching..." : "Dispatch"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1 },
  topTitle: { fontSize: 18, fontFamily: "Inter_700Bold", flex: 1 },
  hourNote: { fontSize: 11, fontFamily: "Inter_400Regular" },
  scrollContent: { padding: 12, paddingBottom: 100, gap: 10 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  activeCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  activeInfo: { flex: 1 },
  activeName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  activeTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  missionCard: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  cardRight: { alignItems: "flex-end" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardType: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  cardSuccessRate: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardLoot: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  loot: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardMinTroops: { fontSize: 11, fontFamily: "Inter_400Regular" },
  completedCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, borderWidth: 1 },
  completedInfo: { flex: 1 },
  completedName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  completedLoot: { fontSize: 11, fontFamily: "Inter_400Regular" },
  completedCas: { fontSize: 11, fontFamily: "Inter_400Regular" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000099" },
  deploySheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, gap: 12, paddingBottom: 40 },
  deployTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  deployMission: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deployDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sliderRow: { gap: 6 },
  sliderLabel: { flexDirection: "row", justifyContent: "space-between" },
  sliderLabelText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sliderCount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sliderBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  sliderBtn: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  sliderTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  sliderFill: { height: "100%", borderRadius: 3 },
  noTroops: { fontSize: 12, fontFamily: "Inter_400Regular" },
  successPreview: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: 8 },
  successLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  successRate: { fontSize: 14, fontFamily: "Inter_700Bold" },
  deployError: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dispatchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 10 },
  dispatchText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
