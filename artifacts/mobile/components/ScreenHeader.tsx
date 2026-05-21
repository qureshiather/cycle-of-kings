import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useTopInset } from "@/hooks/useTopInset";
import ResourceBar from "@/components/ResourceBar";
import { formatResourceAmount } from "@/lib/resourceMeta";

export type ScreenHeaderTown = {
  gold: number;
  food: number;
  wood: number;
  stone: number;
  goldPerHour?: number;
  foodNetPerHour?: number;
  woodPerHour?: number;
  stonePerHour?: number;
};

type ScreenHeaderProps = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  /** Right side of the title row (e.g. season badge). */
  trailing?: React.ReactNode;
  /** Muted line under the title row. */
  subtitle?: string;
  /** Compact gold balance in the title row (missions, etc.). */
  gold?: number;
  /** Full embedded resource bar (Kingdom). */
  town?: ScreenHeaderTown;
  children?: React.ReactNode;
};

export default function ScreenHeader({
  icon,
  title,
  trailing,
  subtitle,
  gold,
  town,
  children,
}: ScreenHeaderProps) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const topInset = useTopInset(6);

  return (
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
        <MaterialCommunityIcons name={icon} size={18} color={colors.gold} />
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        {gold != null && (
          <View style={[styles.goldPill, { backgroundColor: withAlpha(colors.gold, 0.1), borderColor: withAlpha(colors.gold, 0.28) }]}>
            <MaterialCommunityIcons name="gold" size={14} color={colors.gold} />
            <Text style={[styles.goldValue, { color: colors.gold }]}>{formatResourceAmount(gold)}</Text>
          </View>
        )}
        {trailing}
      </View>

      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      ) : null}

      {town ? (
        <ResourceBar
          embedded
          gold={town.gold}
          food={town.food}
          wood={town.wood}
          stone={town.stone}
          goldPerHour={town.goldPerHour}
          foodNetPerHour={town.foodNetPerHour}
          woodPerHour={town.woodPerHour}
          stonePerHour={town.stonePerHour}
        />
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
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
  title: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: -2,
  },
  goldPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  goldValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
