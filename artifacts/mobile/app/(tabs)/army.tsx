import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
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
import ResourceCostRow from "@/components/ResourceCostRow";
import { formatTimeRemaining } from "@/lib/buildingMeta";
import {
  formatUpkeepPerHour,
  recruitCost,
  totalTroopCap,
  TROOP_FOOD_UPKEEP_PER_HOUR,
  type ArmyUnitType,
} from "@/lib/armyMeta";
import { scheduleTrainingComplete } from "@/lib/notifications";
import { canAffordCost, formatResourceRate, normalizeResources } from "@/lib/resourceMeta";

const unitMeta = (palette: ColorPalette) => ({
  infantry: {
    icon: "shield-sword",
    color: palette.slots.barracks,
    label: "Infantry",
    building: "Barracks",
    attackPower: 10,
  },
  archers: {
    icon: "bow-arrow",
    color: palette.slots.archeryRange,
    label: "Archers",
    building: "Archery Range",
    attackPower: 15,
  },
  cavalry: {
    icon: "horse",
    color: palette.slots.stables,
    label: "Cavalry",
    building: "Stables",
    attackPower: 12,
  },
});

function UnitRow({
  type,
  recruited,
  cap,
  onMission,
  attackMult,
  onRecruit,
  recruiting,
  canRecruit,
  owned,
}: {
  type: ArmyUnitType;
  recruited: number;
  cap: number;
  onMission: number;
  attackMult: number;
  onRecruit: (count: number) => void;
  recruiting: boolean;
  canRecruit: boolean;
  owned: ReturnType<typeof normalizeResources>;
}) {
  const colors = useColors();
  const { withAlpha } = useTheme();
  const meta = unitMeta(colors)[type];
  const available = Math.max(0, recruited - onMission);
  const effectiveAttack = Math.round(meta.attackPower * attackMult * 10) / 10;
  const atCap = recruited >= cap;
  const room = Math.max(0, cap - recruited);
  const cost1 = recruitCost(type, 1);
  const cost5 = recruitCost(type, Math.min(5, room));

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
          <View style={styles.recruitBlock}>
            <Text style={[styles.recruitLabel, { color: colors.textMuted }]}>Recruit cost (per troop)</Text>
            <ResourceCostRow cost={cost1} owned={owned} compact />
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
              </Pressable>
              {room >= 2 && (
                <Pressable
                  style={[
                    styles.recruitBtn,
                    {
                      borderColor: withAlpha(meta.color, 0.4),
                      backgroundColor: withAlpha(meta.color, 0.08),
                      opacity:
                        canRecruit && !recruiting && canAffordCost(cost5, owned) ? 1 : 0.45,
                    },
                  ]}
                  disabled={!canRecruit || recruiting || !canAffordCost(cost5, owned)}
                  onPress={() => onRecruit(Math.min(5, room))}
                >
                  <Text style={[styles.recruitBtnText, { color: meta.color }]}>
                    +{Math.min(5, room)}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function FoodLedgerRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "prod" | "cost" | "net";
}) {
  const colors = useColors();
  const valueColor =
    tone === "prod" ? colors.food : tone === "cost" ? colors.destructive : colors.foreground;
  return (
    <View style={styles.ledgerRow}>
      <Text style={[styles.ledgerLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.ledgerValue, { color: valueColor }]}>{value}</Text>
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

  const totalCap = army ? totalTroopCap(army) : 0;
  const totalTroops = army?.totalTroops ?? 0;
  const totalOnMission =
    (army?.onMissionInfantry ?? 0) + (army?.onMissionArchers ?? 0) + (army?.onMissionCavalry ?? 0);
  const totalReady = Math.max(0, totalTroops - totalOnMission);
  const totalPower = army?.totalPower ?? 0;
  const troopUpkeep =
    army?.troopFoodUpkeepPerHour ??
    totalTroops * TROOP_FOOD_UPKEEP_PER_HOUR;
  const popUpkeep = town?.foodUpkeepPerHour ?? 0;
  const foodProd = town?.foodPerHour ?? 0;
  const netFood =
    town?.netFoodPerHour ?? foodProd - popUpkeep - troopUpkeep;
  const capPct = totalCap > 0 ? Math.min(1, totalTroops / totalCap) : 0;

  const owned = normalizeResources({
    gold: town?.gold ?? 0,
    food: town?.food ?? 0,
    wood: town?.wood ?? 0,
    stone: town?.stone ?? 0,
  });

  const handleRecruit = (unit: ArmyUnitType, count: number) => {
    if (!townId) return;
    recruitArmy.mutate(
      { townId, data: { unit, count } },
      {
        onSuccess: (data) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (data.trainingEndsAt && data.trainingUnit) {
            const label = unitMeta(colors)[data.trainingUnit as ArmyUnitType]?.label ?? "Troops";
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

  const canAffordRecruit = (unit: ArmyUnitType, count: number) =>
    canAffordCost(recruitCost(unit, count), owned);

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
          <View style={[styles.capacityCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.capacityTop}>
              <View style={styles.capacityMain}>
                <Text style={[styles.capacityLabel, { color: colors.textSecondary }]}>ARMY CAPACITY</Text>
                <Text style={[styles.capacityValue, { color: colors.foreground }]}>
                  {totalTroops}
                  <Text style={[styles.capacityDenom, { color: colors.textSecondary }]}> / {totalCap}</Text>
                </Text>
                <Text style={[styles.capacitySub, { color: colors.textMuted }]}>
                  {totalReady} ready · {totalOnMission} on mission · {totalPower} power
                </Text>
              </View>
              <View style={[styles.powerBadge, { backgroundColor: withAlpha(colors.gold, 0.12), borderColor: withAlpha(colors.gold, 0.35) }]}>
                <MaterialCommunityIcons name="sword-cross" size={16} color={colors.gold} />
                <Text style={[styles.powerBadgeText, { color: colors.gold }]}>{totalPower}</Text>
              </View>
            </View>
            {totalCap > 0 && (
              <View style={[styles.capBarTrack, { backgroundColor: withAlpha(colors.military, 0.15) }]}>
                <View
                  style={[
                    styles.capBarFill,
                    {
                      width: `${capPct * 100}%`,
                      backgroundColor: colors.military,
                    },
                  ]}
                />
              </View>
            )}
          </View>

          <View style={[styles.foodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.foodCardHeader}>
              <MaterialCommunityIcons name="food-apple" size={16} color={colors.food} />
              <Text style={[styles.foodCardTitle, { color: colors.foreground }]}>Food & upkeep</Text>
            </View>
            <FoodLedgerRow
              label="Production"
              value={`+${formatUpkeepPerHour(foodProd)}/h`}
              tone="prod"
            />
            <FoodLedgerRow
              label={`Troops (${totalTroops} × ${TROOP_FOOD_UPKEEP_PER_HOUR})`}
              value={`−${formatUpkeepPerHour(troopUpkeep)}/h`}
              tone="cost"
            />
            <FoodLedgerRow
              label={`Population (${Math.round(town?.population ?? 0)} × 0.4)`}
              value={`−${formatUpkeepPerHour(popUpkeep)}/h`}
              tone="cost"
            />
            <View style={[styles.ledgerDivider, { backgroundColor: colors.border }]} />
            <FoodLedgerRow
              label="Net food"
              value={`${netFood >= 0 ? "+" : ""}${formatResourceRate(netFood)}/h`}
              tone="net"
            />
            <Text style={[styles.foodHint, { color: colors.textMuted }]}>
              Recruiting also spends food upfront (see unit costs below). Upgrade Barracks, Archery, and Stables to raise
              capacity.
            </Text>
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

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECRUIT</Text>

          {(["infantry", "archers", "cavalry"] as ArmyUnitType[]).map((type) => {
            const capKey = `cap${type.charAt(0).toUpperCase() + type.slice(1)}` as "capInfantry" | "capArchers" | "capCavalry";
            const cap = army?.[capKey] ?? 0;
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
                recruited={army?.[type] ?? 0}
                cap={cap}
                onMission={army?.[onMissionKey] ?? 0}
                attackMult={army?.[multKey] ?? 1}
                onRecruit={(n) => handleRecruit(type, n)}
                recruiting={trainingBusy}
                canRecruit={!trainingBusy && canAffordRecruit(type, 1)}
                owned={owned}
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
  capacityCard: { borderRadius: 10, borderWidth: 1, padding: 14, gap: 10 },
  capacityTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  capacityMain: { flex: 1, gap: 4 },
  capacityLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 },
  capacityValue: { fontSize: 26, fontFamily: "Inter_700Bold" },
  capacityDenom: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  capacitySub: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  powerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  powerBadgeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  capBarTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  capBarFill: { height: "100%", borderRadius: 3 },
  foodCard: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 6 },
  foodCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  foodCardTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ledgerLabel: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, paddingRight: 8 },
  ledgerValue: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ledgerDivider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  foodHint: { fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 14, marginTop: 4 },
  trainingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  trainingText: { flex: 1, fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginTop: 2 },
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
  recruitBlock: { gap: 6, marginTop: 2 },
  recruitLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  recruitRow: { flexDirection: "row", gap: 8 },
  recruitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 64,
  },
  recruitBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
