import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BUILDING_CATEGORY_LABELS,
  BUILDING_CATEGORY_ORDER,
  formatRequirementHint,
  getBuildBlockReason,
  getMaxConcurrentUpgrades,
  getTownHallLevel,
  unlockedBuildingsInCategory,
  type BuildingCategory,
  type SlotType,
} from "@workspace/building-progression";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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
  getGetActivitiesQueryKey,
  getGetBuildingSlotsQueryKey,
  getGetTownQueryKey,
} from "@workspace/api-client-react";
import {
  getBuildingCost,
  SLOT_BONUS,
  getSlotColor,
  SLOT_ICONS,
  SLOT_NAMES,
  formatCost,
  formatTimeRemaining,
  type ResourceAmounts,
} from "@/lib/buildingMeta";
import ResourceCostRow from "@/components/ResourceCostRow";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { slotBuildStates } from "@/lib/buildableSlots";
import { canAffordCost, normalizeResources } from "@/lib/resourceMeta";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { scheduleUpgradeEnd } from "@/lib/notifications";
import { SLOT_NAMES as NOTIF_SLOT_NAMES } from "@/lib/buildingMeta";

type SlotData = {
  slotType: string;
  level: number;
  upgrading: boolean;
  upgradeEndsAt?: string | null;
};

function useTimeRemaining(active: boolean, endsAt?: string | null): number {
  const [msLeft, setMsLeft] = useState(0);

  useEffect(() => {
    if (!active || !endsAt) {
      setMsLeft(0);
      return;
    }
    const tick = () => setMsLeft(Math.max(0, new Date(endsAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, endsAt]);

  return msLeft;
}

function constructionQueueHint(townHallLevel: number, maxConcurrent: number): string | null {
  if (maxConcurrent >= 3) return null;
  if (townHallLevel < 3) return "Upgrade Town Hall to level 3 for 2 builds at once.";
  if (townHallLevel < 5) return "Upgrade Town Hall to level 5 for 3 builds at once.";
  return null;
}

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
  const { withAlpha } = useTheme();
  const qc = useQueryClient();

  const { data: slotsRaw = [], isLoading } = useGetBuildingSlots(townId, {
    query: { enabled: !!townId, refetchInterval: 30_000 } as any,
  });
  const { data: town } = useGetTown(townId, { query: { enabled: !!townId } as any });

  const buildSlot = useBuildSlot();
  const upgradeSlot = useUpgradeSlot();
  const demolishSlot = useDemolishSlot();

  const [selectedSlotType, setSelectedSlotType] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<BuildingCategory, boolean>>({
    production: false,
    culture: false,
    army: false,
  });
  const prevActionableRef = useRef(0);

  const toggleSection = (category: BuildingCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCollapsedSections((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const slots = slotsRaw as SlotData[];
  const slotMap = new Map<string, SlotData>();
  for (const slot of slots) {
    const prev = slotMap.get(slot.slotType);
    if (!prev || (slot.level ?? 0) > (prev.level ?? 0)) {
      slotMap.set(slot.slotType, slot);
    }
  }
  const slotsForRules = [...slotMap.values()];

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetBuildingSlotsQueryKey(townId) });
    qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
    qc.invalidateQueries({ queryKey: getGetActivitiesQueryKey(townId) });
  }, [qc, townId]);

  const selectedSlot = selectedSlotType ? slotMap.get(selectedSlotType) : null;
  const isEmpty = (selectedSlot?.level ?? 0) === 0;
  const isUpgrading = selectedSlot?.upgrading ?? false;
  const sheetTimeLeft = useTimeRemaining(isUpgrading, selectedSlot?.upgradeEndsAt);
  const isMaxLevel = (selectedSlot?.level ?? 0) >= 10;
  const isTownHall = selectedSlotType === "townHall";

  const gold = town?.gold ?? 0;
  const food = town?.food ?? 0;
  const wood = town?.wood ?? 0;
  const stone = town?.stone ?? 0;

  const owned = normalizeResources({ gold, food, wood, stone });

  const buildStates = useMemo(() => slotBuildStates(slotsForRules, owned), [slotsForRules, owned]);
  const buildStateByType = useMemo(() => {
    const map = new Map<string, (typeof buildStates)[number]>();
    for (const state of buildStates) map.set(state.slotType, state);
    return map;
  }, [buildStates]);
  const actionableCount = useMemo(
    () => buildStates.filter((s) => s.actionable).length,
    [buildStates],
  );

  useEffect(() => {
    if (actionableCount > 0 && prevActionableRef.current === 0) {
      setCollapsedSections((prev) => {
        const next = { ...prev };
        for (const category of BUILDING_CATEGORY_ORDER) {
          const hasActionable = unlockedBuildingsInCategory(category, slotsForRules).some(
            (slotType) => buildStateByType.get(slotType)?.actionable,
          );
          if (hasActionable) next[category] = false;
        }
        return next;
      });
    }
    prevActionableRef.current = actionableCount;
  }, [actionableCount, buildStateByType, slotsForRules]);

  function canAfford(slotType: string, level: number): boolean {
    return canAffordCost(getBuildingCost(slotType, level), owned);
  }

  const buildBlocked =
    selectedSlotType && isEmpty
      ? getBuildBlockReason(selectedSlotType, slotsForRules)
      : null;
  const thLevel = getTownHallLevel(slotsForRules);
  const maxConcurrent = getMaxConcurrentUpgrades(thLevel);
  const upgradingCount = slotsForRules.filter((s) => s.upgrading).length;
  const queueFull = upgradingCount >= maxConcurrent;

  const canBuild =
    selectedSlotType &&
    isEmpty &&
    !buildBlocked &&
    canAfford(selectedSlotType, 1) &&
    !queueFull;

  const handleBuild = () => {
    if (!selectedSlotType) return;
    buildSlot.mutate(
      { townId, slotType: selectedSlotType as any },
      {
        onSuccess: (data: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (data?.upgradeEndsAt && selectedSlotType) {
            void scheduleUpgradeEnd(
              townId,
              selectedSlotType,
              NOTIF_SLOT_NAMES[selectedSlotType] ?? selectedSlotType,
              data.upgradeEndsAt,
            );
          }
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
        onSuccess: (data: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (data?.upgradeEndsAt && selectedSlotType) {
            void scheduleUpgradeEnd(
              townId,
              selectedSlotType,
              NOTIF_SLOT_NAMES[selectedSlotType] ?? selectedSlotType,
              data.upgradeEndsAt,
            );
          }
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

  const canUpgrade =
    selectedSlotType &&
    !isEmpty &&
    !isMaxLevel &&
    !isUpgrading &&
    canAfford(selectedSlotType, (selectedSlot?.level ?? 0) + 1) &&
    !queueFull;

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
        <View
          style={[
            styles.queueBanner,
            {
              backgroundColor: queueFull ? withAlpha(colors.warning, 0.1) : colors.surface,
              borderColor: queueFull ? withAlpha(colors.warning, 0.4) : colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="hammer-wrench"
            size={16}
            color={queueFull ? colors.warning : colors.gold}
          />
          <View style={styles.queueBannerBody}>
            <Text style={[styles.queueBannerTitle, { color: colors.foreground }]}>
              Construction queue · {upgradingCount}/{maxConcurrent}
            </Text>
            <Text style={[styles.queueBannerSub, { color: colors.textSecondary }]}>
              {queueFull
                ? "Queue full — finish a build before starting another."
                : upgradingCount > 0
                  ? `${maxConcurrent - upgradingCount} slot${maxConcurrent - upgradingCount === 1 ? "" : "s"} free`
                  : constructionQueueHint(thLevel, maxConcurrent) ??
                    "Build or upgrade one structure per slot."}
            </Text>
          </View>
        </View>

        {BUILDING_CATEGORY_ORDER.map((category) => {
          const isCollapsed = collapsedSections[category];
          const sectionColor =
            category === "production"
              ? colors.food
              : category === "culture"
                ? colors.gold
                : colors.military;
          const categorySlots = unlockedBuildingsInCategory(category, slotsForRules);
          if (categorySlots.length === 0) return null;
          const sortedSlots = [...categorySlots].sort((a, b) => {
            const rank = (slotType: string) => {
              const state = buildStateByType.get(slotType);
              if (state?.actionable) return 0;
              if (state?.ready && state.canAfford) return 1;
              if (state?.ready) return 2;
              return 3;
            };
            return rank(a) - rank(b);
          });
          const builtInSection = categorySlots.filter(
            (slotType) => (slotMap.get(slotType)?.level ?? 0) > 0,
          ).length;

          return (
          <View key={category} style={styles.section}>
            <Pressable
              onPress={() => toggleSection(category)}
              style={({ pressed }) => [styles.sectionHeader, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityState={{ expanded: !isCollapsed }}
              accessibilityLabel={`${BUILDING_CATEGORY_LABELS[category]}, ${builtInSection} of ${categorySlots.length} built`}
            >
              <MaterialCommunityIcons
                name={isCollapsed ? "chevron-right" : "chevron-down"}
                size={18}
                color={sectionColor}
              />
              <MaterialCommunityIcons
                name={
                  category === "production"
                    ? "warehouse"
                    : category === "culture"
                      ? "bank"
                      : "sword-cross"
                }
                size={16}
                color={sectionColor}
              />
              <Text style={[styles.sectionTitle, { color: sectionColor, flex: 1 }]}>
                {BUILDING_CATEGORY_LABELS[category]}
              </Text>
              {isCollapsed && (
                <Text style={[styles.sectionSummary, { color: colors.textSecondary }]}>
                  {builtInSection}/{categorySlots.length} built
                </Text>
              )}
              <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
            </Pressable>
            {!isCollapsed && (
            <View style={styles.grid}>
              {sortedSlots.map((slotType) => {
                const slot = slotMap.get(slotType) ?? {
                  slotType,
                  level: 0,
                  upgrading: false,
                };
                const state = buildStateByType.get(slotType);
                const built = slot.level > 0;
                const lockReason = !built ? getBuildBlockReason(slotType, slotsForRules) : null;
                const locked = lockReason !== null;
                const ready = !built && !locked;
                const color = getSlotColor(slotType, colors);
                const icon = SLOT_ICONS[slotType] ?? "help";
                const name = SLOT_NAMES[slotType] ?? slotType;
                const canAffordBuild = state?.canAfford ?? (ready && canAfford(slotType, 1));
                const highlight = state?.actionable ?? false;

                return (
                  <BuildingCard
                    key={slotType}
                    name={name}
                    icon={icon}
                    color={color}
                    level={slot.level}
                    built={built}
                    ready={ready}
                    locked={locked}
                    upgrading={slot.upgrading}
                    upgradeEndsAt={slot.upgradeEndsAt}
                    lockReason={lockReason}
                    canAffordBuild={canAffordBuild}
                    buildCostHint={highlight ? formatCost(slotType, 1) : undefined}
                    queueFull={queueFull}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedSlotType(slotType);
                    }}
                    colors={colors}
                  />
                );
              })}
            </View>
            )}
          </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={!!selectedSlotType}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSlotType(null)}
      >
        <ModalOverlay onPress={() => setSelectedSlotType(null)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              {selectedSlotType && (() => {
                const color = getSlotColor(selectedSlotType, colors);
                const icon = SLOT_ICONS[selectedSlotType] ?? "help";
                const name = SLOT_NAMES[selectedSlotType] ?? selectedSlotType;
                const level = selectedSlot?.level ?? 0;
                const nextLevel = level + 1;
                const sheetStatus = isUpgrading
                  ? "building"
                  : isEmpty
                    ? buildBlocked
                      ? "locked"
                      : "empty"
                    : "built";

                return (
                  <>
                    {sheetStatus !== "built" && (
                      <View
                        style={[
                          styles.statusBanner,
                          {
                            backgroundColor:
                              sheetStatus === "building"
                                ? withAlpha(colors.warning, 0.12)
                                : sheetStatus === "locked"
                                  ? withAlpha(colors.textMuted, 0.1)
                                  : withAlpha(colors.gold, 0.1),
                            borderColor:
                              sheetStatus === "building"
                                ? withAlpha(colors.warning, 0.35)
                                : sheetStatus === "locked"
                                  ? colors.border
                                  : withAlpha(colors.gold, 0.35),
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            sheetStatus === "building"
                              ? "progress-clock"
                              : sheetStatus === "locked"
                                ? "lock"
                                : "hammer-wrench"
                          }
                          size={14}
                          color={
                            sheetStatus === "building"
                              ? colors.warning
                              : sheetStatus === "locked"
                                ? colors.textSecondary
                                : colors.gold
                          }
                        />
                        <Text
                          style={[
                            styles.statusBannerText,
                            {
                              color:
                                sheetStatus === "building"
                                  ? colors.warning
                                  : sheetStatus === "locked"
                                    ? colors.textSecondary
                                    : colors.gold,
                            },
                          ]}
                        >
                          {sheetStatus === "building"
                            ? `Building · ${formatTimeRemaining(sheetTimeLeft)}`
                            : sheetStatus === "locked"
                              ? `Not built · ${buildBlocked}`
                              : "Not built · Ready to build"}
                        </Text>
                      </View>
                    )}

                    <View style={styles.sheetHeader}>
                      <View style={[styles.sheetIcon, { backgroundColor: withAlpha(color, 0.12) }]}>
                        <MaterialCommunityIcons name={icon as any} size={28} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{name}</Text>
                        <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                          {isEmpty
                            ? buildBlocked
                              ? `Requires: ${formatRequirementHint(selectedSlotType as SlotType)}`
                              : "Tap Build below when you have resources"
                            : `Level ${level}`}
                        </Text>
                      </View>
                    </View>

                    {level > 0 && (
                      <Text style={[styles.bonus, { color }]}>
                        {SLOT_BONUS[selectedSlotType]?.(level)}
                      </Text>
                    )}

                    <View style={styles.actions}>
                      {isEmpty && (
                        <ActionButton
                          label={`Build ${name}`}
                          cost={getBuildingCost(selectedSlotType, 1)}
                          owned={owned}
                          icon="hammer-wrench"
                          color={color}
                          disabled={!canBuild || buildSlot.isPending}
                          blockedReason={
                            buildBlocked ??
                            (queueFull ? `Construction queue full (${upgradingCount}/${maxConcurrent})` : null)
                          }
                          onPress={handleBuild}
                          loading={buildSlot.isPending}
                        />
                      )}

                      {!isEmpty && !isMaxLevel && (
                        <ActionButton
                          label={
                            isUpgrading
                              ? `Building · ${formatTimeRemaining(sheetTimeLeft)}`
                              : `Build to level ${nextLevel}`
                          }
                          cost={isUpgrading ? null : getBuildingCost(selectedSlotType, nextLevel)}
                          owned={owned}
                          icon="hammer-wrench"
                          color={color}
                          disabled={!canUpgrade || upgradeSlot.isPending}
                          blockedReason={
                            queueFull && !isUpgrading
                              ? `Construction queue full (${upgradingCount}/${maxConcurrent})`
                              : undefined
                          }
                          onPress={handleUpgrade}
                          loading={upgradeSlot.isPending}
                        />
                      )}

                      {!isEmpty && !isTownHall && (
                        <ActionButton
                          label="Demolish"
                          cost={getBuildingCost(selectedSlotType, level)}
                          owned={owned}
                          icon="delete-outline"
                          color={colors.destructive}
                          disabled={demolishSlot.isPending}
                          variant="refund"
                          onPress={handleDemolish}
                          loading={demolishSlot.isPending}
                          costLabel="Refund ~"
                        />
                      )}
                    </View>
                  </>
                );
              })()}
            </View>
          </TouchableOpacity>
        </ModalOverlay>
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
  ready,
  locked,
  upgrading,
  upgradeEndsAt,
  lockReason,
  canAffordBuild,
  buildCostHint,
  queueFull,
  onPress,
  colors,
}: {
  name: string;
  icon: string;
  color: string;
  level: number;
  built: boolean;
  ready: boolean;
  locked: boolean;
  upgrading: boolean;
  upgradeEndsAt?: string | null;
  lockReason: string | null;
  canAffordBuild: boolean;
  buildCostHint?: string;
  queueFull?: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { withAlpha } = useTheme();
  const timeLeft = useTimeRemaining(upgrading, upgradeEndsAt);
  const canBuildNow = ready && canAffordBuild && !queueFull;

  const accentColor = upgrading
    ? colors.warning
    : built
      ? color
      : ready
        ? canAffordBuild
          ? colors.gold
          : colors.textSecondary
        : colors.textMuted;

  const displayLevel = upgrading ? Math.max(1, level - 1) : level;

  const statusLabel = upgrading
    ? formatTimeRemaining(timeLeft)
    : built
      ? `Lv ${displayLevel}`
      : locked
        ? "Locked"
        : canBuildNow
          ? "Ready"
          : ready && queueFull
            ? "Queue full"
            : ready
              ? "Need res."
              : "Locked";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: built
            ? colors.surfaceElevated
            : canBuildNow
              ? withAlpha(colors.gold, 0.06)
              : colors.surface,
          borderColor: built
            ? withAlpha(color, 0.45)
            : canBuildNow
              ? withAlpha(colors.gold, 0.55)
              : colors.border,
          borderStyle: ready && !built && !canBuildNow ? "dashed" : "solid",
          opacity: locked ? 0.65 : 1,
        },
      ]}
    >
      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
      <View style={[styles.cardIcon, { backgroundColor: withAlpha(color, built || ready ? 0.14 : 0.06) }]}>
        {locked ? (
          <MaterialCommunityIcons name="lock" size={20} color={colors.textMuted} />
        ) : (
          <MaterialCommunityIcons name={icon as any} size={22} color={built || ready ? color : colors.textMuted} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
          {name}
        </Text>
        {built || upgrading ? (
          <Text style={[styles.cardMeta, { color: upgrading ? colors.warning : color }]}>
            {upgrading
              ? `Building · ${formatTimeRemaining(timeLeft)}`
              : `Level ${level}`}
          </Text>
        ) : (
          <Text
            style={[
              styles.cardMeta,
              {
                color: canBuildNow
                  ? colors.gold
                  : ready && queueFull
                    ? colors.warning
                    : canAffordBuild
                      ? colors.foreground
                      : colors.textSecondary,
              },
            ]}
            numberOfLines={2}
          >
            {locked
              ? lockReason
              : canBuildNow
                ? buildCostHint ?? "Tap to build"
                : ready && queueFull
                  ? "Construction queue is full"
                  : ready
                    ? buildCostHint ?? "Not enough resources"
                    : lockReason}
          </Text>
        )}
      </View>
      {canBuildNow ? (
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.gold} />
      ) : (
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: withAlpha(accentColor, 0.12),
              borderColor: withAlpha(accentColor, 0.35),
            },
          ]}
        >
          <Text style={[styles.statusPillText, { color: accentColor }]}>{statusLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ActionButton({
  label,
  cost,
  owned,
  icon,
  color,
  disabled,
  onPress,
  loading,
  blockedReason,
  variant = "default",
  costLabel = "Cost",
}: {
  label: string;
  cost: ResourceAmounts | null;
  owned: ResourceAmounts;
  icon: string;
  color: string;
  disabled: boolean;
  onPress: () => void;
  loading: boolean;
  blockedReason?: string | null;
  variant?: "default" | "refund";
  costLabel?: string;
}) {
  const colors = useColors();
  const { withAlpha } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionBtn,
        {
          backgroundColor: disabled ? colors.muted : withAlpha(color, 0.1),
          borderColor: disabled ? colors.border : withAlpha(color, 0.35),
        },
      ]}
    >
      <MaterialCommunityIcons name={icon as any} size={20} color={disabled ? colors.textMuted : color} />
      <View style={styles.actionBody}>
        <Text style={[styles.actionLabel, { color: disabled ? colors.textSecondary : colors.foreground }]}>
          {label}
        </Text>
        {blockedReason && (
          <Text style={[styles.blockedHint, { color: colors.textSecondary }]}>{blockedReason}</Text>
        )}
        {cost && (
          <View style={styles.costBlock}>
            <Text style={[styles.costLabel, { color: colors.textSecondary }]}>
              {variant === "refund" ? costLabel : costLabel}
            </Text>
            <ResourceCostRow
              cost={cost}
              owned={variant === "default" ? owned : undefined}
              variant={variant === "refund" ? "refund" : "default"}
            />
          </View>
        )}
      </View>
      {loading && <ActivityIndicator size="small" color={color} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 48, alignItems: "center" },
  scroll: { paddingHorizontal: 12, paddingBottom: 120, paddingTop: 4, gap: 12 },
  queueBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  queueBannerBody: { flex: 1, gap: 2 },
  queueBannerTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  queueBannerSub: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  section: { gap: 8, marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.6, textTransform: "uppercase" },
  sectionSummary: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionLine: { flex: 1, height: 1, marginLeft: 4 },
  grid: { gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingLeft: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    overflow: "hidden",
  },
  cardAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
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
  statusPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 0,
  },
  statusPillText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
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
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusBannerText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  bonus: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actions: { gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBody: { flex: 1, gap: 6 },
  actionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  blockedHint: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  costBlock: { gap: 4 },
  costLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4, textTransform: "uppercase" },
});
