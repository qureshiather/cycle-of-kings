import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text,
  TouchableOpacity, View, useWindowDimensions,
} from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetBuildingSlots, useBuildSlot, useUpgradeSlot, useDemolishSlot,
  useGetTown,
  getGetBuildingSlotsQueryKey, getGetTownQueryKey,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

const MAP_PADDING = 10;
const TILE_GAP = 8;
const TILE_HEIGHT = 86;
const DEFENSE_HEIGHT = 72;
const ROW_GAP = 8;

const SLOT_NAMES: Record<string, string> = {
  farm: "Farm", mine: "Mine", quarry: "Quarry", lumberMill: "Lumber Mill",
  barracks: "Barracks", archeryRange: "Archery Range", stables: "Stables",
  market: "Market", tavern: "Tavern", house: "House",
  wall: "Town Wall", tower: "Watch Tower",
};

const SLOT_ICONS: Record<string, string> = {
  farm: "sprout", mine: "pickaxe", quarry: "mine", lumberMill: "axe",
  barracks: "shield-sword", archeryRange: "bow-arrow", stables: "horse",
  market: "store", tavern: "glass-mug-variant", house: "home",
  wall: "wall", tower: "chess-rook",
};

const SLOT_COLORS: Record<string, string> = {
  farm: "#3d7a35", mine: "#d4a520", quarry: "#7a7a6a", lumberMill: "#7a4e20",
  barracks: "#8a3030", archeryRange: "#3d7a35", stables: "#c4a820",
  market: "#d4a520", tavern: "#c4673a", house: "#2a5a8a",
  wall: "#5a5a5a", tower: "#4a4a6a",
};

const SLOT_BONUS: Record<string, (level: number) => string> = {
  farm: (l) => `+${l * 5} food/h`,
  mine: (l) => `+${l * 3} gold/h`,
  quarry: (l) => `+${l * 4} stone/h`,
  lumberMill: (l) => `+${l * 8} wood/h`,
  market: (l) => `+${l * 2} gold/h`,
  barracks: (l) => `+${l * 5} Infantry`,
  archeryRange: (l) => `+${l * 5} Archers`,
  stables: (l) => `+${l * 3} Cavalry`,
  house: (l) => `+${l * 10} capacity`,
  tavern: (l) => `+${Math.round(l * 2.5)} morale`,
  wall: (l) => `+${l * 20} defense`,
  tower: (l) => `+${l * 30} defense`,
};

const BASE_COSTS: Record<string, { wood: number; stone: number; gold: number; food: number }> = {
  farm:         { wood: 50,  stone: 20,  gold: 0,  food: 0 },
  mine:         { wood: 30,  stone: 50,  gold: 0,  food: 0 },
  quarry:       { wood: 20,  stone: 30,  gold: 0,  food: 0 },
  lumberMill:   { wood: 0,   stone: 30,  gold: 0,  food: 0 },
  barracks:     { wood: 60,  stone: 40,  gold: 30, food: 0 },
  archeryRange: { wood: 50,  stone: 30,  gold: 20, food: 0 },
  stables:      { wood: 70,  stone: 20,  gold: 40, food: 10 },
  market:       { wood: 40,  stone: 0,   gold: 20, food: 0 },
  tavern:       { wood: 50,  stone: 20,  gold: 10, food: 0 },
  house:        { wood: 30,  stone: 20,  gold: 0,  food: 0 },
  wall:         { wood: 0,   stone: 40,  gold: 0,  food: 0 },
  tower:        { wood: 20,  stone: 60,  gold: 20, food: 0 },
};

function formatCost(slotType: string, targetLevel: number): string {
  const base = BASE_COSTS[slotType] ?? { wood: 0, stone: 0, gold: 0, food: 0 };
  const mult = Math.pow(1.8, targetLevel - 1);
  const parts: string[] = [];
  const g = Math.ceil(base.gold  * mult); if (g > 0) parts.push(`${g}G`);
  const f = Math.ceil(base.food  * mult); if (f > 0) parts.push(`${f}F`);
  const w = Math.ceil(base.wood  * mult); if (w > 0) parts.push(`${w}W`);
  const s = Math.ceil(base.stone * mult); if (s > 0) parts.push(`${s}St`);
  return parts.join(" · ") || "Free";
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Done";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

const LAYOUT: Record<string, { row: number; col: number; colSpan: number }> = {
  wall:         { row: 0, col: 0, colSpan: 2 },
  tower:        { row: 0, col: 2, colSpan: 1 },
  farm:         { row: 1, col: 0, colSpan: 1 },
  market:       { row: 1, col: 1, colSpan: 1 },
  barracks:     { row: 1, col: 2, colSpan: 1 },
  mine:         { row: 2, col: 0, colSpan: 1 },
  tavern:       { row: 2, col: 1, colSpan: 1 },
  archeryRange: { row: 2, col: 2, colSpan: 1 },
  quarry:       { row: 3, col: 0, colSpan: 1 },
  house:        { row: 3, col: 1, colSpan: 1 },
  stables:      { row: 3, col: 2, colSpan: 1 },
  lumberMill:   { row: 4, col: 0, colSpan: 1 },
};

interface SlotTileProps {
  slot: { slotType: string; level: number; upgrading: boolean; upgradeEndsAt?: string | null };
  tileW: number;
  x: number;
  y: number;
  tileH: number;
  onPress: () => void;
}

function SlotTile({ slot, tileW, x, y, tileH, onPress }: SlotTileProps) {
  const colors = useColors();
  const color = SLOT_COLORS[slot.slotType] ?? "#7a7a6a";
  const icon  = SLOT_ICONS[slot.slotType] ?? "help";
  const name  = SLOT_NAMES[slot.slotType] ?? slot.slotType;
  const isEmpty = slot.level === 0;

  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!slot.upgrading || !slot.upgradeEndsAt) { setTimeLeft(0); return; }
    const tick = () => setTimeLeft(Math.max(0, new Date(slot.upgradeEndsAt!).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [slot.upgrading, slot.upgradeEndsAt]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.tile,
        {
          position: "absolute", left: x, top: y, width: tileW, height: tileH,
          backgroundColor: isEmpty ? colors.surface : colors.surfaceElevated,
          borderColor: isEmpty ? colors.border : color + "55",
          opacity: isEmpty ? 0.75 : 1,
        },
      ]}
    >
      <View style={[styles.tileIconWrap, { backgroundColor: color + (isEmpty ? "18" : "28") }]}>
        <MaterialCommunityIcons name={icon as any} size={tileH > 75 ? 20 : 16} color={isEmpty ? colors.textSecondary : color} />
      </View>
      <View style={styles.tileBody}>
        <Text style={[styles.tileName, { color: isEmpty ? colors.textSecondary : colors.foreground, fontSize: name.length > 10 ? 10 : 11 }]} numberOfLines={1}>
          {name}
        </Text>
        {isEmpty ? (
          <Text style={[styles.tileSubtext, { color: colors.textSecondary }]}>Tap to build</Text>
        ) : slot.upgrading ? (
          <Text style={[styles.tileSubtext, { color: colors.gold }]} numberOfLines={1}>
            ⏳ {formatTimeRemaining(timeLeft)}
          </Text>
        ) : (
          <Text style={[styles.tileSubtext, { color: color }]} numberOfLines={1}>
            {SLOT_BONUS[slot.slotType]?.(slot.level) ?? `Lv ${slot.level}`}
          </Text>
        )}
      </View>
      {slot.level > 0 && (
        <View style={[styles.levelBadge, { backgroundColor: color + "33", borderColor: color + "66" }]}>
          <Text style={[styles.levelText, { color: color }]}>{slot.level}</Text>
        </View>
      )}
      {slot.upgrading && (
        <View style={[styles.constructOverlay, { backgroundColor: "#00000055" }]}>
          <Text style={styles.constructEmoji}>🔨</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface Props {
  townId: number;
}

export default function KingdomMap({ townId }: Props) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const qc = useQueryClient();

  const { data: slotsRaw = [], isLoading } = useGetBuildingSlots(townId, { query: { enabled: !!townId, refetchInterval: 30_000 } as any });
  const { data: town } = useGetTown(townId, { query: { enabled: !!townId } as any });

  const buildSlot    = useBuildSlot();
  const upgradeSlot  = useUpgradeSlot();
  const demolishSlot = useDemolishSlot();

  const [selectedSlotType, setSelectedSlotType] = useState<string | null>(null);

  const slots = slotsRaw as Array<{ slotType: string; level: number; upgrading: boolean; upgradeEndsAt?: string | null }>;
  const slotMap = new Map(slots.map(s => [s.slotType, s]));

  const usableWidth = screenWidth - MAP_PADDING * 2;
  const tileW = Math.floor((usableWidth - TILE_GAP * 2) / 3);

  function getX(col: number, colSpan: number): { x: number; w: number } {
    const x = MAP_PADDING + col * (tileW + TILE_GAP);
    const w = colSpan * tileW + (colSpan - 1) * TILE_GAP;
    return { x, w };
  }

  function getY(row: number): number {
    if (row === 0) return MAP_PADDING;
    return MAP_PADDING + DEFENSE_HEIGHT + ROW_GAP + (row - 1) * (TILE_HEIGHT + ROW_GAP);
  }

  const mapHeight = MAP_PADDING * 2 + DEFENSE_HEIGHT + ROW_GAP + 4 * (TILE_HEIGHT + ROW_GAP);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetBuildingSlotsQueryKey(townId) });
    qc.invalidateQueries({ queryKey: getGetTownQueryKey(townId) });
  }, [qc, townId]);

  const handleTilePress = (slotType: string) => {
    setSelectedSlotType(slotType);
  };

  const selectedSlot = selectedSlotType ? slotMap.get(selectedSlotType) : null;
  const isEmpty = (selectedSlot?.level ?? 0) === 0;
  const isUpgrading = selectedSlot?.upgrading ?? false;
  const isMaxLevel = (selectedSlot?.level ?? 0) >= 10;

  const handleBuild = () => {
    if (!selectedSlotType) return;
    buildSlot.mutate({ townId, slotType: selectedSlotType as any }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedSlotType(null);
        invalidate();
      },
      onError: (e: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Build Failed", e?.response?.data?.error ?? e?.message ?? "Could not build");
      },
    });
  };

  const handleUpgrade = () => {
    if (!selectedSlotType) return;
    upgradeSlot.mutate({ townId, slotType: selectedSlotType as any }, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedSlotType(null);
        invalidate();
      },
      onError: (e: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Upgrade Failed", e?.response?.data?.error ?? e?.message ?? "Could not upgrade");
      },
    });
  };

  const handleDemolish = () => {
    if (!selectedSlotType) return;
    const name = SLOT_NAMES[selectedSlotType] ?? selectedSlotType;
    Alert.alert(
      `Demolish ${name}?`,
      `You'll receive 75% of the construction cost back. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Demolish",
          style: "destructive",
          onPress: () => {
            demolishSlot.mutate({ townId, slotType: selectedSlotType as any }, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setSelectedSlotType(null);
                invalidate();
              },
              onError: (e: any) => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert("Demolish Failed", e?.response?.data?.error ?? e?.message ?? "Could not demolish");
              },
            });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  const gold  = town?.gold  ?? 0;
  const food  = town?.food  ?? 0;
  const wood  = town?.wood  ?? 0;
  const stone = town?.stone ?? 0;

  function canAfford(slotType: string, level: number): boolean {
    const base = BASE_COSTS[slotType] ?? { wood: 0, stone: 0, gold: 0, food: 0 };
    const mult = Math.pow(1.8, level - 1);
    return (
      gold  >= Math.ceil(base.gold  * mult) &&
      food  >= Math.ceil(base.food  * mult) &&
      wood  >= Math.ceil(base.wood  * mult) &&
      stone >= Math.ceil(base.stone * mult)
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.mapContainer, { backgroundColor: colors.surface, height: mapHeight, width: screenWidth }]}>
          {/* Road decorations */}
          <View style={[styles.vRoad, { left: MAP_PADDING + tileW + TILE_GAP / 2 - 3, backgroundColor: colors.background + "aa", top: MAP_PADDING + DEFENSE_HEIGHT + ROW_GAP, height: mapHeight - MAP_PADDING - DEFENSE_HEIGHT - ROW_GAP }]} />
          <View style={[styles.vRoad, { left: MAP_PADDING + (tileW + TILE_GAP) * 2 - TILE_GAP / 2 - 3, backgroundColor: colors.background + "aa", top: MAP_PADDING + DEFENSE_HEIGHT + ROW_GAP, height: mapHeight - MAP_PADDING - DEFENSE_HEIGHT - ROW_GAP }]} />

          {Object.entries(LAYOUT).map(([slotType, pos]) => {
            const slot = slotMap.get(slotType) ?? { slotType, level: 0, upgrading: false, upgradeEndsAt: null };
            const { x, w } = getX(pos.col, pos.colSpan);
            const y = getY(pos.row);
            const tileH = pos.row === 0 ? DEFENSE_HEIGHT : TILE_HEIGHT;

            return (
              <SlotTile
                key={slotType}
                slot={slot}
                tileW={w}
                x={x}
                y={y}
                tileH={tileH}
                onPress={() => handleTilePress(slotType)}
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
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelectedSlotType(null)}>
          <View style={[styles.sheet, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            {selectedSlotType && (() => {
              const color = SLOT_COLORS[selectedSlotType] ?? "#7a7a6a";
              const icon  = SLOT_ICONS[selectedSlotType] ?? "help";
              const name  = SLOT_NAMES[selectedSlotType] ?? selectedSlotType;
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
                      <Text style={[styles.sheetLevel, { color: colors.textSecondary }]}>
                        {isEmpty ? "Empty Slot" : `Level ${level}${isMaxLevel ? " (Max)" : ""}`}
                      </Text>
                    </View>
                    {level > 0 && (
                      <View style={[styles.sheetLevelBadge, { backgroundColor: color + "22", borderColor: color + "66" }]}>
                        <Text style={[styles.sheetLevelText, { color }]}>{level}</Text>
                      </View>
                    )}
                  </View>

                  {level > 0 && (
                    <View style={[styles.sheetInfo, { backgroundColor: color + "11", borderColor: color + "33" }]}>
                      <Text style={[styles.sheetInfoText, { color: color }]}>
                        {SLOT_BONUS[selectedSlotType]?.(level) ?? `Level ${level}`}
                      </Text>
                      {isUpgrading && selectedSlot?.upgradeEndsAt && (
                        <Text style={[styles.sheetInfoText, { color: colors.gold }]}>
                          🔨 Under construction
                        </Text>
                      )}
                    </View>
                  )}

                  <View style={styles.sheetActions}>
                    {isEmpty && (
                      <TouchableOpacity
                        style={[styles.actionBtn, {
                          backgroundColor: canAfford(selectedSlotType, 1) ? color + "22" : colors.muted,
                          borderColor: canAfford(selectedSlotType, 1) ? color + "55" : colors.border,
                        }]}
                        onPress={handleBuild}
                        disabled={buildSlot.isPending || !canAfford(selectedSlotType, 1)}
                      >
                        <MaterialCommunityIcons name="hammer-wrench" size={16} color={canAfford(selectedSlotType, 1) ? color : colors.textSecondary} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.actionTitle, { color: canAfford(selectedSlotType, 1) ? colors.foreground : colors.textSecondary }]}>
                            Build {name}
                          </Text>
                          <Text style={[styles.actionCost, { color: colors.textSecondary }]}>
                            Cost: {formatCost(selectedSlotType, 1)}
                          </Text>
                        </View>
                        {buildSlot.isPending && <ActivityIndicator size="small" color={color} />}
                      </TouchableOpacity>
                    )}

                    {!isEmpty && !isMaxLevel && (
                      <TouchableOpacity
                        style={[styles.actionBtn, {
                          backgroundColor: (isUpgrading || !canAfford(selectedSlotType, nextLevel)) ? colors.muted : color + "22",
                          borderColor: (isUpgrading || !canAfford(selectedSlotType, nextLevel)) ? colors.border : color + "55",
                        }]}
                        onPress={handleUpgrade}
                        disabled={upgradeSlot.isPending || isUpgrading || !canAfford(selectedSlotType, nextLevel)}
                      >
                        <MaterialCommunityIcons name="arrow-up-bold-circle" size={16} color={isUpgrading || !canAfford(selectedSlotType, nextLevel) ? colors.textSecondary : color} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.actionTitle, { color: (isUpgrading || !canAfford(selectedSlotType, nextLevel)) ? colors.textSecondary : colors.foreground }]}>
                            {isUpgrading ? "Upgrading..." : `Upgrade to Level ${nextLevel}`}
                          </Text>
                          {!isUpgrading && (
                            <Text style={[styles.actionCost, { color: colors.textSecondary }]}>
                              Cost: {formatCost(selectedSlotType, nextLevel)}
                            </Text>
                          )}
                        </View>
                        {upgradeSlot.isPending && <ActivityIndicator size="small" color={color} />}
                      </TouchableOpacity>
                    )}

                    {!isEmpty && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#cc404011", borderColor: "#cc404033" }]}
                        onPress={handleDemolish}
                        disabled={demolishSlot.isPending}
                      >
                        <MaterialCommunityIcons name="delete-outline" size={16} color="#cc4040" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.actionTitle, { color: "#cc4040" }]}>Demolish</Text>
                          <Text style={[styles.actionCost, { color: colors.textSecondary }]}>
                            Refund: {formatCost(selectedSlotType, level)} × 75%
                          </Text>
                        </View>
                        {demolishSlot.isPending && <ActivityIndicator size="small" color="#cc4040" />}
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  mapContainer: { position: "relative" },
  vRoad: { position: "absolute", width: 6, borderRadius: 3 },
  tile: { borderRadius: 8, borderWidth: 1, padding: 8, flexDirection: "row", alignItems: "center", gap: 8, overflow: "hidden" },
  tileIconWrap: { width: 36, height: 36, borderRadius: 6, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  tileBody: { flex: 1, gap: 2 },
  tileName: { fontFamily: "Inter_600SemiBold", lineHeight: 14 },
  tileSubtext: { fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 13 },
  levelBadge: { position: "absolute", top: 5, right: 5, borderRadius: 4, borderWidth: 1, paddingHorizontal: 4, paddingVertical: 1 },
  levelText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  constructOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  constructEmoji: { fontSize: 20 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000099" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderWidth: 1, gap: 14, paddingBottom: 40 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  sheetIcon: { width: 54, height: 54, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetLevel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  sheetLevelBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  sheetLevelText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sheetInfo: { borderRadius: 8, borderWidth: 1, padding: 10, gap: 4 },
  sheetInfoText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sheetActions: { gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 10, borderWidth: 1, padding: 12 },
  actionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionCost: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
