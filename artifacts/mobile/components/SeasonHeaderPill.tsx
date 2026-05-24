import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { GameState } from "@workspace/api-client-react";
import { useGetSeasonObjectives } from "@workspace/api-client-react";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import TabBadge from "@/components/TabBadge";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { getSeasonProgress, SEASON_META, type Season } from "@/lib/seasonMeta";

type Props = {
  gameState: GameState;
  townId?: number;
  onPress: () => void;
};

export default function SeasonHeaderPill({ gameState, townId, onPress }: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const season = gameState.season as Season;
  const meta = SEASON_META[season];
  const seasonColor = colors[season] as string;
  const { dayOfSeason } = getSeasonProgress(gameState.cycleStartedAt, season);
  const realmActive = gameState.realmEventActive && gameState.realmEvent;

  const { data: objectivesData } = useGetSeasonObjectives(townId ?? 0, {
    query: { enabled: !!townId, staleTime: 30_000 } as any,
  });

  const unclaimedCount = useMemo(
    () => objectivesData?.objectives.filter((o) => o.complete && !o.claimed).length ?? 0,
    [objectivesData],
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: withAlpha(seasonColor, pressed ? 0.18 : 0.12),
          borderColor: withAlpha(seasonColor, 0.35),
        },
      ]}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}, day ${dayOfSeason} of 7. Open season calendar.`}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={meta.icon as any} size={13} color={seasonColor} />
        <TabBadge count={unclaimedCount} variant="gold" />
      </View>
      <Text style={[styles.pillSeason, { color: seasonColor }]}>{meta.label}</Text>
      <View style={[styles.pillDot, { backgroundColor: withAlpha(seasonColor, 0.45) }]} />
      <Text style={[styles.pillDay, { color: colors.textSecondary }]}>Day {dayOfSeason}</Text>
      {realmActive ? (
        <>
          <View style={[styles.pillDot, { backgroundColor: withAlpha(colors.raid, 0.45) }]} />
          <Text style={[styles.pillDay, { color: colors.raid }]} numberOfLines={1}>
            {gameState.realmEvent!.title}
          </Text>
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  iconWrap: { width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  pillSeason: { fontSize: 11, fontFamily: "Inter_700Bold" },
  pillDot: { width: 3, height: 3, borderRadius: 2 },
  pillDay: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
