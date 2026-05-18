import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator, Alert, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTown, useGetTownGrid, usePlaceBuilding, useRemoveBuilding, useUpgradeBuilding, useResetTown,
  useGetFortifications, usePlaceFortification, useRemoveFortification,
  getGetTownQueryKey, getGetTownGridQueryKey, getGetFortificationsQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import ResourceBar from "@/components/ResourceBar";
import TownGrid from "@/components/TownGrid";
import type { GridCellData, BuildingType } from "@/components/TownGrid";
import SeasonBadge from "@/components/SeasonBadge";
import { useGetGameState } from "@workspace/api-client-react";

const BORDER_SEQUENCE: [number, number][] = [
  ...Array.from({ length: 9 }, (_, c) => [0, c] as [number, number]),
  ...Array.from({ length: 9 }, (_, c) => [8, c] as [number, number]),
  ...Array.from({ length: 7 }, (_, r) => [r + 1, 0] as [number, number]),
  ...Array.from({ length: 7 }, (_, r) => [r + 1, 8] as [number, number]),
];

function nextBorderPos(forts: Array<{ row: number; col: number }>): [number, number] | null {
  const occupied = new Set(forts.map(f => `${f.row}-${f.col}`));
  for (const pos of BORDER_SEQUENCE) {
    if (!occupied.has(`${pos[0]}-${pos[1]}`)) return pos;
  }
  return null;
}

export default function KingdomScreen() {
  const colors = useColors();
  const { townId, playerName } = useGame();
  const qc = useQueryClient();

  const { data: town, isLoading: townLoading, refetch: refetchTown } = useGetTown(townId ?? 0, { query: { enabled: !!townId } });
  const { data: gridRaw, isLoading: gridLoading, refetch: refetchGrid } = useGetTownGrid(townId ?? 0, { query: { enabled: !!townId } });
  const { data: gameState } = useGetGameState({ query: { staleTime: 300_000 } });
  const { data: forts = [], refetch: refetchForts } = useGetFortifications(townId ?? 0, { query: { enabled: !!townId } });

  const placeBuilding = usePlaceBuilding();
  const removeBuilding = useRemoveBuilding();
  const upgradeBuilding = useUpgradeBuilding();
  const resetTown = useResetTown();
  const placeFortification = usePlaceFortification();
  const removeFortification = useRemoveFortification();

  const [resetting, setResetting] = useState(false);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId ?? 0) });
    qc.invalidateQueries({ queryKey: getGetTownGridQueryKey(townId ?? 0) });
    qc.invalidateQueries({ queryKey: getGetFortificationsQueryKey(townId ?? 0) });
  }, [qc, townId]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchTown(), refetchGrid(), refetchForts()]);
  }, [refetchTown, refetchGrid, refetchForts]);

  const handleReset = useCallback(() => {
    if (!townId) return;
    Alert.alert(
      "Reset Kingdom",
      "This will demolish all buildings, disband your army, cancel all missions, and restore your starting resources. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setResetting(true);
            resetTown.mutate({ townId }, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                invalidate();
                setResetting(false);
              },
              onError: () => setResetting(false),
            });
          },
        },
      ]
    );
  }, [townId, resetTown, invalidate]);

  const cells: GridCellData[] = (gridRaw ?? []).map((c: any) => ({
    id: c.id, townId: c.townId, row: c.row, col: c.col,
    buildingType: c.buildingType as BuildingType,
    level: c.level, upgrading: c.upgrading, upgradeEndsAt: c.upgradeEndsAt ?? null,
  }));

  const handlePlace = useCallback((row: number, col: number, buildingType: BuildingType) => {
    if (!townId) return;
    placeBuilding.mutate({ townId, data: { row, col, buildingType } }, {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); invalidate(); },
      onError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    });
  }, [townId, placeBuilding, invalidate]);

  const handleRemove = useCallback((row: number, col: number) => {
    if (!townId) return;
    removeBuilding.mutate({ townId, row, col }, {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); invalidate(); },
    });
  }, [townId, removeBuilding, invalidate]);

  const handleUpgrade = useCallback((row: number, col: number) => {
    if (!townId) return;
    upgradeBuilding.mutate({ townId, row, col }, {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); invalidate(); },
      onError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    });
  }, [townId, upgradeBuilding, invalidate]);

  const handleBuildFort = useCallback((type: "wall" | "tower") => {
    if (!townId) return;
    const pos = nextBorderPos(forts as any[]);
    if (!pos) { Alert.alert("No space", "All border cells are fortified."); return; }
    placeFortification.mutate({ townId, data: { row: pos[0], col: pos[1], type } }, {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); invalidate(); },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Insufficient resources");
      },
    });
  }, [townId, forts, placeFortification, invalidate]);

  const handleRemoveFort = useCallback((row: number, col: number) => {
    if (!townId) return;
    removeFortification.mutate({ townId, row, col }, {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); invalidate(); },
    });
  }, [townId, removeFortification, invalidate]);

  const wallCount = (forts as any[]).filter((f: any) => f.type === "wall").length;
  const towerCount = (forts as any[]).filter((f: any) => f.type === "tower").length;
  const fortsFull = nextBorderPos(forts as any[]) === null;

  const canAffordWall = (town?.stone ?? 0) >= 30;
  const canAffordTower = (town?.wood ?? 0) >= 20 && (town?.stone ?? 0) >= 50 && (town?.gold ?? 0) >= 10;

  const popPct = town ? Math.min(1, town.population / Math.max(1, town.populationCap ?? 1)) : 0;

  if (townLoading || gridLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {town && (
        <ResourceBar
          gold={town.gold} food={town.food} wood={town.wood} stone={town.stone}
          goldPerHour={town.goldPerHour} foodPerHour={town.foodPerHour}
          woodPerHour={town.woodPerHour} stonePerHour={town.stonePerHour}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.gold} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ── */}
        <View style={[styles.heroHeader, { borderBottomColor: colors.border }]}>
          <View style={styles.heroLeft}>
            <View style={styles.rulerRow}>
              <MaterialCommunityIcons name="crown" size={18} color={colors.gold} />
              <Text style={[styles.rulerName, { color: colors.gold }]}>{playerName ?? "King"}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <MaterialCommunityIcons name="account-group" size={12} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {town?.population ?? 0}/{town?.populationCap ?? 0}
                </Text>
                <View style={[styles.popBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.popFill, { width: `${Math.round(popPct * 100)}%` as any, backgroundColor: popPct > 0.9 ? colors.destructive : colors.gold }]} />
                </View>
              </View>
              <View style={styles.statChip}>
                <MaterialCommunityIcons name="shield-half-full" size={12} color="#5a7a9a" />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>DEF {town?.defenseRating ?? 0}</Text>
              </View>
            </View>
          </View>
          <View style={styles.heroRight}>
            {gameState?.season && (
              <SeasonBadge season={gameState.season as any} cycleNumber={gameState.cycleNumber} compact />
            )}
          </View>
        </View>

        {/* ── Grid ── */}
        <View style={styles.gridWrapper}>
          <TownGrid
            cells={cells}
            onPlaceBuilding={handlePlace}
            onRemoveBuilding={handleRemove}
            onUpgradeBuilding={handleUpgrade}
          />
        </View>

        {/* ── Fortifications ── */}
        <View style={[styles.section, { borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="wall" size={16} color="#5a7a9a" />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fortifications</Text>
            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Border cells get +50% bonus</Text>
          </View>

          <View style={styles.fortStats}>
            <View style={[styles.fortStatBox, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="wall" size={20} color="#5a7a9a" />
              <Text style={[styles.fortStatNum, { color: colors.foreground }]}>{wallCount}</Text>
              <Text style={[styles.fortStatLabel, { color: colors.textSecondary }]}>Walls</Text>
            </View>
            <View style={[styles.fortStatBox, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="chess-rook" size={20} color="#8a7a9a" />
              <Text style={[styles.fortStatNum, { color: colors.foreground }]}>{towerCount}</Text>
              <Text style={[styles.fortStatLabel, { color: colors.textSecondary }]}>Towers</Text>
            </View>
            <View style={[styles.fortStatBox, { backgroundColor: colors.surface }]}>
              <MaterialCommunityIcons name="shield-half-full" size={20} color="#4a8a6a" />
              <Text style={[styles.fortStatNum, { color: colors.foreground }]}>{town?.defenseRating ?? 0}</Text>
              <Text style={[styles.fortStatLabel, { color: colors.textSecondary }]}>Defense</Text>
            </View>
          </View>

          <View style={styles.fortButtons}>
            <TouchableOpacity
              style={[
                styles.fortBtn,
                {
                  backgroundColor: canAffordWall && !fortsFull ? "#5a7a9a18" : colors.surface,
                  borderColor: canAffordWall && !fortsFull ? "#5a7a9a66" : colors.border,
                  opacity: fortsFull ? 0.5 : 1,
                },
              ]}
              onPress={() => handleBuildFort("wall")}
              disabled={fortsFull || placeFortification.isPending}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="wall" size={18} color={canAffordWall && !fortsFull ? "#5a7a9a" : colors.textSecondary} />
              <View style={styles.fortBtnText}>
                <Text style={[styles.fortBtnLabel, { color: canAffordWall && !fortsFull ? colors.foreground : colors.textSecondary }]}>
                  Build Wall
                </Text>
                <Text style={[styles.fortBtnCost, { color: canAffordWall ? colors.gold : colors.destructive }]}>
                  30 Stone
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.fortBtn,
                {
                  backgroundColor: canAffordTower && !fortsFull ? "#8a7a9a18" : colors.surface,
                  borderColor: canAffordTower && !fortsFull ? "#8a7a9a66" : colors.border,
                  opacity: fortsFull ? 0.5 : 1,
                },
              ]}
              onPress={() => handleBuildFort("tower")}
              disabled={fortsFull || placeFortification.isPending}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="chess-rook" size={18} color={canAffordTower && !fortsFull ? "#8a7a9a" : colors.textSecondary} />
              <View style={styles.fortBtnText}>
                <Text style={[styles.fortBtnLabel, { color: canAffordTower && !fortsFull ? colors.foreground : colors.textSecondary }]}>
                  Build Tower
                </Text>
                <Text style={[styles.fortBtnCost, { color: canAffordTower ? colors.gold : colors.destructive }]}>
                  20W · 50St · 10G
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {(forts as any[]).length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fortList}>
              {(forts as any[]).map((f: any) => (
                <TouchableOpacity
                  key={`${f.row}-${f.col}`}
                  style={[styles.fortChip, { backgroundColor: colors.surface, borderColor: f.borderBonus ? "#5a7a9a55" : colors.border }]}
                  onPress={() => Alert.alert(
                    `Remove ${f.type}?`,
                    `${f.type === "wall" ? "Wall" : "Tower"} at border cell (${f.row},${f.col})${f.borderBonus ? " — border bonus active" : ""}`,
                    [
                      { text: "Keep", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => handleRemoveFort(f.row, f.col) },
                    ]
                  )}
                >
                  <MaterialCommunityIcons
                    name={f.type === "tower" ? "chess-rook" : "wall"}
                    size={13}
                    color={f.borderBonus ? "#5a7a9a" : colors.textSecondary}
                  />
                  {f.borderBonus && <MaterialCommunityIcons name="star" size={9} color={colors.gold} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── Danger Zone ── */}
        <View style={[styles.dangerZone, { borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.destructive + "44" }]}
            onPress={handleReset}
            disabled={resetting}
            activeOpacity={0.7}
          >
            {resetting
              ? <ActivityIndicator size="small" color={colors.destructive} />
              : <MaterialCommunityIcons name="restore" size={14} color={colors.destructive} />
            }
            <Text style={[styles.resetBtnText, { color: colors.destructive }]}>Reset Kingdom</Text>
          </TouchableOpacity>
          <Text style={[styles.resetHint, { color: colors.textSecondary }]}>Demolishes all buildings · 75% refund</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: 110 },

  heroHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1,
  },
  heroLeft: { flex: 1, gap: 6 },
  heroRight: { alignItems: "flex-end", gap: 6 },
  rulerRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  rulerName: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  popBar: { width: 36, height: 4, borderRadius: 2, overflow: "hidden" },
  popFill: { height: "100%", borderRadius: 2 },

  gridWrapper: { paddingHorizontal: 12, paddingTop: 12 },

  section: {
    marginHorizontal: 12, marginTop: 14,
    borderRadius: 12, borderWidth: 1,
    padding: 14, gap: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 14, fontFamily: "Inter_700Bold", flex: 1 },
  sectionSub: { fontSize: 10, fontFamily: "Inter_400Regular" },

  fortStats: { flexDirection: "row", gap: 8 },
  fortStatBox: {
    flex: 1, alignItems: "center", paddingVertical: 10, paddingHorizontal: 4,
    borderRadius: 10, gap: 3,
  },
  fortStatNum: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 22 },
  fortStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },

  fortButtons: { flexDirection: "row", gap: 8 },
  fortBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 10, borderWidth: 1,
  },
  fortBtnText: { flex: 1 },
  fortBtnLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  fortBtnCost: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },

  fortList: { marginTop: 2 },
  fortChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, marginRight: 6,
  },

  dangerZone: {
    marginHorizontal: 12, marginTop: 14,
    borderRadius: 12, borderWidth: 1,
    padding: 14, alignItems: "center", gap: 6,
  },
  resetBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
  },
  resetBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  resetHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
