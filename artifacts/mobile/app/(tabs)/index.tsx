import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTown, useGetGameState, useGetBuildingSlots,
  getGetTownQueryKey, getGetBuildingSlotsQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import ResourceBar from "@/components/ResourceBar";
import SeasonBadge from "@/components/SeasonBadge";
import KingdomMap from "@/components/KingdomMap";

export default function KingdomScreen() {
  const colors = useColors();
  const { townId, playerName } = useGame();
  const qc = useQueryClient();

  const { data: town, isLoading: townLoading, refetch: refetchTown } = useGetTown(
    townId ?? 0, { query: { enabled: !!townId } as any }
  );
  const { data: gameState } = useGetGameState({ query: { staleTime: 300_000 } as any });

  const handleRefresh = () => {
    if (!townId) return;
    qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
    qc.invalidateQueries({ queryKey: getGetBuildingSlotsQueryKey(townId) });
    refetchTown();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <MaterialCommunityIcons name="castle" size={20} color={colors.gold} />
        <Text style={[styles.topTitle, { color: colors.foreground }]}>
          {playerName ? `${playerName}'s Kingdom` : "Kingdom"}
        </Text>
        {gameState && <SeasonBadge season={gameState.season as any} />}
      </View>

      {townId && (
        <ResourceBar
          gold={town?.gold ?? 0}
          food={town?.food ?? 0}
          wood={town?.wood ?? 0}
          stone={town?.stone ?? 0}
          goldPerHour={town?.goldPerHour ?? 0}
          foodPerHour={town?.foodPerHour ?? 0}
          woodPerHour={town?.woodPerHour ?? 0}
          stonePerHour={town?.stonePerHour ?? 0}
        />
      )}

      {townId && (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={townLoading}
              onRefresh={handleRefresh}
              tintColor={colors.gold}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          {town && (
            <View style={[styles.scoreBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.scoreItem}>
                <MaterialCommunityIcons name="chart-line" size={14} color={colors.gold} />
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>ECONOMY</Text>
                <Text style={[styles.scoreValue, { color: colors.gold }]}>{(town as any).economyScore ?? 0}</Text>
              </View>
              <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />
              <View style={styles.scoreItem}>
                <MaterialCommunityIcons name="sword-cross" size={14} color="#8a3030" />
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>ARMY</Text>
                <Text style={[styles.scoreValue, { color: "#8a3030" }]}>{(town as any).armyScore ?? 0}</Text>
              </View>
              <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />
              <View style={styles.scoreItem}>
                <MaterialCommunityIcons name="shield" size={14} color="#5a7a9a" />
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>DEFENSE</Text>
                <Text style={[styles.scoreValue, { color: "#5a7a9a" }]}>{(town as any).totalDefense ?? 0}</Text>
              </View>
            </View>
          )}

          <KingdomMap townId={townId} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1,
  },
  topTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_700Bold" },
  scoreBar: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 10, marginTop: 10, marginBottom: 4,
    borderRadius: 10, borderWidth: 1, padding: 12,
  },
  scoreItem: { flex: 1, alignItems: "center", gap: 3 },
  scoreLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  scoreValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scoreDivider: { width: 1, height: 30, marginHorizontal: 4 },
});
