import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, Dimensions } from "react-native";
import { useColors } from "@/hooks/useColors";

export type BuildingType = "farm" | "mine" | "quarry" | "lumberMill" | "barracks" | "archeryRange" | "stables" | "market" | "tavern" | "house" | "empty";

export interface GridCellData {
  id: number;
  townId: number;
  row: number;
  col: number;
  buildingType: BuildingType;
  level: number;
  upgrading: boolean;
  upgradeEndsAt: string | null;
}

interface TownGridProps {
  cells: GridCellData[];
  onPlaceBuilding?: (row: number, col: number, type: BuildingType) => void;
  onRemoveBuilding?: (row: number, col: number) => void;
  onUpgradeBuilding?: (row: number, col: number) => void;
  isLoading?: boolean;
}

const GRID_SIZE = 9;
const UPGRADE_COST_MULT = 1.8;

const BUILDING_META: Record<BuildingType, { icon: string; color: string; label: string; desc: string }> = {
  farm:         { icon: "corn",         color: "#3d7a35", label: "Farm",          desc: "+5 Food/hr per level" },
  mine:         { icon: "pickaxe",      color: "#c4a820", label: "Mine",          desc: "+3 Gold/hr per level" },
  quarry:       { icon: "hammer",       color: "#7a7a6a", label: "Quarry",        desc: "+4 Stone/hr per level" },
  lumberMill:   { icon: "axe",          color: "#6b4423", label: "Lumber Mill",   desc: "+8 Wood/hr per level" },
  barracks:     { icon: "shield-sword", color: "#8a3030", label: "Barracks",      desc: "Infantry +5 per level" },
  archeryRange: { icon: "bow-arrow",    color: "#3d7a35", label: "Archery Range", desc: "Archers +5 per level" },
  stables:      { icon: "horse",        color: "#c4a820", label: "Stables",       desc: "Cavalry +3 per level" },
  market:       { icon: "store",        color: "#7a4a9a", label: "Market",        desc: "+2 Gold/hr per level" },
  tavern:       { icon: "beer",         color: "#9a5a20", label: "Tavern",        desc: "Morale boost" },
  house:        { icon: "home",         color: "#2a5a8a", label: "House",         desc: "+10 Army capacity per level" },
  empty:        { icon: "plus",         color: "#444438", label: "Empty",         desc: "Tap to build" },
};

const BUILDING_TYPES: BuildingType[] = ["farm", "mine", "quarry", "lumberMill", "barracks", "archeryRange", "stables", "market", "tavern", "house"];

const BUILDING_COSTS_NUM: Record<string, { wood: number; stone: number; gold: number; food: number }> = {
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
};

const BUILDING_COSTS_DISPLAY: Record<BuildingType, string> = {
  farm:         "50 Wood · 20 Stone",
  mine:         "30 Wood · 50 Stone",
  quarry:       "20 Wood · 30 Stone",
  lumberMill:   "30 Stone",
  barracks:     "60 Wood · 40 Stone · 30 Gold",
  archeryRange: "50 Wood · 30 Stone · 20 Gold",
  stables:      "70 Wood · 20 Stone · 40 Gold · 10 Food",
  market:       "40 Wood · 20 Gold",
  tavern:       "50 Wood · 20 Stone · 10 Gold",
  house:        "30 Wood · 20 Stone",
  empty:        "",
};

const MILITARY_TYPES = new Set<BuildingType>(["barracks", "archeryRange", "stables"]);

function calcUpgradeCost(bType: string, currentLevel: number): string {
  const base = BUILDING_COSTS_NUM[bType];
  if (!base) return "";
  const mult = Math.pow(UPGRADE_COST_MULT, currentLevel);
  const parts: string[] = [];
  if (base.gold) parts.push(`${Math.ceil(base.gold * mult)}G`);
  if (base.food) parts.push(`${Math.ceil(base.food * mult)}F`);
  if (base.wood) parts.push(`${Math.ceil(base.wood * mult)}W`);
  if (base.stone) parts.push(`${Math.ceil(base.stone * mult)}St`);
  return parts.join(" · ");
}

function getCellsMap(cells: GridCellData[]): Map<string, GridCellData> {
  const map = new Map<string, GridCellData>();
  for (const cell of cells) map.set(`${cell.row}-${cell.col}`, cell);
  return map;
}

export default function TownGrid({ cells, onPlaceBuilding, onRemoveBuilding, onUpgradeBuilding }: TownGridProps) {
  const colors = useColors();
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const cellMap = getCellsMap(cells);
  const screenW = Dimensions.get("window").width;
  const cellSize = Math.floor((screenW - 24) / GRID_SIZE);

  const handleCellPress = (row: number, col: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCell({ row, col });
    const cell = cellMap.get(`${row}-${col}`);
    if (!cell || cell.buildingType === "empty") setShowBuildMenu(true);
  };

  const cell = selectedCell ? cellMap.get(`${selectedCell.row}-${selectedCell.col}`) : null;
  const isEmpty = !cell || cell.buildingType === "empty";

  return (
    <View style={styles.wrapper}>
      <View style={[styles.gridOuter, { borderColor: colors.border }]}>
        <View style={[styles.grid, { width: cellSize * GRID_SIZE, height: cellSize * GRID_SIZE }]}>
          {Array.from({ length: GRID_SIZE }).map((_, row) =>
            Array.from({ length: GRID_SIZE }).map((_, col) => {
              const key = `${row}-${col}`;
              const c = cellMap.get(key);
              const bType: BuildingType = c?.buildingType as BuildingType ?? "empty";
              const meta = BUILDING_META[bType];
              const isSelected = selectedCell?.row === row && selectedCell?.col === col;
              const isBorder = row === 0 || row === GRID_SIZE - 1 || col === 0 || col === GRID_SIZE - 1;
              const isMilitary = MILITARY_TYPES.has(bType);

              return (
                <TouchableOpacity
                  key={key}
                  testID={`cell-${row}-${col}`}
                  onPress={() => handleCellPress(row, col)}
                  style={[
                    styles.cell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: bType === "empty"
                        ? (isBorder ? "#1c1910" : "#141108")
                        : meta.color + "2a",
                      borderColor: isSelected
                        ? colors.gold
                        : bType !== "empty"
                          ? meta.color + "50"
                          : (isBorder ? "#2a2820" : "#1c1910"),
                      borderWidth: isSelected ? 1.5 : 0.5,
                    },
                  ]}
                >
                  {bType !== "empty" ? (
                    <View style={styles.cellContent}>
                      <MaterialCommunityIcons name={meta.icon as any} size={cellSize * 0.38} color={meta.color} />
                      {(c?.level ?? 1) > 1 && (
                        <Text style={[styles.levelBadge, { color: colors.gold, fontSize: cellSize * 0.19 }]}>
                          {c?.level}
                        </Text>
                      )}
                      {c?.upgrading && <View style={styles.upgradeDot} />}
                      {isMilitary && <View style={[styles.militaryDot, { backgroundColor: "#8a3030" }]} />}
                    </View>
                  ) : (
                    isBorder && <View style={[styles.borderDot, { backgroundColor: "#333028" }]} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>

      {selectedCell && !isEmpty && cell && (
        <View style={[styles.infoBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={[styles.infoIconBox, { backgroundColor: BUILDING_META[cell.buildingType as BuildingType].color + "22" }]}>
            <MaterialCommunityIcons
              name={BUILDING_META[cell.buildingType as BuildingType].icon as any}
              size={24}
              color={BUILDING_META[cell.buildingType as BuildingType].color}
            />
          </View>
          <View style={styles.infoMid}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>
              {BUILDING_META[cell.buildingType as BuildingType].label}
              <Text style={[styles.infoLevel, { color: colors.gold }]}> Lv {cell.level}</Text>
            </Text>
            <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
              {BUILDING_META[cell.buildingType as BuildingType].desc}
            </Text>
            {!cell.upgrading && cell.level < 10 && (
              <Text style={[styles.infoCost, { color: colors.gold + "cc" }]}>
                ↑ Upgrade: {calcUpgradeCost(cell.buildingType, cell.level)}
              </Text>
            )}
            {cell.upgrading && (
              <Text style={[styles.infoCost, { color: colors.textSecondary }]}>⏳ Upgrading to Lv {cell.level}…</Text>
            )}
            {cell.level >= 10 && (
              <Text style={[styles.infoCost, { color: colors.gold }]}>★ Max Level</Text>
            )}
          </View>
          <View style={styles.infoActions}>
            {!cell.upgrading && cell.level < 10 && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.gold + "18", borderColor: colors.gold + "80" }]}
                onPress={() => { onUpgradeBuilding?.(selectedCell.row, selectedCell.col); setSelectedCell(null); }}
              >
                <MaterialCommunityIcons name="arrow-up-bold" size={15} color={colors.gold} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "80" }]}
              onPress={() => { onRemoveBuilding?.(selectedCell.row, selectedCell.col); setSelectedCell(null); }}
            >
              <MaterialCommunityIcons name="delete-outline" size={15} color={colors.destructive} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelectedCell(null)}
            >
              <MaterialCommunityIcons name="close" size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showBuildMenu} transparent animationType="slide" onRequestClose={() => setShowBuildMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBuildMenu(false)}>
          <View style={[styles.buildMenu, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={styles.buildMenuHeader}>
              <Text style={[styles.buildMenuTitle, { color: colors.foreground }]}>Place Building</Text>
              <View style={[styles.buildMenuPill, { backgroundColor: colors.surface }]}>
                <MaterialCommunityIcons name="sword-cross" size={11} color={colors.textSecondary} />
                <Text style={[styles.buildMenuPillText, { color: colors.textSecondary }]}>Military = auto troops</Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {BUILDING_TYPES.map(bType => {
                const meta = BUILDING_META[bType];
                const isMil = MILITARY_TYPES.has(bType);
                return (
                  <TouchableOpacity
                    key={bType}
                    style={[styles.buildOption, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      if (selectedCell) {
                        onPlaceBuilding?.(selectedCell.row, selectedCell.col, bType);
                        setShowBuildMenu(false);
                        setSelectedCell(null);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                    }}
                  >
                    <View style={[styles.buildIcon, { backgroundColor: meta.color + "22", borderColor: meta.color + "40", borderWidth: 1 }]}>
                      <MaterialCommunityIcons name={meta.icon as any} size={22} color={meta.color} />
                    </View>
                    <View style={styles.buildOptionText}>
                      <View style={styles.buildOptionNameRow}>
                        <Text style={[styles.buildOptionName, { color: colors.foreground }]}>{meta.label}</Text>
                        {isMil && (
                          <View style={[styles.militaryBadge, { backgroundColor: "#8a3030" + "28", borderColor: "#8a303055", borderWidth: 1 }]}>
                            <Text style={[styles.militaryBadgeText, { color: "#cc6060" }]}>⚔ MILITARY</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.buildOptionDesc, { color: colors.textSecondary }]}>{meta.desc}</Text>
                      <Text style={[styles.buildOptionCost, { color: colors.gold }]}>🏗 {BUILDING_COSTS_DISPLAY[bType]}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={colors.border} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center" },
  gridOuter: { borderRadius: 4, borderWidth: 1, overflow: "hidden" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { alignItems: "center", justifyContent: "center" },
  cellContent: { alignItems: "center", justifyContent: "center", position: "relative" },
  levelBadge: { position: "absolute", bottom: -4, right: -5, fontFamily: "Inter_700Bold" },
  upgradeDot: { position: "absolute", top: -3, right: -3, width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#d4a520" },
  militaryDot: { position: "absolute", top: -3, left: -3, width: 6, height: 6, borderRadius: 3 },
  borderDot: { width: 3, height: 3, borderRadius: 1.5 },
  infoBar: {
    flexDirection: "row", alignItems: "center",
    padding: 10, marginTop: 8, borderRadius: 10, borderWidth: 1,
    width: "100%", gap: 10,
  },
  infoIconBox: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  infoMid: { flex: 1 },
  infoTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoLevel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  infoDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  infoCost: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 2 },
  infoActions: { flexDirection: "row", gap: 6, flexShrink: 0 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000099" },
  buildMenu: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, borderWidth: 1, borderBottomWidth: 0, maxHeight: "78%" },
  buildMenuHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  buildMenuTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  buildMenuPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  buildMenuPillText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  buildOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderBottomWidth: 1 },
  buildIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buildOptionText: { flex: 1 },
  buildOptionNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  buildOptionName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  militaryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  militaryBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  buildOptionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  buildOptionCost: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 3 },
});
