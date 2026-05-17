import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useGetTown, useGetGameState, useGetTownGrid } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useGame } from "@/context/GameContext";
import SeasonBadge from "@/components/SeasonBadge";

type Season = "spring" | "summer" | "autumn" | "winter";

const SEASON_TIPS: Record<Season, string> = {
  spring: "Food and Wood production is boosted. Great time to expand your farms and quarries.",
  summer: "Gold income peaks this season. Invest in mines and markets.",
  autumn: "Stock up on wood before winter. Quarries are most efficient now.",
  winter: "Production suffers. Maintain your stockpiles and avoid costly expansions.",
};

const MODIFIER_LABELS = [
  { key: "gold",  icon: "gold",       label: "Gold",  color: "#d4a520" },
  { key: "food",  icon: "food-apple", label: "Food",  color: "#3d7a35" },
  { key: "wood",  icon: "tree",       label: "Wood",  color: "#7a4e20" },
  { key: "stone", icon: "cube-outline",label: "Stone", color: "#7a7a6a" },
];

const BUILDING_PRODUCTION: Record<string, { icon: string; label: string; production: string; color: string }> = {
  farm:    { icon: "corn",        label: "Farm",    production: "+5 Food/hr per level",         color: "#3d7a35" },
  mine:    { icon: "pickaxe",     label: "Mine",    production: "+3 Gold/hr per level",         color: "#c4a820" },
  quarry:  { icon: "hammer",      label: "Quarry",  production: "+4 Wood, +2 Stone/hr per level", color: "#7a7a6a" },
  market:  { icon: "store",       label: "Market",  production: "+2 Gold/hr per level",         color: "#7a4a9a" },
  barracks:{ icon: "sword-cross", label: "Barracks",production: "+20 army capacity per level",  color: "#8a3030" },
  house:   { icon: "home",        label: "House",   production: "+10 population cap per level", color: "#2a5a8a" },
};

function timeUntil(dateStr: string): string {
  const ms = new Date(dateStr).getTime() - Date.now();
  if (ms <= 0) return "Now";
  const days = Math.floor(ms / 86400000);
  const hrs  = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hrs}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export default function TreasuryScreen() {
  const colors = useColors();
  const { townId } = useGame();

  const { data: town, isLoading: townLoading, refetch } = useGetTown(townId ?? 0, { query: { enabled: !!townId } });
  const { data: gameState, isLoading: gsLoading } = useGetGameState({ query: { staleTime: 300_000 } });
  const { data: grid } = useGetTownGrid(townId ?? 0, { query: { enabled: !!townId } });

  const buildingCounts: Record<string, number> = {};
  for (const cell of grid ?? []) {
    if (cell.buildingType !== "empty") {
      buildingCounts[cell.buildingType] = (buildingCounts[cell.buildingType] ?? 0) + 1;
    }
  }

  if (townLoading || gsLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  const season = gameState?.season as Season ?? "spring";
  const mods = gameState?.seasonModifiers ?? { gold: 1, food: 1, wood: 1, stone: 1 };
  const weather = gameState?.weatherEvent;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <MaterialCommunityIcons name="chart-bar" size={20} color={colors.gold} />
        <Text style={[styles.topTitle, { color: colors.foreground }]}>Treasury</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.gold} />}
      >
        <View style={[styles.seasonCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={styles.seasonHeader}>
            <SeasonBadge season={season} cycleNumber={gameState?.cycleNumber} />
            {weather && (
              <View style={[styles.weatherBadge, { backgroundColor: colors.risky + "22", borderColor: colors.risky + "44" }]}>
                <MaterialCommunityIcons name="weather-lightning" size={12} color={colors.risky} />
                <Text style={[styles.weatherText, { color: colors.risky }]}>{weather}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.seasonTip, { color: colors.textSecondary }]}>{SEASON_TIPS[season]}</Text>
          <View style={styles.timerRow}>
            <MaterialCommunityIcons name="timer-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.timerText, { color: colors.textSecondary }]}>
              Next wipe in {timeUntil(gameState?.nextWipeAt ?? "")}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SEASON MODIFIERS</Text>
        <View style={styles.modGrid}>
          {MODIFIER_LABELS.map(({ key, icon, label, color }) => {
            const mod = (mods as any)[key] ?? 1;
            const pct = Math.round((mod - 1) * 100);
            return (
              <View key={key} style={[styles.modCard, { backgroundColor: colors.surface, borderColor: mod >= 1 ? color + "44" : colors.destructive + "44" }]}>
                <MaterialCommunityIcons name={icon as any} size={20} color={color} />
                <Text style={[styles.modLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.modValue, { color: mod >= 1 ? colors.food : colors.destructive }]}>
                  {pct >= 0 ? "+" : ""}{pct}%
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PRODUCTION RATES</Text>
        <View style={[styles.prodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { icon: "gold",        label: "Gold / hour",  value: town?.goldPerHour ?? 0,  color: colors.gold },
            { icon: "food-apple",  label: "Food / hour",  value: town?.foodPerHour ?? 0,  color: colors.food },
            { icon: "tree",        label: "Wood / hour",  value: town?.woodPerHour ?? 0,  color: colors.wood },
            { icon: "cube-outline",label: "Stone / hour", value: town?.stonePerHour ?? 0, color: colors.stone },
          ].map(({ icon, label, value, color }) => (
            <View key={label} style={styles.prodRow}>
              <MaterialCommunityIcons name={icon as any} size={16} color={color} />
              <Text style={[styles.prodLabel, { color: colors.textSecondary }]}>{label}</Text>
              <Text style={[styles.prodValue, { color: colors.foreground }]}>+{value.toFixed(1)}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>YOUR BUILDINGS</Text>
        {Object.entries(buildingCounts).length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="home-city-outline" size={36} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No buildings yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>Head to Kingdom to start building</Text>
          </View>
        ) : (
          Object.entries(buildingCounts).map(([type, count]) => {
            const meta = BUILDING_PRODUCTION[type];
            if (!meta) return null;
            return (
              <View key={type} style={[styles.buildingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialCommunityIcons name={meta.icon as any} size={20} color={meta.color} />
                <View style={styles.buildingInfo}>
                  <Text style={[styles.buildingLabel, { color: colors.foreground }]}>{meta.label} ×{count}</Text>
                  <Text style={[styles.buildingProd, { color: colors.textSecondary }]}>{meta.production}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={[styles.resourceCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Text style={[styles.resourceTitle, { color: colors.textSecondary }]}>CURRENT STOCKPILE</Text>
          {[
            { icon: "gold",        label: "Gold",  value: town?.gold ?? 0,  color: colors.gold },
            { icon: "food-apple",  label: "Food",  value: town?.food ?? 0,  color: colors.food },
            { icon: "tree",        label: "Wood",  value: town?.wood ?? 0,  color: colors.wood },
            { icon: "cube-outline",label: "Stone", value: town?.stone ?? 0, color: colors.stone },
          ].map(({ icon, label, value, color }) => (
            <View key={label} style={styles.prodRow}>
              <MaterialCommunityIcons name={icon as any} size={16} color={color} />
              <Text style={[styles.prodLabel, { color: colors.textSecondary }]}>{label}</Text>
              <Text style={[styles.prodValue, { color: colors.foreground }]}>{Math.floor(value).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, borderBottomWidth: 1 },
  topTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scrollContent: { padding: 12, paddingBottom: 100, gap: 10 },
  seasonCard: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  seasonHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  weatherBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  weatherText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  seasonTip: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timerText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginTop: 6 },
  modGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modCard: { flex: 1, minWidth: "22%", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1, gap: 4 },
  modLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  modValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  prodCard: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  prodRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  prodLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  prodValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  buildingRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  buildingInfo: { flex: 1 },
  buildingLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  buildingProd: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingVertical: 30, gap: 6 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  resourceCard: { padding: 4, borderRadius: 12, borderWidth: 1 },
  resourceTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
});
