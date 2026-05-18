import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  BUILDING_CATEGORY_LABELS,
  BUILDING_CATEGORY_ORDER,
  BUILDINGS_BY_CATEGORY,
  formatRequirementHint,
  getBuildBlockReason,
  type BuildingCategory,
  type SlotType,
} from "@workspace/building-progression";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
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
  getGetBuildingSlotsQueryKey,
  getGetTownQueryKey,
} from "@workspace/api-client-react";
import {
  getBuildingCost,
  SLOT_BONUS,
  getSlotColor,
  SLOT_ICONS,
  SLOT_NAMES,
  formatTimeRemaining,
  type ResourceAmounts,
} from "@/lib/buildingMeta";
import ResourceCostRow from "@/components/ResourceCostRow";
import BuildingProgressionModal from "@/components/BuildingProgressionModal";
import ModalOverlay from "@/components/ui/ModalOverlay";
import { canAffordCost, normalizeResources } from "@/lib/resourceMeta";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";

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
    army: false,
  });
  const [guideOpen, setGuideOpen] = useState(false);

  const toggleSection = (category: BuildingCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCollapsedSections((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const slots = slotsRaw as SlotData[];
  const slotMap = new Map(slots.map((s) => [s.slotType, s]));

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

  const owned = normalizeResources({ gold, food, wood, stone });

  function canAfford(slotType: string, level: number): boolean {
    return canAffordCost(getBuildingCost(slotType, level), owned);
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
        <View style={styles.legendRow}>
          <View style={styles.legend}>
            <LegendChip label="Built" dotColor={colors.success} colors={colors} />
            <LegendChip label="Ready" dotColor={colors.gold} colors={colors} />
            <LegendChip label="Locked" dotColor={colors.textMuted} colors={colors} />
            <LegendChip label="Upgrading" dotColor={colors.warning} colors={colors} />
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGuideOpen(true);
            }}
            style={({ pressed }) => [
              styles.guideBtn,
              {
                backgroundColor: withAlpha(colors.gold, pressed ? 0.18 : 0.1),
                borderColor: withAlpha(colors.gold, 0.35),
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open building guide"
          >
            <MaterialCommunityIcons name="map-legend" size={18} color={colors.gold} />
          </Pressable>
        </View>

        {BUILDING_CATEGORY_ORDER.map((category) => {
          const isCollapsed = collapsedSections[category];
          const sectionColor = category === "production" ? colors.food : colors.military;
          const categorySlots = BUILDINGS_BY_CATEGORY[category];
          const builtInSection = categorySlots.filter(
            (slotType) => (slotMap.get(slotType)?.level ?? (slotType === "townHall" ? 1 : 0)) > 0,
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
                name={category === "production" ? "warehouse" : "sword-cross"}
                size={16}
                color={sectionColor}
              />
              <Text style={[styles.sectionTitle, { color: sectionColor }]}>
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
              {categorySlots.map((slotType) => {
                const slot = slotMap.get(slotType) ?? {
                  slotType,
                  level: slotType === "townHall" ? 1 : 0,
                  upgrading: false,
                };
                const built = slot.level > 0;
                const lockReason = !built ? getBuildBlockReason(slotType, slots) : null;
                const locked = lockReason !== null;
                const ready = !built && !locked;
                const color = getSlotColor(slotType, colors);
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
                    ready={ready}
                    locked={locked}
                    upgrading={slot.upgrading}
                    upgradeEndsAt={slot.upgradeEndsAt}
                    lockReason={lockReason}
                    canAffordBuild={ready && canAfford(slotType, 1)}
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

      <BuildingProgressionModal
        visible={guideOpen}
        onClose={() => setGuideOpen(false)}
        slots={slots}
      />

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
                  ? "upgrading"
                  : isEmpty && !isTownHall
                    ? buildBlocked
                      ? "locked"
                      : "empty"
                    : "built";

                return (
                  <>
                    <View
                      style={[
                        styles.statusBanner,
                        {
                          backgroundColor:
                            sheetStatus === "upgrading"
                              ? withAlpha(colors.warning, 0.12)
                              : sheetStatus === "locked"
                                ? withAlpha(colors.textMuted, 0.1)
                                : sheetStatus === "empty"
                                  ? withAlpha(colors.gold, 0.1)
                                  : withAlpha(color, 0.1),
                          borderColor:
                            sheetStatus === "upgrading"
                              ? withAlpha(colors.warning, 0.35)
                              : sheetStatus === "locked"
                                ? colors.border
                                : sheetStatus === "empty"
                                  ? withAlpha(colors.gold, 0.35)
                                  : withAlpha(color, 0.35),
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={
                          sheetStatus === "upgrading"
                            ? "progress-clock"
                            : sheetStatus === "locked"
                              ? "lock"
                              : sheetStatus === "empty"
                                ? "hammer-wrench"
                                : "check-circle"
                        }
                        size={14}
                        color={
                          sheetStatus === "upgrading"
                            ? colors.warning
                            : sheetStatus === "locked"
                              ? colors.textSecondary
                              : sheetStatus === "empty"
                                ? colors.gold
                                : color
                        }
                      />
                      <Text
                        style={[
                          styles.statusBannerText,
                          {
                            color:
                              sheetStatus === "upgrading"
                                ? colors.warning
                                : sheetStatus === "locked"
                                  ? colors.textSecondary
                                  : sheetStatus === "empty"
                                    ? colors.gold
                                    : color,
                          },
                        ]}
                      >
                        {sheetStatus === "upgrading"
                          ? "Upgrade in progress"
                          : sheetStatus === "locked"
                            ? `Not built · ${buildBlocked}`
                            : sheetStatus === "empty"
                              ? "Empty slot · Ready to build"
                              : `Built · Level ${level}`}
                      </Text>
                    </View>

                    <View style={styles.sheetHeader}>
                      <View style={[styles.sheetIcon, { backgroundColor: withAlpha(color, 0.12) }]}>
                        <MaterialCommunityIcons name={icon as any} size={28} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{name}</Text>
                        <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                          {isTownHall
                            ? `Town Hall · Level ${level}`
                            : isEmpty
                              ? buildBlocked
                                ? `Requires: ${formatRequirementHint(selectedSlotType as SlotType)}`
                                : "Tap Build below when you have resources"
                              : `Level ${level}`}
                        </Text>
                      </View>
                      {level > 0 && (
                        <Text style={[styles.lvBadge, { color }]}>{level}</Text>
                      )}
                    </View>

                    {level > 0 && (
                      <Text style={[styles.bonus, { color }]}>
                        {SLOT_BONUS[selectedSlotType]?.(level)}
                      </Text>
                    )}

                    <View style={styles.actions}>
                      {isEmpty && !isTownHall && (
                        <ActionButton
                          label={`Build ${name}`}
                          cost={getBuildingCost(selectedSlotType, 1)}
                          owned={owned}
                          icon="hammer-wrench"
                          color={color}
                          disabled={!canBuild || buildSlot.isPending}
                          blockedReason={buildBlocked}
                          onPress={handleBuild}
                          loading={buildSlot.isPending}
                        />
                      )}

                      {(!isEmpty || isTownHall) && !isMaxLevel && (
                        <ActionButton
                          label={isUpgrading ? "Upgrading…" : `Upgrade to level ${nextLevel}`}
                          cost={isUpgrading ? null : getBuildingCost(selectedSlotType, nextLevel)}
                          owned={owned}
                          icon="arrow-up-bold-circle"
                          color={color}
                          disabled={
                            upgradeSlot.isPending ||
                            isUpgrading ||
                            !canAfford(selectedSlotType, nextLevel)
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

function LegendChip({
  label,
  dotColor,
  colors,
}: {
  label: string;
  dotColor: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.legendChip}>
      <View style={[styles.legendDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
    </View>
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
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { withAlpha } = useTheme();
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

  const accentColor = upgrading
    ? colors.warning
    : built
      ? color
      : ready
        ? canAffordBuild
          ? colors.gold
          : colors.textSecondary
        : colors.textMuted;

  const statusLabel = upgrading
    ? formatTimeRemaining(timeLeft)
    : built
      ? `Lv ${level}`
      : ready
        ? canAffordBuild
          ? "BUILD"
          : "READY"
        : "LOCKED";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: built ? colors.surfaceElevated : ready ? withAlpha(colors.gold, 0.04) : colors.surface,
          borderColor: built
            ? withAlpha(color, 0.45)
            : ready
              ? withAlpha(canAffordBuild ? colors.gold : colors.border, canAffordBuild ? 0.5 : 1)
              : colors.border,
          borderStyle: ready && !built ? "dashed" : "solid",
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
        {built ? (
          <Text style={[styles.cardMeta, { color: upgrading ? colors.warning : color }]}>
            {upgrading ? `Upgrading · ${formatTimeRemaining(timeLeft)}` : `Level ${level}`}
          </Text>
        ) : (
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={2}>
            {locked ? lockReason : canAffordBuild ? "Ready — tap to build" : "Needs resources"}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.statusPill,
          {
            backgroundColor: withAlpha(accentColor, 0.15),
            borderColor: withAlpha(accentColor, 0.4),
          },
        ]}
      >
        <Text style={[styles.statusPillText, { color: accentColor }]}>{statusLabel}</Text>
      </View>
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
  scroll: { paddingHorizontal: 12, paddingBottom: 120, paddingTop: 8 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 12,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, flexShrink: 1 },
  guideBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  legendChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_500Medium" },
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
  lvBadge: { fontSize: 22, fontFamily: "Inter_700Bold" },
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
