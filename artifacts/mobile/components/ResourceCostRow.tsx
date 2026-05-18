import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ResourceAmounts } from "@/lib/buildingMeta";
import {
  floorResource,
  formatResourceAmount,
  getNonZeroCosts,
  RESOURCE_META,
  type ResourceKey,
} from "@/lib/resourceMeta";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

type ResourceCostRowProps = {
  cost: ResourceAmounts;
  owned?: ResourceAmounts;
  /** Muted styling for refund / secondary lines; reward adds + prefix for loot */
  variant?: "default" | "refund" | "reward";
  compact?: boolean;
};

export default function ResourceCostRow({
  cost,
  owned,
  variant = "default",
  compact = false,
}: ResourceCostRowProps) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const items = getNonZeroCosts(cost);

  if (items.length === 0) {
    return (
      <Text style={[styles.free, { color: colors.success }]}>Free</Text>
    );
  }

  return (
    <View style={styles.row}>
      {items.map(({ key, amount }) => {
        const meta = RESOURCE_META[key];
        const resColor = colors[meta.colorKey] as string;
        const ownedAmount = owned ? floorResource(owned[key as ResourceKey]) : null;
        const canPay = ownedAmount !== null ? ownedAmount >= amount : true;
        const chipColor =
          variant === "refund"
            ? colors.textSecondary
            : variant === "reward" || canPay
              ? resColor
              : colors.destructive;
        const showOwnedOverCost = owned && variant === "default";

        return (
          <View
            key={key}
            style={[
              styles.chip,
              compact && styles.chipCompact,
              {
                backgroundColor:
                  variant === "refund"
                    ? colors.background
                    : withAlpha(chipColor, variant === "reward" || canPay ? 0.12 : 0.1),
                borderColor:
                  variant === "refund"
                    ? colors.border
                    : withAlpha(chipColor, variant === "reward" || canPay ? 0.35 : 0.45),
              },
            ]}
          >
            <MaterialCommunityIcons
              name={meta.icon as any}
              size={compact ? 12 : 14}
              color={chipColor}
            />
            {showOwnedOverCost ? (
              <>
                <Text style={[compact ? styles.amountCompact : styles.amount, { color: chipColor }]}>
                  {formatResourceAmount(ownedAmount!)}
                </Text>
                <Text style={[styles.required, { color: colors.textMuted }]}>
                  /{formatResourceAmount(amount)}
                </Text>
              </>
            ) : (
              <Text style={[compact ? styles.amountCompact : styles.amount, { color: chipColor }]}>
                {variant === "reward" ? "+" : ""}
                {formatResourceAmount(amount)}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipCompact: { paddingHorizontal: 6, paddingVertical: 3, gap: 3 },
  amount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  amountCompact: { fontSize: 11, fontFamily: "Inter_700Bold" },
  required: { fontSize: 10, fontFamily: "Inter_400Regular" },
  free: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
