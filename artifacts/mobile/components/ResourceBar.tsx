import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
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
  /** When true, omits top safe-area padding (parent handles insets). */
  embedded?: boolean;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.floor(n).toString();
}

interface ResourceCellProps {
  icon: string;
  label: string;
  value: number;
  color: string;
  perHour?: number;
  showDivider: boolean;
}

function ResourceCell({ icon, label, value, color, perHour, showDivider }: ResourceCellProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.cell,
        showDivider && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },
      ]}
    >
      <View style={[styles.iconRing, { backgroundColor: color + "1a", borderColor: color + "55" }]}>
        <MaterialCommunityIcons name={icon as any} size={15} color={color} />
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: colors.foreground }]} numberOfLines={1}>
        {fmt(value)}
      </Text>
      <Text
        style={[styles.rate, { color: perHour && perHour > 0 ? color : colors.textSecondary + "88" }]}
        numberOfLines={1}
      >
        {perHour && perHour > 0 ? `+${fmt(perHour)}/h` : "—"}
      </Text>
    </View>
  );
}

export default function ResourceBar({
  gold,
  food,
  wood,
  stone,
  goldPerHour,
  foodPerHour,
  woodPerHour,
  stonePerHour,
  embedded = false,
}: ResourceBarProps) {
  const colors = useColors();

  const resources: Omit<ResourceCellProps, "showDivider">[] = [
    { icon: "gold", label: "Gold", value: gold, color: colors.gold, perHour: goldPerHour },
    { icon: "food-apple", label: "Food", value: food, color: colors.food, perHour: foodPerHour },
    { icon: "tree", label: "Wood", value: wood, color: colors.wood, perHour: woodPerHour },
    { icon: "cube-outline", label: "Stone", value: stone, color: colors.stone, perHour: stonePerHour },
  ];

  return (
    <View
      style={[
        styles.outer,
        embedded ? styles.outerEmbedded : null,
        {
          paddingTop: embedded ? 0 : 6,
          borderBottomColor: colors.border,
          borderBottomWidth: embedded ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: colors.border,
          },
        ]}
      >
        {resources.map((r, i) => (
          <ResourceCell key={r.label} {...r} showDivider={i < resources.length - 1} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  outerEmbedded: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  bar: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    minHeight: 72,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 2,
  },
  iconRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    lineHeight: 18,
  },
  rate: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    lineHeight: 12,
  },
});
