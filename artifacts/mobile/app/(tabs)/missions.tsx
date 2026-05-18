import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { getMaxActiveMissionsFromSlots } from "@workspace/building-progression";
import {
  useGetMissions, useGetTownMissions, useDispatchMission, useGetTownArmy, useGetTown,
  useGetBuildingSlots,
  getGetTownMissionsQueryKey, getGetTownArmyQueryKey, getGetTownQueryKey,
} from "@workspace/api-client-react";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useGame } from "@/context/GameContext";
import ScreenHeader from "@/components/ScreenHeader";

function diffColor(difficulty: string, colors: ReturnType<typeof useColors>): string {
  if (difficulty === "easy") return colors.difficultyEasy;
  if (difficulty === "medium") return colors.difficultyMedium;
  if (difficulty === "hard") return colors.difficultyHard;
  return colors.textSecondary;
}
const DIFF_LABELS: Record<string, string> = { easy: "EASY", medium: "MEDIUM", hard: "HARD" };
const TYPE_ICONS: Record<string, string> = { explore: "compass", patrol: "shield-half-full", raid: "sword" };
const MERC_COST = 10;

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
  const { withAlpha } = useTheme();
  const { townId } = useGame();
  const qc = useQueryClient();

  const { data: missionCards, isLoading: cardsLoading } = useGetMissions(
    { townId: townId ?? 0 },
    { query: { enabled: !!townId, refetchInterval: 60_000 } as any }
  );
  const { data: activeMissions, refetch } = useGetTownMissions(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: army } = useGetTownArmy(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: town } = useGetTown(townId ?? 0, { query: { enabled: !!townId } as any });
  const { data: slots = [] } = useGetBuildingSlots(townId ?? 0, { query: { enabled: !!townId } as any });
  const dispatchMission = useDispatchMission();

  const maxActiveMissions = getMaxActiveMissionsFromSlots(slots);

  const [selected, setSelected] = useState<any | null>(null);
  const [infantry, setInfantry] = useState(0);
  const [archers, setArchers] = useState(0);
  const [cavalry, setCavalry] = useState(0);
  const [mercenaries, setMercenaries] = useState(0);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const availableInfantry = army?.availableInfantry ?? 0;
  const availableArchers  = army?.availableArchers  ?? 0;
  const availableCavalry  = army?.availableCavalry  ?? 0;

  const totalDeployed = infantry + archers + cavalry + mercenaries;
  const mercCost = mercenaries * MERC_COST;
  const successRate = selected
    ? Math.min(0.95, selected.baseSuccessRate + Math.max(0, totalDeployed - selected.minTroops) * 0.01)
    : 0;

  const activeMissionsList = (activeMissions ?? []).filter((m: any) => m.status === "active");
  const completedMissions = (activeMissions ?? []).filter((m: any) => m.status !== "active").slice(0, 5);
  const atMissionLimit = activeMissionsList.length >= maxActiveMissions;
  const canUnlockMoreMissionSlots = maxActiveMissions < 3;
  const missionSlotsLabel = `${activeMissionsList.length}/${maxActiveMissions} active`;

  const openMission = (card: any) => {
    if (atMissionLimit) return;
    setSelected(card);
    setInfantry(0); setArchers(0); setCavalry(0); setMercenaries(0);
    setDispatchError(null);
  };

  const handleDispatch = () => {
    if (!townId || !selected) return;
    setDispatchError(null);
    dispatchMission.mutate(
      { townId, data: { missionCardId: selected.id, infantry, archers, cavalry, mercenaries } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSelected(null);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        icon="map-legend"
        title="Missions"
        subtitle={`3 cards/h · ${missionSlotsLabel}`}
        gold={townId ? (town?.gold ?? 0) : undefined}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeMissionsList.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACTIVE</Text>
              {canUnlockMoreMissionSlots && (
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() =>
                    Alert.alert(
                      "Mission slots",
                      `Upgrade Town Hall to run up to 3 missions at once. You currently have ${maxActiveMissions} active slot${maxActiveMissions === 1 ? "" : "s"}.`,
                    )
                  }
                >
                  <MaterialCommunityIcons name="information-outline" size={14} color={colors.gold} />
                </TouchableOpacity>
              )}
            </View>
            {activeMissionsList.map((m: any) => (
              <View key={m.id} style={[styles.activeCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <MaterialCommunityIcons name={TYPE_ICONS[m.missionType] as any ?? "map"} size={20} color={colors.gold} />
                <View style={styles.activeInfo}>
                  <Text style={[styles.activeName, { color: colors.foreground }]}>{m.missionTitle}</Text>
                  <Text style={[styles.activeTime, { color: colors.textSecondary }]}>
                    {m.infantry + m.archers + m.cavalry + (m.mercenaries ?? 0)} troops — returns in {timeLeft(m.returnsAt)}
                  </Text>
                </View>
                <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
              </View>
            ))}
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AVAILABLE MISSIONS</Text>

        {cardsLoading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: 20 }} />
        ) : (
          (missionCards ?? []).map((card: any) => {
            const diff = diffColor(card.difficulty, colors);
            return (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.missionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderLeftColor: diff,
                    borderLeftWidth: 3,
                    opacity: atMissionLimit ? 0.5 : 1,
                  },
                ]}
                onPress={() => openMission(card)}
                disabled={atMissionLimit}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.typeIcon, { backgroundColor: withAlpha(diff, 0.12) }]}>
                      <MaterialCommunityIcons name={TYPE_ICONS[card.type] as any ?? "map"} size={16} color={diff} />
                    </View>
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{card.title}</Text>
                      <Text style={[styles.cardType, { color: diff }]}>
                        {card.type.toUpperCase()} · {DIFF_LABELS[card.difficulty] ?? card.difficulty.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={[styles.cardSuccessRate, { color: diff }]}>{Math.round(card.baseSuccessRate * 100)}%</Text>
                    <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>base</Text>
                  </View>
                </View>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{card.description}</Text>
                <View style={styles.cardFooter}>
                  <View style={styles.cardLoot}>
                    {card.lootGold  > 0 && <Text style={[styles.loot, { color: colors.gold  }]}>+{card.lootGold}g</Text>}
                    {card.lootFood  > 0 && <Text style={[styles.loot, { color: colors.food  }]}>+{card.lootFood}f</Text>}
                    {card.lootWood  > 0 && <Text style={[styles.loot, { color: colors.wood  }]}>+{card.lootWood}w</Text>}
                    {card.lootStone > 0 && <Text style={[styles.loot, { color: colors.stone }]}>+{card.lootStone}s</Text>}
                  </View>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                    {card.minTroops} troops min · {card.durationMinutes}m
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {completedMissions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 8 }]}>RECENT</Text>
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
                      +{[m.lootGold && `${Math.round(m.lootGold)}g`, m.lootFood && `${Math.round(m.lootFood)}f`, m.lootWood && `${Math.round(m.lootWood)}w`].filter(Boolean).join(" ")}
                    </Text>
                  )}
                  {(m.casualties ?? 0) > 0 && (
                    <Text style={[styles.completedCas, { color: colors.destructive }]}>{m.casualties} casualties</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <ModalOverlay onPress={() => setSelected(null)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.deploySheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            {selected && (
              <>
                <Text style={[styles.deployTitle, { color: colors.foreground }]}>Deploy Forces</Text>
                <Text style={[styles.deployMission, { color: diffColor(selected.difficulty, colors) }]}>{selected.title}</Text>
                <Text style={[styles.deployDesc, { color: colors.textSecondary }]}>
                  Min {selected.minTroops} troops · {selected.durationMinutes}min
                </Text>

                {([
                  { key: "infantry", label: "Infantry",  available: availableInfantry, val: infantry, set: setInfantry },
                  { key: "archers",  label: "Archers",   available: availableArchers,  val: archers,  set: setArchers },
                  { key: "cavalry",  label: "Cavalry",   available: availableCavalry,  val: cavalry,  set: setCavalry },
                ] as const).map(({ key, label, available, val, set }) => (
                  available > 0 ? (
                    <View key={key} style={styles.troopRow}>
                      <Text style={[styles.troopLabel, { color: colors.foreground }]}>{label}</Text>
                      <View style={styles.troopControls}>
                        <TouchableOpacity style={[styles.stepBtn, { backgroundColor: colors.surface }]} onPress={() => (set as any)(Math.max(0, val - 1))}>
                          <Text style={{ color: colors.foreground }}>−</Text>
                        </TouchableOpacity>
                        <Text style={[styles.troopVal, { color: colors.gold }]}>{val}/{available}</Text>
                        <TouchableOpacity style={[styles.stepBtn, { backgroundColor: colors.surface }]} onPress={() => (set as any)(Math.min(available, val + 1))}>
                          <Text style={{ color: colors.foreground }}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null
                ))}

                <View style={[styles.mercRow, { borderColor: colors.gold + "44", backgroundColor: colors.gold + "0d" }]}>
                  <View style={styles.mercLeft}>
                    <MaterialCommunityIcons name="account-multiple-plus" size={16} color={colors.gold} />
                    <View>
                      <Text style={[styles.mercLabel, { color: colors.foreground }]}>Mercenaries</Text>
                      <Text style={[styles.mercCostText, { color: colors.gold }]}>{MERC_COST} gold each · {mercCost} total</Text>
                    </View>
                  </View>
                  <View style={styles.troopControls}>
                    <TouchableOpacity style={[styles.stepBtn, { backgroundColor: colors.surface }]} onPress={() => setMercenaries(Math.max(0, mercenaries - 1))}>
                      <Text style={{ color: colors.foreground }}>−</Text>
                    </TouchableOpacity>
                    <Text style={[styles.troopVal, { color: colors.gold }]}>{mercenaries}</Text>
                    <TouchableOpacity style={[styles.stepBtn, { backgroundColor: colors.surface }]} onPress={() => setMercenaries(mercenaries + 1)}>
                      <Text style={{ color: colors.foreground }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.successPreview, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.successLabel, { color: colors.textSecondary }]}>{totalDeployed} troops deployed</Text>
                  <Text style={[styles.successRate, { color: totalDeployed >= selected.minTroops ? colors.success : colors.destructive }]}>
                    {Math.round(successRate * 100)}% success
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
                  <MaterialCommunityIcons name="send" size={16} color={totalDeployed >= selected.minTroops ? colors.onPrimary : colors.textSecondary} />
                  <Text style={[styles.dispatchText, { color: totalDeployed >= selected.minTroops ? colors.onPrimary : colors.textSecondary }]}>
                    {dispatchMission.isPending ? "Dispatching..." : "Dispatch"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          </TouchableOpacity>
        </ModalOverlay>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 100, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  activeCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  activeInfo: { flex: 1 },
  activeName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  activeTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  missionCard: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  typeIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cardRight: { alignItems: "flex-end" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardType: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  cardSuccessRate: { fontSize: 18, fontFamily: "Inter_700Bold" },
  cardLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLoot: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  loot: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cardMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  completedCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, borderWidth: 1 },
  completedInfo: { flex: 1 },
  completedName: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  completedLoot: { fontSize: 11, fontFamily: "Inter_400Regular" },
  completedCas: { fontSize: 11, fontFamily: "Inter_400Regular" },
  deploySheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, gap: 12, paddingBottom: 40 },
  deployTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  deployMission: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deployDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  troopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  troopLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  troopControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  troopVal: { fontSize: 14, fontFamily: "Inter_700Bold", minWidth: 48, textAlign: "center" },
  mercRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, borderRadius: 8, borderWidth: 1 },
  mercLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  mercLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  mercCostText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  successPreview: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: 8 },
  successLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  successRate: { fontSize: 14, fontFamily: "Inter_700Bold" },
  deployError: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dispatchBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 10 },
  dispatchText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
