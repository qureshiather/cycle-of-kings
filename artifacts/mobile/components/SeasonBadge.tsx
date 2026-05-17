import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type Season = "spring" | "summer" | "autumn" | "winter";

const SEASON_META: Record<Season, { icon: string; label: string }> = {
  spring: { icon: "flower",      label: "Spring" },
  summer: { icon: "white-balance-sunny", label: "Summer" },
  autumn: { icon: "leaf",        label: "Autumn" },
  winter: { icon: "snowflake",   label: "Winter" },
};

interface SeasonBadgeProps {
  season: Season;
  cycleNumber?: number;
  compact?: boolean;
}

export default function SeasonBadge({ season, cycleNumber, compact }: SeasonBadgeProps) {
  const colors = useColors();
  const meta = SEASON_META[season];
  const seasonColor = colors[season as keyof typeof colors] as string;

  if (compact) {
    return (
      <View style={[styles.badge, { backgroundColor: seasonColor + "22", borderColor: seasonColor + "55" }]}>
        <MaterialCommunityIcons name={meta.icon as any} size={12} color={seasonColor} />
        <Text style={[styles.label, { color: seasonColor }]}>{meta.label}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badgeLarge, { backgroundColor: seasonColor + "22", borderColor: seasonColor + "55" }]}>
      <MaterialCommunityIcons name={meta.icon as any} size={18} color={seasonColor} />
      <View>
        <Text style={[styles.labelLarge, { color: seasonColor }]}>{meta.label}</Text>
        {cycleNumber !== undefined && (
          <Text style={[styles.cycle, { color: colors.textSecondary }]}>Cycle {cycleNumber}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  badgeLarge: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  labelLarge: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cycle: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
