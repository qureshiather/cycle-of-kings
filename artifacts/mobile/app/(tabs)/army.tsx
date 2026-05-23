import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTownArmy,
  useRecruitArmy,
  useGetTown,
  getGetTownArmyQueryKey,
  getGetTownQueryKey,
} from "@workspace/api-client-react";
import type { ColorPalette } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { useGame } from "@/context/GameContext";
import ScreenHeader from "@/components/ScreenHeader";
import { formatTimeRemaining } from "@/lib/buildingMeta";
import { scheduleTrainingComplete } from "@/lib/notifications";

const RECRUIT_COST = {
  infantry: { gold: 3, food: 2 },
  archers: { gold: 4, food: 2 },
  cavalry: { gold: 6, food: 3 },
} as const;

const unitMeta = (palette: ColorPalette) => ({
  infantry: {
    icon: "shield-sword",
    color: palette.slots.barracks,
    label: "Infantry",
    building: "Barracks",
    buildingIcon: "shield-sword",
    attackPower: 10,
    perLevel: 5,
  },
  archers: {
    icon: "bow-arrow",
    color: palette.slots.archeryRange,
    label: "Archers",
    building: "Archery Range",
    buildingIcon: "bow-arrow",
    attackPower: 15,
    perLevel: 5,
  },
  cavalry: {
    icon: "horse",
    color: palette.slots.stables,
    label: "Cavalry",
    building: "Stables",
    buildingIcon: "horse",
    attackPower: 12,
    perLevel: 3,
  },
});

type UnitType = keyof ReturnType<typeof unitMeta>;

function UnitRow({
  type,
  recruited,
  cap,
  onMission,
  attackMult,
  onRecruit,
  recruiting,
  canRecruit,
}: {
  type: UnitType;
  recruited: number;
  cap: number;
  onMission: number;
  attackMult: number;
  onRecruit: (count: number) => void;
  recruiting: boolean;
  canRecruit: boolean;
}) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const meta = unitMeta(colors)[type];
  const available = Math.max(0, recruited - onMission);
  const effectiveAttack = Math.round(meta.attackPower * attackMult * 10) / 10;
  const cost = RECRUIT_COST[type];
  const atCap = recruited >= cap;

  return (
    <View style={[styles.unitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.unitIcon, { backgroundColor: withAlpha(meta.color, 0.12) }]}>
        <MaterialCommunityIcons name={meta.icon as any} size={28} color={meta.color} />
      </View>
      <View style={styles.unitBody}>
        <View style={styles.unitHeader}>
          <Text style={[styles.unitName, { color: colors.foreground }]}>{meta.label}</Text>
          <Text style={[styles.capText, { color: colors.textSecondary }]}>
            {recruited}/{cap} · {meta.building}
          </Text>
        </View>
        <View style={styles.unitStats}>
          <Text style={[styles.stat, { color: colors.foreground }]}>ATK {effectiveAttack}</Text>
          <Text style={[styles.stat, { color: colors.gold }]}>Ready {available}</Text>
          {onMission > 0 && (
            <Text style={[styles.stat, { color: colors.raid }]}>Out {onMission}</Text>
          )}
        </View>
        {!atCap && cap > 0 && (
          <View style={styles.recruitRow}>
            <Pressable
              style={[
                styles.recruitBtn,
                {
                  borderColor: withAlpha(meta.color, 0.4),
                  backgroundColor: withAlpha(meta.color, 0.08),
                  opacity: canRecruit && !recruiting ? 1 : 0.45,
                },
              ]}
              disabled={!canRecruit || recruiting}
              onPress={() => onRecruit(1)}
            >
              <Text style={[styles.recruitBtnText, { color: meta.color }]}>+1</Text>
              <Text style={[styles.recruitCost, { color: colors.textMuted }]}>
                {cost.gold}G {cost.food}F
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.recruitBtn,
                {
                  borderColor: withAlpha(meta.color, 0.4),
                  backgroundColor: withAlpha(meta.color, 0.08),
                  opacity: canRecruit && !recruiting ? 1 : 0.45,
                },
              ]}
              disabled={!canRecruit || recruiting}
              onPress={() => onRecruit(5)}
            >
              <Text style={[styles.recruitBtnText, { color: meta.color }]}>+5</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ArmyScreen() {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const { townId } = useGame();
  const qc = useQueryClient();
  const { data: army, isLoading, refetch } = useGetTownArmy(townId ?? 0, {
    query: { enabled: !!townId, refetchInterval: 15_000 } as any,
  });
  const { data: town } = useGetTown(townId ?? 0, { query: { enabled: !!townId } as any });
  const recruitArmy = useRecruitArmy();

  const trainingMs = army?.trainingEndsAt
    ? Math.max(0, new Date(army.trainingEndsAt).getTime() - Date.now())
    : 0;
  const isTraining = trainingMs > 0;

  const totalTroops = army?.totalTroops ?? 0;
  const totalOnMission =
    (army?.onMissionInfantry ?? 0) + (army?.onMissionArchers ?? 0) + (army?.onMissionCavalry ?? 0);
  const totalPower = army?.totalPower ?? 0;

  const handleRecruit = (unit: UnitType, count: number) => {
    if (!townId) return;
    recruitArmy.mutate(
      { townId, data: { unit, count } },
      {
        onSuccess: (data) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (data.trainingEndsAt && data.trainingUnit) {
            const label = unitMeta(colors)[data.trainingUnit as UnitType]?.label ?? "Troops";
            void scheduleTrainingComplete(townId, label, data.trainingEndsAt);
          }
          qc.invalidateQueries({ queryKey: getGetTownArmyQueryKey(townId) });
          qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
        },
        onError: (e: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Recruitment failed", e?.data?.error ?? e?.message ?? "Could not recruit");
        },
      },
    );
  };

  const canAffordRecruit = (unit: UnitType, count: number) => {
    const c = RECRUIT_COST[unit];
    return (
      (town?.gold ?? 0) >= c.gold * count &&
      (town?.food ?? 0) >= c.food * count
    );
  };

  const trainingBusy = isTraining || recruitArmy.isPending;

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
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>OUT</Text>
              <Text style={[styles.summaryValue, { color: totalOnMission > 0 ? colors.raid : colors.textSecondary }]}>
                {totalOnMission}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>POWER</Text>
              <Text style={[styles.summaryValue, { color: colors.gold }]}>{totalPower}</Text>
            </View>
          </View>

          {isTraining && (
            <View style={[styles.trainingBanner, { backgroundColor: withAlpha(colors.gold, 0.1), borderColor: withAlpha(colors.gold, 0.35) }]}>
              <MaterialCommunityIcons name="account-clock" size={18} color={colors.gold} />
              <Text style={[styles.trainingText, { color: colors.foreground }]}>
                Training {army?.trainingCount ?? 0}{" "}
                {army?.trainingUnit ?? "troops"} — {formatTimeRemaining(trainingMs)}
              </Text>
            </View>
          )}

          <View style={[styles.infoCard, { backgroundColor: colors.surfaceElevated + "aa", borderColor: colors.border }]}>
            <MaterialCommunityIcons name="information-outline" size={14} color={colors.gold} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Military buildings set your troop caps. Recruit with gold and food to fill them — losses on missions and raids
              must be replaced. Food comes from farms, market imports, tavern kitchens, shipyard fishing, World trade, and
              mission spoils.
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECRUIT</Text>

          {(["infantry", "archers", "cavalry"] as UnitType[]).map((type) => {
            const capKey = `cap${type.charAt(0).toUpperCase() + type.slice(1)}` as "capInfantry" | "capArchers" | "capCavalry";
            const cap = (army as any)?.[capKey] ?? 0;
            if (cap === 0) return null;
            const onMissionKey =
              type === "infantry"
                ? "onMissionInfantry"
                : type === "archers"
                  ? "onMissionArchers"
                  : "onMissionCavalry";
            const multKey =
              type === "infantry"
                ? "infantryAttackMult"
                : type === "archers"
                  ? "archerAttackMult"
                  : "cavalryAttackMult";
            return (
              <UnitRow
                key={type}
                type={type}
                recruited={(army as any)?.[type] ?? 0}
                cap={cap}
                onMission={(army as any)?.[onMissionKey] ?? 0}
                attackMult={(army as any)?.[multKey] ?? 1}
                onRecruit={(n) => handleRecruit(type, n)}
                recruiting={trainingBusy}
                canRecruit={!trainingBusy && canAffordRecruit(type, 1)}
              />
            );
          })}

          {(army?.capInfantry ?? 0) === 0 &&
            (army?.capArchers ?? 0) === 0 &&
            (army?.capCavalry ?? 0) === 0 && (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="castle" size={36} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No barracks yet</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  Build Barracks, Archery Range, or Stables in your Kingdom to unlock recruitment.
                </Text>
              </View>
            )}
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
  trainingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  trainingText: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 10, borderRadius: 8, borderWidth: 1 },
  infoText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  emptyCard: { alignItems: "center", padding: 32, borderRadius: 10, borderWidth: 1, gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  unitCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  unitIcon: { width: 52, height: 52, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  unitBody: { flex: 1, gap: 6 },
  unitHeader: { gap: 2 },
  unitName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  capText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  unitStats: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  stat: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  recruitRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  recruitBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: "center", minWidth: 56 },
  recruitBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  recruitCost: { fontSize: 9, fontFamily: "Inter_400Regular", marginTop: 2 },
});
