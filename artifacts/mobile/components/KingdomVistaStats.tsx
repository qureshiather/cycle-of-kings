import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useGetTown, useGetTownArmy } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

function StatRow({
  icon,
  iconColor,
  label,
  value,
  sub,
  colors,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + "18" }]}>
        <MaterialCommunityIcons name={icon as any} size={16} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.foreground }]}>{value}</Text>
        {sub ? (
          <Text style={[styles.rowSub, { color: colors.textMuted }]}>{sub}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function KingdomVistaStats({ townId }: { townId: number }) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const { data: town, isLoading } = useGetTown(townId, {
    query: { enabled: !!townId, refetchInterval: 30_000 } as any,
  });
  const { data: army } = useGetTownArmy(townId, { query: { enabled: !!townId } as any });

  if (isLoading && !town) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} size="small" />
      </View>
    );
  }

  if (!town) return null;

  const pop = Math.round(town.population ?? 0);
  const popCap = Math.round(town.populationCap ?? 0);
  const popGrowth = Math.round((town.populationPerHour ?? 0) * 10) / 10;
  const foodUpkeep = Math.round((town.foodUpkeepPerHour ?? 0) * 10) / 10;
  const foodProd = Math.round((town.foodPerHour ?? 0) * 10) / 10;
  const netFood = Math.round((town.netFoodPerHour ?? foodProd - foodUpkeep) * 10) / 10;
  const walls = Math.round(town.staticDefense ?? 0);
  const totalDef = Math.round(town.totalDefense ?? 0);
  const garrison = Math.max(0, totalDef - walls);
  const morale = Math.round(town.morale ?? 0);

  const canGrow = (town as { populationGrowing?: boolean }).populationGrowing ?? netFood > 0;
  const popGrowthLabel =
    popGrowth > 0
      ? `+${popGrowth}/h`
      : pop === 0 && popCap > 0
        ? "Starting up — refresh after a moment"
        : canGrow
          ? "Paused (check back soon)"
          : "Starving — need positive net food";

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: withAlpha(colors.surface, 0.95),
          borderColor: colors.border,
        },
      ]}
    >
      <StatRow
        icon="account-group"
        iconColor={colors.foreground}
        label="Population"
        value={`${pop}${popCap > 0 ? ` / ${popCap}` : ""}`}
        sub={`Growth ${popGrowthLabel}${morale > 0 ? ` · Morale ${morale}` : ""}`}
        colors={colors}
      />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <StatRow
        icon="food-apple"
        iconColor={colors.food}
        label="Food"
        value={`−${foodUpkeep}/h consumed`}
        sub={`Production +${foodProd}/h · Net ${netFood >= 0 ? "+" : ""}${netFood}/h`}
        colors={colors}
      />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <StatRow
        icon="shield"
        iconColor={colors.defense}
        label="Defense"
        value={`${totalDef} total`}
        sub={`Walls & towers ${walls} · Garrison ${garrison}${army?.totalTroops != null ? ` (${army.totalTroops} troops)` : ""}`}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 16, alignItems: "center" },
  panel: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    marginBottom: 10,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4 },
  rowValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rowSub: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  divider: { height: 1, width: "100%" },
});
