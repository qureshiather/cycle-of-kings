import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTown,
  useGetGameState,
  getGetTownQueryKey,
  getGetBuildingSlotsQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useGame } from "@/context/GameContext";
import KingdomVistaModal from "@/components/KingdomVistaModal";
import KingdomMap from "@/components/KingdomMap";
import ScreenHeader from "@/components/ScreenHeader";
import SeasonHeaderPill from "@/components/SeasonHeaderPill";
import SeasonCalendarModal from "@/components/SeasonCalendarModal";

export default function KingdomScreen() {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const { townId, playerName } = useGame();
  const qc = useQueryClient();

  const { data: town, isLoading: townLoading, refetch: refetchTown } = useGetTown(
    townId ?? 0,
    { query: { enabled: !!townId } as any },
  );
  const { data: gameState } = useGetGameState({ query: { staleTime: 300_000 } as any });
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [vistaModalOpen, setVistaModalOpen] = useState(false);

  const openSeasonCalendar = () => setSeasonModalOpen(true);

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
        trailing={
          <View style={styles.headerActions}>
            {townId ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setVistaModalOpen(true);
                }}
                style={({ pressed }) => [
                  styles.headerIconBtn,
                  {
                    backgroundColor: withAlpha(colors.gold, pressed ? 0.18 : 0.1),
                    borderColor: withAlpha(colors.gold, 0.3),
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="View kingdom map"
              >
                <MaterialCommunityIcons name="map-outline" size={16} color={colors.gold} />
              </Pressable>
            ) : null}
            {gameState ? (
              <SeasonHeaderPill gameState={gameState} onPress={openSeasonCalendar} />
            ) : null}
          </View>
        }
        town={
          townId && town
            ? {
                gold: town.gold ?? 0,
                food: town.food ?? 0,
                wood: town.wood ?? 0,
                stone: town.stone ?? 0,
                goldPerHour: town.goldPerHour ?? 0,
                foodNetPerHour: Math.round(
                  (town.netFoodPerHour ??
                    (town.foodPerHour ?? 0) - (town.foodUpkeepPerHour ?? 0)) * 10,
                ) / 10,
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
        <KingdomMap townId={townId} refreshing={townLoading} onRefresh={handleRefresh} />
      )}

      {townId && (
        <KingdomVistaModal
          visible={vistaModalOpen}
          townId={townId}
          onClose={() => setVistaModalOpen(false)}
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  headerIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
