import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from "react-native";
import {
  useGetBuildingSlots,
  useGetGameState,
  useGetTown,
  useGetTownArmy,
} from "@workspace/api-client-react";
import type { SlotType } from "@workspace/building-progression";
import IsoBuilding from "@/components/town-vista/IsoBuilding";
import IsoWallRing, { getWallColors } from "@/components/town-vista/IsoWallRing";
import TownVistaLandscape from "@/components/town-vista/TownVistaLandscape";
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
import { getSeasonProgress, SEASON_META, type Season } from "@/lib/seasonMeta";

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
  const seasonMeta = SEASON_META[season];
  const seasonColor = colors[season] as string;
  const seasonProgress = gameState?.cycleStartedAt
    ? getSeasonProgress(gameState.cycleStartedAt, season)
    : null;

  const foodTier = getProductionTier(town?.foodPerHour ?? 0);
  const goldTier = getProductionTier(town?.goldPerHour ?? 0);

  const wallLevel = slotMap.get("wall")?.level ?? 0;
  const farmLevel = slotMap.get("farm")?.level ?? 0;
  const paintOrder = getVistaPaintOrder();
  const builtCount = paintOrder.filter((t) => (slotMap.get(t)?.level ?? 0) > 0).length;
  const totalPerHour =
    (town?.goldPerHour ?? 0) +
    (town?.foodPerHour ?? 0) +
    (town?.woodPerHour ?? 0) +
    (town?.stonePerHour ?? 0);

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
            borderColor: withAlpha(seasonColor, 0.35),
            backgroundColor: theme.skyBottom,
            shadowColor: isDark ? "#000" : "#1a1612",
          },
        ]}
      >
        <View style={[styles.canvas, { width, height, backgroundColor: theme.skyBottom }]}>
          <TownVistaLandscape
            width={width}
            height={height}
            theme={theme}
            hasFarm={farmLevel > 0}
            foodTier={foodTier}
            showSun={season !== "winter"}
          />

          <IsoWallRing
            width={width}
            height={height}
            wallLevel={wallLevel}
            colors={getWallColors(theme.hill, theme.meadow, isDark)}
          />

          {goldTier > 0 && (slotMap.get("mine")?.level ?? 0) > 0 && (
            <View style={[styles.spark, { left: width * 0.22, top: height * 0.38 }]}>
              <MaterialCommunityIcons name="gold" size={10 + goldTier} color={colors.gold} style={{ opacity: 0.5 }} />
            </View>
          )}

          {paintOrder.map((slotType) => {
            const slot = slotMap.get(slotType);
            const level = slot?.level ?? 0;
            if (level <= 0) return null;
            const pos = VISTA_LAYOUT[slotType as SlotKey];
            const { w, h } = getStructureSize(slotType as SlotType, level);
            const accent = getSlotColor(slotType, colors);
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

          {/* Season header */}
          <View
            style={[
              styles.seasonHeader,
              {
                backgroundColor: withAlpha(colors.background, isDark ? 0.72 : 0.88),
                borderColor: withAlpha(seasonColor, 0.35),
              },
            ]}
          >
            <View style={[styles.seasonIconWrap, { backgroundColor: withAlpha(seasonColor, 0.18) }]}>
              <MaterialCommunityIcons name={seasonMeta.icon as any} size={16} color={seasonColor} />
            </View>
            <View style={styles.seasonTextCol}>
              <Text style={[styles.seasonTitle, { color: colors.foreground }]}>{seasonMeta.label}</Text>
              <Text style={[styles.seasonSub, { color: colors.textSecondary }]}>{seasonMeta.tagline}</Text>
            </View>
            {seasonProgress && (
              <View style={styles.seasonProgressCol}>
                <Text style={[styles.seasonDay, { color: seasonColor }]}>
                  Day {seasonProgress.dayOfSeason}/7
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: withAlpha(seasonColor, 0.15) }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round(seasonProgress.progress * 100)}%`,
                        backgroundColor: seasonColor,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

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
              <MaterialCommunityIcons name="home-group" size={11} color={colors.textSecondary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{builtCount}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="sword-cross" size={11} color={colors.military} />
              <Text style={[styles.statValue, { color: colors.military }]}>{army?.totalTroops ?? 0}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statChip}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={11} color={colors.gold} />
              <Text style={[styles.statValue, { color: colors.gold }]}>+{Math.round(totalPerHour)}/h</Text>
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
  loading: { alignItems: "center", justifyContent: "center", alignSelf: "center" },
  seasonHeader: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  seasonIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  seasonTextCol: { flex: 1, gap: 1 },
  seasonTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  seasonSub: { fontSize: 10, fontFamily: "Inter_400Regular" },
  seasonProgressCol: { alignItems: "flex-end", gap: 4, minWidth: 72 },
  seasonDay: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  progressTrack: { width: 72, height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  statsBar: {
    position: "absolute",
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
