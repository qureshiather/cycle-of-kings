import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useGetTown, useGetTownArmy } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

function StatCard({
  icon,
  iconColor,
  label,
  value,
  sub,
  colors,
  withAlpha,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
  colors: ReturnType<typeof useColors>;
  withAlpha: (color: string, alpha: number) => string;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: withAlpha(colors.surface, 0.95),
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: withAlpha(iconColor, 0.14) }]}>
        <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={[styles.cardLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.cardValue, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.cardSub, { color: colors.textMuted }]} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
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
        ? "Starting up"
        : canGrow
          ? "Paused"
          : "Need food";

  return (
    <View style={styles.row}>
      <StatCard
        icon="account-group"
        iconColor={colors.foreground}
        label="Population"
        value={`${pop}${popCap > 0 ? ` / ${popCap}` : ""}`}
        sub={`Growth ${popGrowthLabel}${morale > 0 ? ` · Morale ${morale}` : ""}`}
        colors={colors}
        withAlpha={withAlpha}
      />
      <StatCard
        icon="food-apple"
        iconColor={colors.food}
        label="Food"
        value={`−${foodUpkeep}/h`}
        sub={`+${foodProd}/h · Net ${netFood >= 0 ? "+" : ""}${netFood}/h`}
        colors={colors}
        withAlpha={withAlpha}
      />
      <StatCard
        icon="shield"
        iconColor={colors.defense}
        label="Defense"
        value={`${totalDef}`}
        sub={`Walls ${walls} · Garrison ${garrison}${army?.totalTroops != null ? ` · ${army.totalTroops} troops` : ""}`}
        colors={colors}
        withAlpha={withAlpha}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 16, alignItems: "center", width: "100%" },
  row: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginBottom: 10,
  },
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  cardValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 9, fontFamily: "Inter_400Regular", lineHeight: 12 },
});
