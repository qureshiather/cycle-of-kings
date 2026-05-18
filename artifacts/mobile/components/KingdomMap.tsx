import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BUILDING_GRID_ORDER,
  formatRequirementHint,
  getBuildBlockReason,
  getTownHallLevel,
  type SlotType,
} from "@workspace/building-progression";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetBuildingSlots,
  useBuildSlot,
  useUpgradeSlot,
  useDemolishSlot,
  useGetTown,
  getGetBuildingSlotsQueryKey,
  getGetTownQueryKey,
} from "@workspace/api-client-react";
import {
  BASE_COSTS,
  SLOT_BONUS,
  SLOT_COLORS,
  SLOT_ICONS,
  SLOT_NAMES,
  formatCost,
  formatTimeRemaining,
} from "@/lib/buildingMeta";
import { useColors } from "@/hooks/useColors";

type SlotData = {
  slotType: string;
  level: number;
  upgrading: boolean;
  upgradeEndsAt?: string | null;
};

export default function KingdomMap({
  townId,
  refreshing,
  onRefresh,
}: {
  townId: number;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const colors = useColors();
  const qc = useQueryClient();

  const { data: slotsRaw = [], isLoading } = useGetBuildingSlots(townId, {
    query: { enabled: !!townId, refetchInterval: 30_000 } as any,
  });
  const { data: town } = useGetTown(townId, { query: { enabled: !!townId } as any });

  const buildSlot = useBuildSlot();
  const upgradeSlot = useUpgradeSlot();
  const demolishSlot = useDemolishSlot();

  const [selectedSlotType, setSelectedSlotType] = useState<string | null>(null);

  const slots = slotsRaw as SlotData[];
  const slotMap = new Map(slots.map((s) => [s.slotType, s]));
  const townHallLevel = getTownHallLevel(slots);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetBuildingSlotsQueryKey(townId) });
    qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
  }, [qc, townId]);

  const selectedSlot = selectedSlotType ? slotMap.get(selectedSlotType) : null;
  const isEmpty = (selectedSlot?.level ?? 0) === 0;
  const isUpgrading = selectedSlot?.upgrading ?? false;
  const isMaxLevel = (selectedSlot?.level ?? 0) >= 10;
  const isTownHall = selectedSlotType === "townHall";

  const gold = town?.gold ?? 0;
  const food = town?.food ?? 0;
  const wood = town?.wood ?? 0;
  const stone = town?.stone ?? 0;

  function canAfford(slotType: string, level: number): boolean {
    const base = BASE_COSTS[slotType] ?? { wood: 0, stone: 0, gold: 0, food: 0 };
    const mult = Math.pow(1.8, level - 1);
    return (
      gold >= Math.ceil(base.gold * mult) &&
      food >= Math.ceil(base.food * mult) &&
      wood >= Math.ceil(base.wood * mult) &&
      stone >= Math.ceil(base.stone * mult)
    );
  }

  const buildBlocked =
    selectedSlotType && isEmpty && !isTownHall
      ? getBuildBlockReason(selectedSlotType, slots)
      : null;
  const canBuild =
    selectedSlotType &&
    isEmpty &&
    !isTownHall &&
    !buildBlocked &&
    canAfford(selectedSlotType, 1);

  const handleBuild = () => {
    if (!selectedSlotType) return;
    buildSlot.mutate(
      { townId, slotType: selectedSlotType as any },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSelectedSlotType(null);
          invalidate();
        },
        onError: (e: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Build Failed", e?.data?.error ?? e?.message ?? "Could not build");
        },
      },
    );
  };

  const handleUpgrade = () => {
    if (!selectedSlotType) return;
    upgradeSlot.mutate(
      { townId, slotType: selectedSlotType as any },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSelectedSlotType(null);
          invalidate();
        },
        onError: (e: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Upgrade Failed", e?.data?.error ?? e?.message ?? "Could not upgrade");
        },
      },
    );
  };

  const handleDemolish = () => {
    if (!selectedSlotType || isTownHall) return;
    const name = SLOT_NAMES[selectedSlotType] ?? selectedSlotType;
    const level = selectedSlot?.level ?? 0;
    Alert.alert(`Demolish ${name}?`, "You get 75% of the cost back.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Demolish",
        style: "destructive",
        onPress: () => {
          demolishSlot.mutate(
            { townId, slotType: selectedSlotType as any },
            {
              onSuccess: () => {
                setSelectedSlotType(null);
                invalidate();
              },
              onError: (e: any) => {
                Alert.alert("Demolish Failed", e?.data?.error ?? e?.message ?? "Failed");
              },
            },
          );
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
          ) : undefined
        }
      >
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Town Hall level {townHallLevel} · Tap a building to build or upgrade
        </Text>

        <View style={styles.grid}>
          {BUILDING_GRID_ORDER.map((slotType) => {
            const slot = slotMap.get(slotType) ?? {
              slotType,
              level: slotType === "townHall" ? 1 : 0,
              upgrading: false,
            };
            const built = slot.level > 0;
            const locked = !built && getBuildBlockReason(slotType, slots) !== null;
            const color = SLOT_COLORS[slotType] ?? colors.gold;
            const icon = SLOT_ICONS[slotType] ?? "help";
            const name = SLOT_NAMES[slotType] ?? slotType;

            return (
              <BuildingCard
                key={slotType}
                name={name}
                icon={icon}
                color={color}
                level={slot.level}
                built={built}
                locked={locked}
                upgrading={slot.upgrading}
                upgradeEndsAt={slot.upgradeEndsAt}
                lockReason={locked ? getBuildBlockReason(slotType, slots) : null}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedSlotType(slotType);
                }}
                colors={colors}
              />
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={!!selectedSlotType}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSlotType(null)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setSelectedSlotType(null)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              {selectedSlotType && (() => {
                const color = SLOT_COLORS[selectedSlotType] ?? "#d4a520";
                const icon = SLOT_ICONS[selectedSlotType] ?? "help";
                const name = SLOT_NAMES[selectedSlotType] ?? selectedSlotType;
                const level = selectedSlot?.level ?? 0;
                const nextLevel = level + 1;

                return (
                  <>
                    <View style={styles.sheetHeader}>
                      <View style={[styles.sheetIcon, { backgroundColor: color + "22" }]}>
                        <MaterialCommunityIcons name={icon as any} size={28} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{name}</Text>
                        <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                          {isTownHall
                            ? `Town Hall · Level ${level}`
                            : isEmpty
                              ? `Locked: ${buildBlocked ?? "Ready to build"}`
                              : `Level ${level}`}
                        </Text>
                      </View>
                      {level > 0 && (
                        <Text style={[styles.lvBadge, { color }]}>{level}</Text>
                      )}
                    </View>

                    {isEmpty && !isTownHall && (
                      <Text style={[styles.reqHint, { color: colors.textSecondary }]}>
                        Needs: {formatRequirementHint(selectedSlotType as SlotType)}
                      </Text>
                    )}

                    {level > 0 && (
                      <Text style={[styles.bonus, { color }]}>
                        {SLOT_BONUS[selectedSlotType]?.(level)}
                      </Text>
                    )}

                    <View style={styles.actions}>
                      {isEmpty && !isTownHall && (
                        <ActionButton
                          label={`Build ${name}`}
                          sub={buildBlocked ?? `Cost: ${formatCost(selectedSlotType, 1)}`}
                          icon="hammer-wrench"
                          color={color}
                          disabled={!canBuild || buildSlot.isPending}
                          muted={colors.muted}
                          border={colors.border}
                          fg={colors.foreground}
                          onPress={handleBuild}
                          loading={buildSlot.isPending}
                        />
                      )}

                      {(!isEmpty || isTownHall) && !isMaxLevel && (
                        <ActionButton
                          label={isUpgrading ? "Upgrading…" : `Upgrade to ${nextLevel}`}
                          sub={isUpgrading ? "" : `Cost: ${formatCost(selectedSlotType, nextLevel)}`}
                          icon="arrow-up-bold-circle"
                          color={color}
                          disabled={
                            upgradeSlot.isPending ||
                            isUpgrading ||
                            !canAfford(selectedSlotType, nextLevel)
                          }
                          muted={colors.muted}
                          border={colors.border}
                          fg={colors.foreground}
                          onPress={handleUpgrade}
                          loading={upgradeSlot.isPending}
                        />
                      )}

                      {!isEmpty && !isTownHall && (
                        <ActionButton
                          label="Demolish"
                          sub={`Refund ~${formatCost(selectedSlotType, level)}`}
                          icon="delete-outline"
                          color="#cc4040"
                          disabled={demolishSlot.isPending}
                          muted={colors.muted}
                          border={colors.border}
                          fg="#cc4040"
                          onPress={handleDemolish}
                          loading={demolishSlot.isPending}
                        />
                      )}
                    </View>
                  </>
                );
              })()}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function BuildingCard({
  name,
  icon,
  color,
  level,
  built,
  locked,
  upgrading,
  upgradeEndsAt,
  lockReason,
  onPress,
  colors,
}: {
  name: string;
  icon: string;
  color: string;
  level: number;
  built: boolean;
  locked: boolean;
  upgrading: boolean;
  upgradeEndsAt?: string | null;
  lockReason: string | null;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!upgrading || !upgradeEndsAt) {
      setTimeLeft(0);
      return;
    }
    const tick = () =>
      setTimeLeft(Math.max(0, new Date(upgradeEndsAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [upgrading, upgradeEndsAt]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: built ? colors.surfaceElevated : colors.surface,
          borderColor: locked ? colors.border : built ? color + "66" : colors.border,
          opacity: locked ? 0.55 : 1,
        },
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: color + (built ? "28" : "14") }]}>
        {locked ? (
          <MaterialCommunityIcons name="lock" size={20} color={colors.textSecondary} />
        ) : (
          <MaterialCommunityIcons name={icon as any} size={22} color={color} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
          {name}
        </Text>
        {built ? (
          <Text style={[styles.cardMeta, { color }]}>
            Level {level}
            {upgrading ? ` · ${formatTimeRemaining(timeLeft)}` : ""}
          </Text>
        ) : (
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={2}>
            {locked ? lockReason : "Tap to build"}
          </Text>
        )}
      </View>
      {built && (
        <View style={[styles.cardLv, { borderColor: color + "88", backgroundColor: color + "22" }]}>
          <Text style={[styles.cardLvText, { color }]}>{level}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ActionButton({
  label,
  sub,
  icon,
  color,
  disabled,
  muted,
  border,
  fg,
  onPress,
  loading,
}: {
  label: string;
  sub: string;
  icon: string;
  color: string;
  disabled: boolean;
  muted: string;
  border: string;
  fg: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionBtn,
        {
          backgroundColor: disabled ? muted : color + "18",
          borderColor: disabled ? border : color + "44",
        },
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={18} color={disabled ? border : color} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionLabel, { color: disabled ? border : fg }]}>{label}</Text>
        {!!sub && <Text style={[styles.actionSub, { color: border }]}>{sub}</Text>}
      </View>
      {loading && <ActivityIndicator size="small" color={color} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 48, alignItems: "center" },
  scroll: { paddingHorizontal: 12, paddingBottom: 120, paddingTop: 8 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 12 },
  grid: { gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 3 },
  cardName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardMeta: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  cardLv: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cardLvText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000099" },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    gap: 12,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetIcon: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  sheetSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  lvBadge: { fontSize: 22, fontFamily: "Inter_700Bold" },
  reqHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bonus: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actions: { gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
