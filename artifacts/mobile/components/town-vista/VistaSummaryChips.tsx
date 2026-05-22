import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SEASON_META, type Season } from "@/lib/seasonMeta";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  tierLabel: string;
  builtCount: number;
  totalSlots: number;
  actionableCount: number;
  upgradingCount: number;
  season: Season;
};

export default function VistaSummaryChips({
  tierLabel,
  builtCount,
  totalSlots,
  actionableCount,
  upgradingCount,
  season,
}: Props) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const seasonMeta = SEASON_META[season];
  const seasonColor = colors[season] as string;

  const chips: { icon: string; label: string; color: string }[] = [
    { icon: "castle", label: tierLabel, color: colors.gold },
    {
      icon: "home-group",
      label: `${builtCount}/${totalSlots} built`,
      color: colors.foreground,
    },
    {
      icon: seasonMeta.icon,
      label: seasonMeta.label,
      color: seasonColor,
    },
  ];

  if (actionableCount > 0) {
    chips.push({
      icon: "hammer-wrench",
      label: `${actionableCount} ready`,
      color: colors.gold,
    });
  }
  if (upgradingCount > 0) {
    chips.push({
      icon: "progress-clock",
      label: `${upgradingCount} building`,
      color: colors.warning,
    });
  }

  return (
    <View style={styles.row}>
      {chips.map((chip) => (
        <View
          key={chip.label}
          style={[
            styles.chip,
            {
              backgroundColor: withAlpha(chip.color, 0.1),
              borderColor: withAlpha(chip.color, 0.28),
            },
          ]}
        >
          <MaterialCommunityIcons name={chip.icon as any} size={11} color={chip.color} />
          <Text style={[styles.chipText, { color: chip.color }]}>{chip.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
    width: "100%",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
