import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTown, useGetTownGrid, usePlaceBuilding, useRemoveBuilding, useUpgradeBuilding, useResetTown,
  getGetTownQueryKey, getGetTownGridQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import ResourceBar from "@/components/ResourceBar";
import TownGrid from "@/components/TownGrid";
import type { GridCellData, BuildingType } from "@/components/TownGrid";
import SeasonBadge from "@/components/SeasonBadge";
import { useGetGameState, getGetGameStateQueryKey } from "@workspace/api-client-react";

export default function KingdomScreen() {
  const colors = useColors();
  const { townId } = useGame();
  const qc = useQueryClient();

  const { data: town, isLoading: townLoading, refetch: refetchTown } = useGetTown(townId ?? 0, { query: { enabled: !!townId } });
  const { data: gridRaw, isLoading: gridLoading, refetch: refetchGrid } = useGetTownGrid(townId ?? 0, { query: { enabled: !!townId } });
  const { data: gameState } = useGetGameState({ query: { staleTime: 300_000 } });

  const placeBuilding = usePlaceBuilding();
  const removeBuilding = useRemoveBuilding();
  const upgradeBuilding = useUpgradeBuilding();
  const resetTown = useResetTown();
  const [resetting, setResetting] = useState(false);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId ?? 0) });
    qc.invalidateQueries({ queryKey: getGetTownGridQueryKey(townId ?? 0) });
  }, [qc, townId]);

  const onRefresh = useCallback(async () => { await Promise.all([refetchTown(), refetchGrid()]); }, [refetchTown, refetchGrid]);

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
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.townName, { color: colors.foreground }]}>{town?.name ?? "Your Kingdom"}</Text>
            <Text style={[styles.population, { color: colors.textSecondary }]}>
              <MaterialCommunityIcons name="account-group" size={12} color={colors.textSecondary} /> {town?.population ?? 0} / {town?.populationCap ?? 0}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {gameState?.season && <SeasonBadge season={gameState.season as any} cycleNumber={gameState.cycleNumber} />}
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: colors.destructive + "55" }]}
              onPress={handleReset}
              disabled={resetting}
            >
              <MaterialCommunityIcons name="restore" size={14} color={colors.destructive} />
              <Text style={[styles.resetBtnText, { color: colors.destructive }]}>Reset</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.gridWrapper}>
          <TownGrid
            cells={cells}
            onPlaceBuilding={handlePlace}
            onRemoveBuilding={handleRemove}
            onUpgradeBuilding={handleUpgrade}
          />
        </View>

        <View style={[styles.legend, { borderTopColor: colors.border }]}>
          <Text style={[styles.legendTitle, { color: colors.textSecondary }]}>Refund: 75% of build cost</Text>
          <View style={styles.legendRow}>
            {[["border","Wall bonus zone", "#5a7a9a"], ["castle","Inner grid", colors.textSecondary]].map(([icon, label, color]) => (
              <View key={icon} style={styles.legendItem}>
                <MaterialCommunityIcons name={icon as any} size={12} color={color as string} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: 100 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  headerRight: { alignItems: "flex-end", gap: 6 },
  townName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  population: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  resetBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  gridWrapper: { paddingHorizontal: 12 },
  legend: { paddingHorizontal: 12, paddingTop: 10, marginTop: 4, borderTopWidth: 1, gap: 6 },
  legendTitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  legendRow: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
