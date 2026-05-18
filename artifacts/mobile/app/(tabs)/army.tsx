import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useGetTownArmy, getGetTownArmyQueryKey } from "@workspace/api-client-react";
import type { ColorPalette } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useGame } from "@/context/GameContext";
import ScreenHeader from "@/components/ScreenHeader";

const unitMeta = (palette: ColorPalette) => ({
  infantry: {
    icon: "shield-sword",
    color: palette.slots.barracks,
    label: "Infantry",
    building: "Barracks",
    buildingIcon: "shield-sword",
    desc: "Heavy frontline soldiers. Shield archers, boosting their attack by 20%.",
    attackPower: 10,
    defense: 15,
    perLevel: 5,
  },
  archers: {
    icon: "bow-arrow",
    color: palette.slots.archeryRange,
    label: "Archers",
    building: "Archery Range",
    buildingIcon: "bow-arrow",
    desc: "Ranged damage dealers. +20% power when shielded by infantry.",
    attackPower: 15,
    defense: 5,
    perLevel: 5,
  },
  cavalry: {
    icon: "horse",
    color: palette.slots.stables,
    label: "Cavalry",
    building: "Stables",
    buildingIcon: "horse",
    desc: "Fast mounted strikers. +10% attack initiative bonus.",
    attackPower: 12,
    defense: 8,
    perLevel: 3,
  },
});

type UnitType = keyof ReturnType<typeof unitMeta>;

function UnitRow({ type, total, onMission, attackMult }: {
  type: UnitType;
  total: number;
  onMission: number;
  attackMult: number;
}) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const meta = unitMeta(colors)[type];
  const available = Math.max(0, total - onMission);
  const effectiveAttack = Math.round(meta.attackPower * attackMult * 10) / 10;

  return (
    <View style={[styles.unitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.unitIcon, { backgroundColor: withAlpha(meta.color, 0.12) }]}>
        <MaterialCommunityIcons name={meta.icon as any} size={28} color={meta.color} />
      </View>
      <View style={styles.unitBody}>
        <View style={styles.unitHeader}>
          <Text style={[styles.unitName, { color: colors.foreground }]}>{meta.label}</Text>
          <View style={[styles.unitSource, { backgroundColor: colors.surfaceElevated }]}>
            <MaterialCommunityIcons name={meta.buildingIcon as any} size={10} color={colors.textSecondary} />
            <Text style={[styles.unitSourceText, { color: colors.textSecondary }]}>
              {meta.building} · +{meta.perLevel}/level
            </Text>
          </View>
        </View>
        <Text style={[styles.unitDesc, { color: colors.textSecondary }]}>{meta.desc}</Text>
        <View style={styles.unitStats}>
          <Text style={[styles.stat, { color: colors.foreground }]}>
            ATK <Text style={{ color: attackMult > 1 ? colors.success : colors.foreground }}>{effectiveAttack}</Text>
          </Text>
          <Text style={[styles.stat, { color: colors.foreground }]}>DEF {meta.defense}</Text>
          {attackMult > 1 && (
            <Text style={[styles.statBonus, { color: colors.success }]}>
              +{Math.round((attackMult - 1) * 100)}% upgrades
            </Text>
          )}
        </View>
      </View>
      <View style={styles.unitCounts}>
        <Text style={[styles.unitTotal, { color: colors.foreground }]}>{total}</Text>
        <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>TOTAL</Text>
        {onMission > 0 && (
          <>
            <Text style={[styles.unitOnMission, { color: colors.raid }]}>{onMission}</Text>
            <Text style={[styles.unitLabel, { color: colors.raid }]}>OUT</Text>
          </>
        )}
        {available !== total && (
          <>
            <Text style={[styles.unitAvailable, { color: colors.gold }]}>{available}</Text>
            <Text style={[styles.unitLabel, { color: colors.textSecondary }]}>READY</Text>
          </>
        )}
      </View>
    </View>
  );
}

export default function ArmyScreen() {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const { townId } = useGame();
  const { data: army, isLoading, refetch } = useGetTownArmy(townId ?? 0, { query: { enabled: !!townId } as any });

  const totalTroops = army?.totalTroops ?? 0;
  const totalOnMission = (army?.onMissionInfantry ?? 0) + (army?.onMissionArchers ?? 0) + (army?.onMissionCavalry ?? 0);
  const totalPower = army?.totalPower ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader icon="sword-cross" title="Command Center" />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.gold} />}
        >
          <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>TROOPS</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{totalTroops}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>ON MISSION</Text>
              <Text style={[styles.summaryValue, { color: totalOnMission > 0 ? colors.raid : colors.textSecondary }]}>{totalOnMission}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>POWER</Text>
              <Text style={[styles.summaryValue, { color: colors.gold }]}>{totalPower}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>CAPACITY</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{army?.capacity ?? 10}</Text>
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.surfaceElevated + "aa", borderColor: colors.border }]}>
            <MaterialCommunityIcons name="information-outline" size={14} color={colors.gold} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Units are generated automatically by military buildings. Upgrade buildings to make your troops stronger.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>YOUR FORCES</Text>

          {totalTroops === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="castle" size={36} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No troops yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                Build a Barracks, Archery Range, or Stables in your Kingdom to raise an army.
              </Text>
            </View>
          ) : (
            (["infantry", "archers", "cavalry"] as UnitType[]).map(type => {
              const total = (army as any)?.[type] ?? 0;
              if (total === 0) return null;
              return (
                <UnitRow
                  key={type}
                  type={type}
                  total={total}
                  onMission={(army as any)?.[`onMission${type.charAt(0).toUpperCase() + type.slice(1)}`] ?? 0}
                  attackMult={(army as any)?.[`${type === "infantry" ? "infantry" : type === "archers" ? "archer" : "cavalry"}AttackMult`] ?? 1}
                />
              );
            })
          )}

          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 8 }]}>BUILDING GUIDE</Text>
          {[
            { building: "Barracks",      icon: "shield-sword", color: colors.slots.barracks, unit: "Infantry", formula: "5 troops per level" },
            { building: "Archery Range", icon: "bow-arrow",    color: colors.slots.archeryRange, unit: "Archers",  formula: "5 troops per level" },
            { building: "Stables",       icon: "horse",        color: colors.slots.stables, unit: "Cavalry",  formula: "3 troops per level" },
            { building: "House",         icon: "home",         color: colors.slots.house, unit: "Capacity", formula: "+10 capacity per level" },
          ].map(({ building, icon, color, unit, formula }) => (
            <View key={building} style={[styles.guideRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.guideIcon, { backgroundColor: withAlpha(color, 0.12) }]}>
                <MaterialCommunityIcons name={icon as any} size={18} color={color} />
              </View>
              <View style={styles.guideText}>
                <Text style={[styles.guideName, { color: colors.foreground }]}>{building}</Text>
                <Text style={[styles.guideFormula, { color: colors.textSecondary }]}>→ {unit} · {formula}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 12, paddingBottom: 100, gap: 10 },
  summaryCard: { flexDirection: "row", borderRadius: 10, borderWidth: 1, padding: 14 },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  summaryValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  summaryDivider: { width: 1, marginHorizontal: 4 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  infoText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  emptyCard: { alignItems: "center", padding: 32, borderRadius: 10, borderWidth: 1, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  unitCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  unitIcon: { width: 52, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  unitBody: { flex: 1, gap: 4 },
  unitHeader: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  unitName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  unitSource: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  unitSourceText: { fontSize: 9, fontFamily: "Inter_400Regular" },
  unitDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  unitStats: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  stat: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  statBonus: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  unitCounts: { alignItems: "center", gap: 1 },
  unitTotal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  unitOnMission: { fontSize: 14, fontFamily: "Inter_700Bold" },
  unitAvailable: { fontSize: 14, fontFamily: "Inter_700Bold" },
  unitLabel: { fontSize: 8, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  guideRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 8, borderWidth: 1 },
  guideIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  guideText: { flex: 1 },
  guideName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  guideFormula: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
