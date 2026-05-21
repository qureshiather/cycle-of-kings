import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from "react-native";
import {
  useGetBuildingSlots,
  useGetGameState,
  useGetTown,
  useGetTownArmy,
  useGetPlayerTrophies,
} from "@workspace/api-client-react";
import {
  BUILDING_SLOT_TYPES,
  getAchievementProgress,
  type TownAchievementSnapshot,
} from "@workspace/achievements";
import type { SlotType } from "@workspace/building-progression";
import { useGame } from "@/context/GameContext";
import IsoBuilding from "@/components/town-vista/IsoBuilding";
import IsoWallRing, { getWallColors } from "@/components/town-vista/IsoWallRing";
import TownVistaLandscape from "@/components/town-vista/TownVistaLandscape";
import TownVistaSkyVeil from "@/components/town-vista/TownVistaSkyVeil";
import VistaWalkers from "@/components/town-vista/VistaWalkers";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { getSlotColor } from "@/lib/buildingMeta";
import {
  getProductionTier,
  getSeasonTheme,
  getStructureSize,
  getTroopDotCount,
  getVistaPaintOrder,
  slotsToMap,
  VISTA_LAYOUT,
  type VistaSlot,
} from "@/lib/townVista";
import type { Season } from "@/lib/seasonMeta";

const H_PADDING = 16;
const ASPECT = 0.68;

type SlotKey = keyof typeof VISTA_LAYOUT;

function MilitaryCamp({
  left,
  top,
  infantry,
  archers,
  cavalry,
  colors,
  isDark,
}: {
  left: number;
  top: number;
  infantry: number;
  archers: number;
  cavalry: number;
  colors: ReturnType<typeof useColors>;
  isDark: boolean;
}) {
  const total = infantry + archers + cavalry;
  if (total === 0) return null;

  const tentColor = isDark ? "#4a3830" : "#8a7060";
  const tentRoof = isDark ? "#6a5048" : "#a08878";

  return (
    <View style={[styles.camp, { left, top }]}>
      <View style={styles.tents}>
        <View style={[styles.tent, { backgroundColor: tentColor }]}>
          <View style={[styles.tentRoof, { borderBottomColor: tentRoof }]} />
        </View>
        {(infantry > 0 || archers > 0) && (
          <View style={[styles.tent, { backgroundColor: tentColor, marginLeft: -4 }]}>
            <View style={[styles.tentRoof, { borderBottomColor: tentRoof }]} />
          </View>
        )}
      </View>
      <View style={styles.campTroops}>
        {[
          { icon: "shield", n: getTroopDotCount(infantry), c: colors.military },
          { icon: "bow-arrow", n: getTroopDotCount(archers), c: colors.food },
          { icon: "horse", n: getTroopDotCount(cavalry), c: colors.gold },
        ].map(
          ({ icon, n, c }) =>
            n > 0 && (
              <View key={icon} style={styles.campTroopRow}>
                {Array.from({ length: n }).map((_, i) => (
                  <MaterialCommunityIcons
                    key={i}
                    name={icon as any}
                    size={11}
                    color={c}
                    style={{ marginLeft: i > 0 ? -3 : 0 }}
                  />
                ))}
              </View>
            ),
        )}
      </View>
    </View>
  );
}

export default function TownVista({ townId }: { townId: number }) {
  const colors = useColors();
  const { withAlpha, isDark } = useTheme();

  const { data: slotsRaw = [], isLoading: slotsLoading } = useGetBuildingSlots(townId, {
    query: { enabled: !!townId, refetchInterval: 30_000 } as any,
  });
  const { data: town } = useGetTown(townId, { query: { enabled: !!townId } as any });
  const { data: army } = useGetTownArmy(townId, { query: { enabled: !!townId } as any });
  const { data: gameState } = useGetGameState({ query: { staleTime: 300_000 } as any });
  const { playerId } = useGame();
  const { data: trophies = [] } = useGetPlayerTrophies(playerId ?? 0, {
    query: { enabled: !!playerId } as any,
  });

  const screenW = Dimensions.get("window").width;
  const width = screenW - H_PADDING * 2;
  const height = Math.round(width * ASPECT);

  const slotMap = useMemo(() => slotsToMap(slotsRaw as VistaSlot[]), [slotsRaw]);
  const season = (gameState?.season ?? "spring") as Season;
  const theme = getSeasonTheme(season, {
    background: colors.background,
    spring: colors.spring,
    summer: colors.summer,
    autumn: colors.autumn,
    winter: colors.winter,
    isDark,
  });
  const foodTier = getProductionTier(town?.foodPerHour ?? 0);
  const goldTier = getProductionTier(town?.goldPerHour ?? 0);

  const wallLevel = slotMap.get("wall")?.level ?? 0;
  const farmLevel = slotMap.get("farm")?.level ?? 0;
  const economyScore = (town as { economyScore?: number })?.economyScore ?? 0;
  const populationCap = Math.round(town?.populationCap ?? 0);
  const paintOrder = getVistaPaintOrder();
  const builtCount = paintOrder.filter((t) => (slotMap.get(t)?.level ?? 0) > 0).length;
  const population = Math.round(town?.population ?? 0);
  const netFoodPerHour = Math.round(
    (town?.netFoodPerHour ?? (town?.foodPerHour ?? 0) - (town?.foodUpkeepPerHour ?? 0)),
  );
  const cycleNumber = gameState?.cycleNumber ?? 1;
  const unlockedThisCycle = new Set(
    trophies.filter((t) => t.cycleNumber === cycleNumber).map((t) => t.type),
  );

  const achievementSnapshot: TownAchievementSnapshot | null = town
    ? {
        gold: town.gold,
        food: town.food,
        wood: town.wood,
        stone: town.stone,
        peacefulMode: false,
        economyScore: (town as { economyScore?: number }).economyScore ?? 0,
        armyScore: army?.totalPower ?? 0,
        population: town.population ?? 0,
        slots: (slotsRaw as VistaSlot[]).map((s) => ({ slotType: s.slotType, level: s.level })),
      }
    : null;

  const progress = achievementSnapshot
    ? getAchievementProgress(achievementSnapshot, unlockedThisCycle)
    : [];
  const masterBuilderPct = progress.find((p) => p.id === "master_builder")?.percent ?? 0;
  const nearSkyline = paintOrder.some((t) => {
    const lv = slotMap.get(t)?.level ?? 0;
    return lv === 9;
  });

  if (slotsLoading && slotsRaw.length === 0) {
    return (
      <View style={[styles.loading, { width, height: height * 0.5 }]}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { width }]}>
      <View
        style={[
          styles.frame,
          {
            borderColor: withAlpha(colors[season] as string, 0.35),
            backgroundColor: theme.meadow,
            shadowColor: isDark ? "#000" : "#1a1612",
          },
        ]}
      >
        <View
          testID="town-vista-canvas"
          style={[styles.canvas, { width, height, backgroundColor: theme.skyBottom }]}
        >
          <TownVistaLandscape
            width={width}
            height={height}
            theme={theme}
            hasFarm={farmLevel > 0}
            foodTier={foodTier}
            showSun={season !== "winter"}
          />

          <View style={[styles.wallLayerBack, { width, height }]} pointerEvents="none">
            <IsoWallRing
              width={width}
              height={height}
              wallLevel={wallLevel}
              colors={getWallColors(theme.meadow, isDark)}
              depth="behind"
            />
          </View>

          <View style={[styles.skyVeil, { width, height }]} pointerEvents="none">
            <TownVistaSkyVeil width={width} height={height} theme={theme} />
          </View>

          {goldTier > 0 && (slotMap.get("mine")?.level ?? 0) > 0 && (
            <View style={[styles.spark, { left: width * 0.22, top: height * 0.38 }]}>
              <MaterialCommunityIcons name="gold" size={10 + goldTier} color={colors.gold} style={{ opacity: 0.5 }} />
            </View>
          )}

          {BUILDING_SLOT_TYPES.map((slotType) => {
            const pos = VISTA_LAYOUT[slotType as SlotKey];
            if (!pos) return null;
            const slot = slotMap.get(slotType);
            const level = slot?.level ?? 0;
            if (level <= 0) {
              return (
                <View
                  key={`ghost-${slotType}`}
                  style={{
                    position: "absolute",
                    left: width * pos.x - 10,
                    top: height * pos.y - 6,
                    width: 20,
                    height: 12,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: withAlpha(colors.textMuted, 0.5),
                    opacity: 0.45,
                    zIndex: Math.round(pos.y * 50),
                  }}
                />
              );
            }
            const { w, h } = getStructureSize(slotType as SlotType, level);
            const accent = getSlotColor(slotType, colors);
            const glow =
              (masterBuilderPct >= 80 && level > 0) || (nearSkyline && level === 9);
            return (
              <View
                key={slotType}
                style={{
                  position: "absolute",
                  left: width * pos.x - w / 2,
                  top: height * pos.y - h + 4,
                  alignItems: "center",
                  zIndex: Math.round(pos.y * 100),
                }}
              >
                {glow && (
                  <View
                    style={[
                      styles.achievementGlow,
                      { backgroundColor: withAlpha(colors.gold, 0.25) },
                    ]}
                  />
                )}
                <IsoBuilding
                  slotType={slotType as SlotType}
                  level={level}
                  upgrading={slot?.upgrading}
                  accentColor={accent}
                  width={w}
                  height={h}
                  isDark={isDark}
                />
              </View>
            );
          })}

          <MilitaryCamp
            left={width * 0.44}
            top={height * 0.74}
            infantry={army?.infantry ?? 0}
            archers={army?.archers ?? 0}
            cavalry={army?.cavalry ?? 0}
            colors={colors}
            isDark={isDark}
          />

          <View style={[styles.wallLayerFront, { width, height }]} pointerEvents="none">
            <IsoWallRing
              width={width}
              height={height}
              wallLevel={wallLevel}
              colors={getWallColors(theme.meadow, isDark)}
              depth="front"
            />
          </View>

          <VistaWalkers
            width={width}
            height={height}
            economyScore={economyScore}
            populationCap={populationCap}
            totalTroops={army?.totalTroops ?? 0}
            builtStructures={builtCount}
            isDark={isDark}
          />

          {/* Stats footer */}
          <View
            style={[
              styles.statsBar,
              {
                backgroundColor: withAlpha(colors.background, isDark ? 0.8 : 0.9),
                borderColor: withAlpha(colors.border, 0.8),
              },
            ]}
          >
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="account-group" size={11} color={colors.textSecondary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{population}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="sword-cross" size={11} color={colors.military} />
              <Text style={[styles.statValue, { color: colors.military }]}>{army?.totalTroops ?? 0}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statChip}>
              <MaterialCommunityIcons
                name="food-apple"
                size={11}
                color={netFoodPerHour >= 0 ? colors.food : colors.destructive}
              />
              <Text
                style={[
                  styles.statValue,
                  { color: netFoodPerHour >= 0 ? colors.food : colors.destructive },
                ]}
              >
                {netFoodPerHour >= 0 ? "+" : ""}
                {netFoodPerHour}/h
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignSelf: "center", marginBottom: 8 },
  frame: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  canvas: { position: "relative", overflow: "hidden" },
  wallLayerBack: { position: "absolute", left: 0, top: 0, zIndex: 40 },
  skyVeil: { position: "absolute", left: 0, top: 0, zIndex: 42 },
  wallLayerFront: { position: "absolute", left: 0, top: 0, zIndex: 195 },
  loading: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  achievementGlow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    top: -8,
    zIndex: -1,
  },
  statsBar: {
    position: "absolute",
    zIndex: 300,
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontSize: 11, fontFamily: "Inter_700Bold" },
  statDivider: { width: 1, height: 14 },
  camp: { position: "absolute", alignItems: "center" },
  tents: { flexDirection: "row", alignItems: "flex-end" },
  tent: {
    width: 22,
    height: 14,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  tentRoof: {
    position: "absolute",
    top: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderRightWidth: 13,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  campTroops: { flexDirection: "row", marginTop: 2, gap: 4 },
  campTroopRow: { flexDirection: "row" },
  spark: { position: "absolute" },
});
