import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTown,
  useGetGameState,
  getGetTownQueryKey,
  getGetBuildingSlotsQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTopInset } from "@/hooks/useTopInset";
import { useGame } from "@/context/GameContext";
import ResourceBar from "@/components/ResourceBar";
import SeasonBadge from "@/components/SeasonBadge";
import KingdomMap from "@/components/KingdomMap";

export default function KingdomScreen() {
  const colors = useColors();
  const topInset = useTopInset(6);
  const { townId, playerName } = useGame();
  const qc = useQueryClient();

  const { data: town, isLoading: townLoading, refetch: refetchTown } = useGetTown(
    townId ?? 0,
    { query: { enabled: !!townId } as any },
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
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: topInset,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <MaterialCommunityIcons name="castle" size={18} color={colors.gold} />
          <Text style={[styles.topTitle, { color: colors.foreground }]} numberOfLines={1}>
            {playerName ? `${playerName}'s Town` : "Your Town"}
          </Text>
          {gameState && (
            <SeasonBadge season={gameState.season as any} compact />
          )}
        </View>

        {townId && (
          <ResourceBar
            embedded
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
              <Text style={[styles.scoreValue, { color: "#c45a5a" }]}>
                {(town as any).armyScore ?? 0}
              </Text>
            </View>
            <View style={[styles.scoreDivider, { backgroundColor: colors.border }]} />
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>DEFENSE</Text>
              <Text style={[styles.scoreValue, { color: "#6a9ac4" }]}>
                {(town as any).totalDefense ?? 0}
              </Text>
            </View>
          </View>
        )}
      </View>

      {townId && (
        <KingdomMap
          townId={townId}
          refreshing={townLoading}
          onRefresh={handleRefresh}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 28,
  },
  topTitle: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
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
