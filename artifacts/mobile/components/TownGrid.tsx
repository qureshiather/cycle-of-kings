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

const BUILDING_META: Record<BuildingType, { icon: string; color: string; label: string; desc: string; }> = {
  farm:         { icon: "corn",            color: "#3d7a35", label: "Farm",          desc: "Food +5/hr per level" },
  mine:         { icon: "pickaxe",         color: "#c4a820", label: "Mine",          desc: "Gold +3/hr per level" },
  quarry:       { icon: "hammer",          color: "#7a7a6a", label: "Quarry",        desc: "Stone +4/hr per level" },
  lumberMill:   { icon: "axe",             color: "#6b4423", label: "Lumber Mill",   desc: "Wood +8/hr per level" },
  barracks:     { icon: "shield-sword",    color: "#8a3030", label: "Barracks",      desc: "Infantry +5 per level · upgrade = stronger troops" },
  archeryRange: { icon: "bow-arrow",       color: "#3d7a35", label: "Archery Range", desc: "Archers +5 per level · upgrade = stronger troops" },
  stables:      { icon: "horse",           color: "#c4a820", label: "Stables",       desc: "Cavalry +3 per level · upgrade = stronger troops" },
  market:       { icon: "store",           color: "#7a4a9a", label: "Market",        desc: "Gold +2/hr per level" },
  tavern:       { icon: "beer",            color: "#9a5a20", label: "Tavern",        desc: "Raises morale — future boost" },
  house:        { icon: "home",            color: "#2a5a8a", label: "House",         desc: "Army capacity +10 per level" },
  empty:        { icon: "plus",            color: "#444438", label: "Empty",         desc: "Tap to build" },
};

const BUILDING_TYPES: BuildingType[] = ["farm", "mine", "quarry", "lumberMill", "barracks", "archeryRange", "stables", "market", "tavern", "house"];
const BUILDING_COSTS: Record<BuildingType, string> = {
  farm:         "50 Wood, 20 Stone",
  mine:         "30 Wood, 50 Stone",
  quarry:       "20 Wood, 30 Stone",
  lumberMill:   "30 Stone",
  barracks:     "60 Wood, 40 Stone, 30 Gold",
  archeryRange: "50 Wood, 30 Stone, 20 Gold",
  stables:      "70 Wood, 20 Stone, 40 Gold, 10 Food",
  market:       "40 Wood, 20 Gold",
  tavern:       "50 Wood, 20 Stone, 10 Gold",
  house:        "30 Wood, 20 Stone",
  empty:        "",
};

const MILITARY_TYPES = new Set<BuildingType>(["barracks", "archeryRange", "stables"]);

function getCellsMap(cells: GridCellData[]): Map<string, GridCellData> {
  const map = new Map<string, GridCellData>();
  for (const cell of cells) map.set(`${cell.row}-${cell.col}`, cell);
  return map;
}

export default function TownGrid({ cells, onPlaceBuilding, onRemoveBuilding, onUpgradeBuilding, isLoading }: TownGridProps) {
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
                      ? (isBorder ? "#1e1c14" : "#17140e")
                      : meta.color + "33",
                    borderColor: isSelected ? colors.gold : (isBorder ? "#2a2820" : "#1e1c14"),
                    borderWidth: isSelected ? 1.5 : 0.5,
                  },
                ]}
              >
                {bType !== "empty" ? (
                  <View style={styles.cellContent}>
                    <MaterialCommunityIcons name={meta.icon as any} size={cellSize * 0.36} color={meta.color} />
                    {(c?.level ?? 1) > 1 && (
                      <Text style={[styles.levelBadge, { color: colors.gold, fontSize: cellSize * 0.18 }]}>
                        {c?.level}
                      </Text>
                    )}
                    {c?.upgrading && (
                      <View style={styles.upgradeDot} />
                    )}
                    {isMilitary && (
                      <View style={[styles.militaryDot, { backgroundColor: "#8a3030" }]} />
                    )}
                  </View>
                ) : (
                  isBorder && <View style={[styles.borderDot, { backgroundColor: "#2a2820" }]} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {selectedCell && !isEmpty && cell && (
        <View style={[styles.infoBar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={styles.infoLeft}>
            <MaterialCommunityIcons name={BUILDING_META[cell.buildingType as BuildingType].icon as any} size={22} color={BUILDING_META[cell.buildingType as BuildingType].color} />
            <View>
              <Text style={[styles.infoTitle, { color: colors.foreground }]}>
                {BUILDING_META[cell.buildingType as BuildingType].label} (Lv {cell.level})
              </Text>
              <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
                {BUILDING_META[cell.buildingType as BuildingType].desc}
              </Text>
            </View>
          </View>
          <View style={styles.infoActions}>
            {!cell.upgrading && cell.level < 10 && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.gold + "22", borderColor: colors.gold }]}
                onPress={() => { onUpgradeBuilding?.(selectedCell.row, selectedCell.col); setSelectedCell(null); }}
              >
                <MaterialCommunityIcons name="arrow-up-bold" size={16} color={colors.gold} />
              </TouchableOpacity>
            )}
            {cell.upgrading && (
              <View style={[styles.actionBtn, { backgroundColor: colors.muted }]}>
                <MaterialCommunityIcons name="timer-sand" size={16} color={colors.textSecondary} />
              </View>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.destructive + "22", borderColor: colors.destructive }]}
              onPress={() => { onRemoveBuilding?.(selectedCell.row, selectedCell.col); setSelectedCell(null); }}
            >
              <MaterialCommunityIcons name="delete-outline" size={16} color={colors.destructive} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.muted }]} onPress={() => setSelectedCell(null)}>
              <MaterialCommunityIcons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal visible={showBuildMenu} transparent animationType="slide" onRequestClose={() => setShowBuildMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowBuildMenu(false)}>
          <View style={[styles.buildMenu, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.buildMenuTitle, { color: colors.foreground }]}>Place Building</Text>
            <Text style={[styles.buildMenuSub, { color: colors.textSecondary }]}>Military buildings auto-generate units</Text>
            <ScrollView>
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
                    <View style={[styles.buildIcon, { backgroundColor: meta.color + "22" }]}>
                      <MaterialCommunityIcons name={meta.icon as any} size={24} color={meta.color} />
                    </View>
                    <View style={styles.buildOptionText}>
                      <View style={styles.buildOptionNameRow}>
                        <Text style={[styles.buildOptionName, { color: colors.foreground }]}>{meta.label}</Text>
                        {isMil && (
                          <View style={[styles.militaryBadge, { backgroundColor: "#8a3030" + "33" }]}>
                            <Text style={[styles.militaryBadgeText, { color: "#8a3030" }]}>MILITARY</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.buildOptionDesc, { color: colors.textSecondary }]}>{meta.desc}</Text>
                      <Text style={[styles.buildOptionCost, { color: colors.gold }]}>{BUILDING_COSTS[bType]}</Text>
                    </View>
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
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { alignItems: "center", justifyContent: "center" },
  cellContent: { alignItems: "center", justifyContent: "center", position: "relative" },
  levelBadge: { position: "absolute", bottom: -4, right: -4, fontFamily: "Inter_700Bold" },
  upgradeDot: { position: "absolute", top: -2, right: -2, width: 6, height: 6, borderRadius: 3, backgroundColor: "#d4a520" },
  militaryDot: { position: "absolute", top: -2, left: -2, width: 5, height: 5, borderRadius: 2.5 },
  borderDot: { width: 3, height: 3, borderRadius: 1.5 },
  infoBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, marginTop: 8, borderRadius: 8, borderWidth: 1, width: "100%", gap: 8 },
  infoLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  infoTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  infoDesc: { fontSize: 11, fontFamily: "Inter_400Regular" },
  infoActions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 6, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000088" },
  buildMenu: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, borderWidth: 1, maxHeight: "75%" },
  buildMenuTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  buildMenuSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 12 },
  buildOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  buildIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  buildOptionText: { flex: 1 },
  buildOptionNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  buildOptionName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  militaryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  militaryBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  buildOptionDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  buildOptionCost: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
