import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { SEASON_META, type Season } from "@/lib/seasonMeta";

interface SeasonBadgeProps {
  season: Season;
  cycleNumber?: number;
  compact?: boolean;
  onPress?: () => void;
}

export default function SeasonBadge({ season, cycleNumber, compact, onPress }: SeasonBadgeProps) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const meta = SEASON_META[season];
  const seasonColor = colors[season as keyof typeof colors] as string;

  const content = compact ? (
    <View style={[styles.badge, { backgroundColor: withAlpha(seasonColor, 0.12), borderColor: withAlpha(seasonColor, 0.35) }]}>
      <MaterialCommunityIcons name={meta.icon as any} size={12} color={seasonColor} />
      <Text style={[styles.label, { color: seasonColor }]}>{meta.label}</Text>
    </View>
  ) : (
    <View style={[styles.badgeLarge, { backgroundColor: withAlpha(seasonColor, 0.12), borderColor: withAlpha(seasonColor, 0.35) }]}>
      <MaterialCommunityIcons name={meta.icon as any} size={18} color={seasonColor} />
      <View>
        <Text style={[styles.labelLarge, { color: seasonColor }]}>{meta.label}</Text>
        {cycleNumber !== undefined && (
          <Text style={[styles.cycle, { color: colors.textSecondary }]}>Cycle {cycleNumber}</Text>
        )}
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${meta.label} season calendar`}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  badgeLarge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  labelLarge: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cycle: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
