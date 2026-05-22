import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { GameState } from "@workspace/api-client-react";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { getSeasonProgress, SEASON_META, type Season } from "@/lib/seasonMeta";

type Props = {
  gameState: GameState;
  onPress: () => void;
};

export default function SeasonHeaderPill({ gameState, onPress }: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const season = gameState.season as Season;
  const meta = SEASON_META[season];
  const seasonColor = colors[season] as string;
  const { dayOfSeason } = getSeasonProgress(gameState.cycleStartedAt, season);

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
      <MaterialCommunityIcons name={meta.icon as any} size={13} color={seasonColor} />
      <Text style={[styles.pillSeason, { color: seasonColor }]}>{meta.label}</Text>
      <View style={[styles.pillDot, { backgroundColor: withAlpha(seasonColor, 0.45) }]} />
      <Text style={[styles.pillDay, { color: colors.textSecondary }]}>Day {dayOfSeason}</Text>
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
  pillSeason: { fontSize: 11, fontFamily: "Inter_700Bold" },
  pillDot: { width: 3, height: 3, borderRadius: 2 },
  pillDay: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
