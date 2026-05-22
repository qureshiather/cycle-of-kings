import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useGetBuildingSlots,
  useGetGameState,
  useGetTown,
  useGetTownArmy,
  useGetPlayerTrophies,
} from "@workspace/api-client-react";
import { getAchievementProgress, type TownAchievementSnapshot } from "@workspace/achievements";
import {
  formatRequirementHint,
  getBuildBlockReason,
  type SlotType,
} from "@workspace/building-progression";
import { useGame } from "@/context/GameContext";
import IsoBuilding from "@/components/town-vista/IsoBuilding";
import IsoWallRing, { getWallColors } from "@/components/town-vista/IsoWallRing";
import TownVistaLandscape from "@/components/town-vista/TownVistaLandscape";
import VistaCallout from "@/components/town-vista/VistaCallout";
import VistaSummaryChips from "@/components/town-vista/VistaSummaryChips";
import VistaWalkers from "@/components/town-vista/VistaWalkers";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/hooks/useTheme";
import { slotBuildStates } from "@/lib/buildableSlots";
import { getSlotColor, SLOT_BONUS, SLOT_ICONS, SLOT_NAMES } from "@/lib/buildingMeta";
import { normalizeResources } from "@/lib/resourceMeta";
import {
  getProductionTier,
  getSeasonTheme,
  getStructureSize,
  getTownTierLabel,
  getTroopDotCount,
  getVistaPaintOrder,
  slotsToMap,
  VISTA_LAYOUT,
  type VistaSlot,
} from "@/lib/townVista";
import type { Season } from "@/lib/seasonMeta";

const H_PADDING = 16;
const ASPECT = 0.78;

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

function ActionablePlotPulse({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  React.useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          borderRadius: 6,
          borderWidth: 2,
          borderColor: color,
          opacity: pulse,
        },
      ]}
    />
  );
}

export default function TownVista({ townId }: { townId: number }) {
  const colors = useColors();
  const { withAlpha, isDark } = useTheme();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

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
  const totalStructureSlots = paintOrder.length;
  const builtCount = paintOrder.filter((t) => (slotMap.get(t)?.level ?? 0) > 0).length;
  const upgradingCount = paintOrder.filter((t) => slotMap.get(t)?.upgrading).length;
  const tierLabel = getTownTierLabel(builtCount, economyScore);

  const owned = normalizeResources({
    gold: town?.gold ?? 0,
    food: town?.food ?? 0,
    wood: town?.wood ?? 0,
    stone: town?.stone ?? 0,
  });
  const buildStates = useMemo(
    () => slotBuildStates(slotsRaw as VistaSlot[], owned),
    [slotsRaw, owned],
  );
  const buildStateByType = useMemo(() => {
    const map = new Map<string, (typeof buildStates)[number]>();
    for (const state of buildStates) map.set(state.slotType, state);
    return map;
  }, [buildStates]);
  const actionableCount = buildStates.filter((s) => s.actionable).length;
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

  const selectedCallout = (() => {
    if (!selectedSlot) return null;
    const slotType = selectedSlot;
    const slot = slotMap.get(slotType);
    const level = slot?.level ?? 0;
    const name = SLOT_NAMES[slotType] ?? slotType;
    const icon = SLOT_ICONS[slotType] ?? "help";
    const accent = getSlotColor(slotType, colors);
    const buildState = buildStateByType.get(slotType);

    if (level > 0) {
      const bonus = SLOT_BONUS[slotType]?.(level);
      return {
        name,
        icon,
        accent,
        line1: slot?.upgrading ? "Upgrading…" : `Level ${level}`,
        line2: bonus,
        status: slot?.upgrading ? ("upgrading" as const) : ("built" as const),
      };
    }

    const lockReason = getBuildBlockReason(slotType as SlotType, [...slotMap.values()]);
    if (buildState?.actionable) {
      return {
        name,
        icon,
        accent,
        line1: "Ready to build",
        line2: "Close map and tap this building on your Kingdom tab",
        status: "ready" as const,
      };
    }
    if (lockReason) {
      return {
        name,
        icon,
        accent,
        line1: "Locked",
        line2: formatRequirementHint(slotType as SlotType),
        status: "locked" as const,
      };
    }
    return {
      name,
      icon,
      accent,
      line1: "Empty plot",
      line2: buildState?.canAfford ? "Needs resources" : "Unlock prerequisites first",
      status: "empty" as const,
    };
  })();

  return (
    <View style={[styles.wrapper, { width }]}>
      <VistaSummaryChips
        tierLabel={tierLabel}
        builtCount={builtCount}
        totalSlots={totalStructureSlots}
        actionableCount={actionableCount}
        upgradingCount={upgradingCount}
        season={season}
      />
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

          <View style={[styles.wallLayer, { width, height }]} pointerEvents="none">
            <IsoWallRing
              width={width}
              height={height}
              wallLevel={wallLevel}
              colors={getWallColors(theme.meadow, isDark)}
              depth="behind"
            />
          </View>

          {goldTier > 0 && (slotMap.get("mine")?.level ?? 0) > 0 && (
            <View style={[styles.spark, { left: width * 0.28, top: height * 0.47 }]}>
              <MaterialCommunityIcons name="gold" size={10 + goldTier} color={colors.gold} style={{ opacity: 0.5 }} />
            </View>
          )}

          {paintOrder.map((slotType) => {
            const pos = VISTA_LAYOUT[slotType as SlotKey];
            if (!pos) return null;
            const slot = slotMap.get(slotType);
            const level = slot?.level ?? 0;
            const buildState = buildStateByType.get(slotType);
            const isSelected = selectedSlot === slotType;

            if (level <= 0) {
              const actionable = buildState?.actionable ?? false;
              const ready = buildState?.ready ?? false;
              const plotW = actionable ? 28 : 22;
              const plotH = actionable ? 18 : 14;
              return (
                <Pressable
                  key={`ghost-${slotType}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedSlot((prev) => (prev === slotType ? null : slotType));
                  }}
                  hitSlop={8}
                  style={{
                    position: "absolute",
                    left: width * pos.x - plotW / 2,
                    top: height * pos.y - plotH / 2,
                    width: plotW,
                    height: plotH,
                    borderRadius: 6,
                    borderWidth: actionable ? 2 : 1,
                    borderStyle: "dashed",
                    borderColor: actionable
                      ? colors.gold
                      : ready
                        ? withAlpha(colors.gold, 0.45)
                        : withAlpha(colors.textMuted, 0.5),
                    backgroundColor: actionable
                      ? withAlpha(colors.gold, 0.12)
                      : withAlpha(colors.textMuted, 0.06),
                    opacity: actionable ? 1 : 0.5,
                    zIndex: Math.round(pos.y * 50) + (isSelected ? 120 : 0),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {actionable && <ActionablePlotPulse color={colors.gold} />}
                  {actionable && (
                    <MaterialCommunityIcons name="hammer-wrench" size={12} color={colors.gold} />
                  )}
                </Pressable>
              );
            }
            const { w, h } = getStructureSize(slotType as SlotType, level);
            const accent = getSlotColor(slotType, colors);
            const glow =
              (masterBuilderPct >= 80 && level > 0) || (nearSkyline && level === 9);
            return (
              <Pressable
                key={slotType}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedSlot((prev) => (prev === slotType ? null : slotType));
                }}
                style={{
                  position: "absolute",
                  left: width * pos.x - w / 2,
                  top: height * pos.y - h + 4,
                  alignItems: "center",
                  zIndex: Math.round(pos.y * 100) + (isSelected ? 120 : 0),
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
                {isSelected && (
                  <View
                    style={[
                      styles.selectionRing,
                      { borderColor: withAlpha(colors.gold, 0.7) },
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
              </Pressable>
            );
          })}

          {selectedCallout && (
            <View style={[styles.calloutLayer, { top: height * 0.06, left: 10, right: 10 }]}>
              <VistaCallout
                name={selectedCallout.name}
                icon={selectedCallout.icon}
                accentColor={selectedCallout.accent}
                line1={selectedCallout.line1}
                line2={selectedCallout.line2}
                status={selectedCallout.status}
                onDismiss={() => setSelectedSlot(null)}
              />
            </View>
          )}

          <MilitaryCamp
            left={width * 0.44}
            top={height * 0.73}
            infantry={army?.infantry ?? 0}
            archers={army?.archers ?? 0}
            cavalry={army?.cavalry ?? 0}
            colors={colors}
            isDark={isDark}
          />

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
      <Text style={[styles.tapHint, { color: colors.textMuted }]}>
        Tap a building or empty plot to see details
      </Text>
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
  wallLayer: { position: "absolute", left: 0, top: 0, zIndex: 50 },
  loading: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  achievementGlow: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    top: -8,
    zIndex: -1,
  },
  selectionRing: {
    position: "absolute",
    width: "108%",
    height: "108%",
    borderRadius: 12,
    borderWidth: 2,
    zIndex: 20,
  },
  calloutLayer: {
    position: "absolute",
    zIndex: 250,
    alignItems: "center",
  },
  tapHint: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
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
