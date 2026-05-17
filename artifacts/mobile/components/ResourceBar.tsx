import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

interface ResourceBarProps {
  gold: number;
  food: number;
  wood: number;
  stone: number;
  goldPerHour?: number;
  foodPerHour?: number;
  woodPerHour?: number;
  stonePerHour?: number;
}

function fmt(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return Math.floor(n).toString();
}

interface ResourcePillProps { icon: string; label: string; value: number; color: string; perHour?: number; }

function ResourcePill({ icon, label, value, color, perHour }: ResourcePillProps) {
  const colors = useColors();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surface }]}>
      <MaterialCommunityIcons name={icon as any} size={13} color={color} />
      <View style={styles.pillText}>
        <Text style={[styles.pillLabel, { color }]}>{label}</Text>
        <Text style={[styles.pillValue, { color: colors.foreground }]}>{fmt(value)}</Text>
        {perHour !== undefined && perHour > 0 && (
          <Text style={[styles.pillRate, { color: colors.textSecondary }]}>+{fmt(perHour)}/h</Text>
        )}
      </View>
    </View>
  );
}

export default function ResourceBar({ gold, food, wood, stone, goldPerHour, foodPerHour, woodPerHour, stonePerHour }: ResourceBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + 6, borderBottomColor: colors.border }]}>
      <View style={styles.row}>
        <ResourcePill icon="gold" label="GOLD" value={gold} color={colors.gold} perHour={goldPerHour} />
        <ResourcePill icon="food-apple" label="FOOD" value={food} color={colors.food} perHour={foodPerHour} />
        <ResourcePill icon="axe" label="WOOD" value={wood} color={colors.wood} perHour={woodPerHour} />
        <ResourcePill icon="wall" label="STONE" value={stone} color={colors.stone} perHour={stonePerHour} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pillText: {
    flex: 1,
  },
  pillLabel: {
    fontSize: 8,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  pillValue: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 14,
  },
  pillRate: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
  },
});
