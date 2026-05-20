import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTown,
  useGetGameState,
  getGetTownQueryKey,
  getGetBuildingSlotsQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import ScreenHeader from "@/components/ScreenHeader";
import SeasonCalendarModal from "@/components/SeasonCalendarModal";
import KingdomMap from "@/components/KingdomMap";

export default function KingdomScreen() {
  const colors = useColors();
  const { townId, playerName } = useGame();
  const qc = useQueryClient();

  const { data: town, isLoading: townLoading, refetch: refetchTown } = useGetTown(
    townId ?? 0,
    { query: { enabled: !!townId } as any },
  );
  const { data: gameState } = useGetGameState({ query: { staleTime: 300_000 } as any });
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);

  const handleRefresh = () => {
    if (!townId) return;
    qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
    qc.invalidateQueries({ queryKey: getGetBuildingSlotsQueryKey(townId) });
    refetchTown();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        icon="castle"
        title={playerName ? `${playerName}'s Town` : "Your Town"}
        town={
          townId && town
            ? {
                gold: town.gold ?? 0,
                food: town.food ?? 0,
                wood: town.wood ?? 0,
                stone: town.stone ?? 0,
                goldPerHour: town.goldPerHour ?? 0,
                foodPerHour: town.foodPerHour ?? 0,
                woodPerHour: town.woodPerHour ?? 0,
                stonePerHour: town.stonePerHour ?? 0,
              }
            : undefined
        }
      >
        {town && (
          <View style={[styles.scoreBar, { borderColor: colors.border }]}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>ECONOMY</Text>
              <Text style={[styles.scoreValue, { color: colors.gold }]}>
                {(town as any).economyScore ?? 0}
              </Text>
            </View>
            <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>ARMY</Text>
              <Text style={[styles.scoreValue, { color: colors.military }]}>
                {(town as any).armyScore ?? 0}
              </Text>
            </View>
            <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>DEFENSE</Text>
              <Text style={[styles.scoreValue, { color: colors.defense }]}>
                {(town as any).totalDefense ?? 0}
              </Text>
            </View>
          </View>
        )}
      </ScreenHeader>

      {townId && (
        <KingdomMap
          townId={townId}
          refreshing={townLoading}
          onRefresh={handleRefresh}
          onSeasonPress={() => setSeasonModalOpen(true)}
        />
      )}

      {gameState && (
        <SeasonCalendarModal
          visible={seasonModalOpen}
          gameState={gameState}
          onClose={() => setSeasonModalOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scoreBar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 2,
  },
  scoreItem: { flex: 1, alignItems: "center", gap: 1 },
  scoreLabel: { fontSize: 8, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  scoreValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  scoreDivider: { width: 1, height: 22 },
});
