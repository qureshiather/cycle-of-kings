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

export default function SeasonStrip({ gameState, onPress }: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const season = gameState.season as Season;
  const meta = SEASON_META[season];
  const seasonColor = colors[season] as string;
  const progress = getSeasonProgress(gameState.cycleStartedAt, season);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.strip,
        {
          backgroundColor: withAlpha(seasonColor, 0.1),
          borderColor: withAlpha(seasonColor, 0.35),
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}, ${meta.tagline}. Open season calendar.`}
    >
      <View style={[styles.iconWrap, { backgroundColor: withAlpha(seasonColor, 0.18) }]}>
        <MaterialCommunityIcons name={meta.icon as any} size={18} color={seasonColor} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: seasonColor }]}>{meta.label}</Text>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>{meta.tagline}</Text>
      </View>
      <View style={styles.progressCol}>
        <Text style={[styles.day, { color: colors.textSecondary }]}>
          Day {progress.dayOfSeason}/7
        </Text>
        <View style={[styles.track, { backgroundColor: withAlpha(seasonColor, 0.15) }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.round(progress.progress * 100)}%`,
                backgroundColor: seasonColor,
              },
            ]}
          />
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={seasonColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 11, fontFamily: "Inter_400Regular" },
  progressCol: { alignItems: "flex-end", gap: 4, minWidth: 64 },
  day: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  track: { width: 64, height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
});
