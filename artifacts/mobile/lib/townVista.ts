import type { SlotType } from "@workspace/building-progression";
import type { Season } from "@/lib/seasonMeta";

export type VistaSlot = { slotType: string; level: number; upgrading?: boolean };

/** Normalized positions (0–1) — base center on isometric tile grid. */
export const VISTA_LAYOUT: Record<SlotType, { x: number; y: number }> = {
  townHall: { x: 0.5, y: 0.5 },
  farm: { x: 0.2, y: 0.54 },
  lumberMill: { x: 0.35, y: 0.62 },
  quarry: { x: 0.14, y: 0.48 },
  mine: { x: 0.26, y: 0.44 },
  market: { x: 0.65, y: 0.5 },
  tavern: { x: 0.78, y: 0.56 },
  house: { x: 0.58, y: 0.6 },
  barracks: { x: 0.42, y: 0.66 },
  archeryRange: { x: 0.55, y: 0.7 },
  stables: { x: 0.68, y: 0.66 },
  tower: { x: 0.88, y: 0.46 },
  wall: { x: 0.5, y: 0.5 },
};

export const VISTA_RENDER_ORDER: SlotType[] = [
  "farm",
  "lumberMill",
  "quarry",
  "mine",
  "house",
  "market",
  "tavern",
  "barracks",
  "archeryRange",
  "stables",
  "tower",
  "townHall",
];

export type BuildingKind = "civic" | "production" | "military" | "defense";

export const BUILDING_KIND: Record<SlotType, BuildingKind> = {
  townHall: "civic",
  farm: "production",
  lumberMill: "production",
  quarry: "production",
  mine: "production",
  market: "civic",
  tavern: "civic",
  house: "civic",
  barracks: "military",
  archeryRange: "military",
  stables: "military",
  wall: "defense",
  tower: "defense",
};

export function getBuildingScale(level: number): number {
  if (level <= 0) return 0;
  if (level <= 3) return 0.82;
  if (level <= 6) return 0.94;
  if (level <= 9) return 1.05;
  return 1.15;
}

export function getStructureSize(slotType: SlotType, level: number): { w: number; h: number } {
  const scale = getBuildingScale(level);
  if (slotType === "townHall") return { w: 52 * scale, h: 60 * scale };
  if (slotType === "tower") return { w: 40 * scale, h: 54 * scale };
  if (slotType === "wall") return { w: 0, h: 0 };
  if (slotType === "farm") return { w: 46 * scale, h: 44 * scale };
  return { w: 42 * scale, h: 50 * scale };
}

/** Painter's order: south first, town hall last on top. */
export function getVistaPaintOrder(): SlotType[] {
  return [...VISTA_RENDER_ORDER].sort((a, b) => {
    if (a === "townHall") return 1;
    if (b === "townHall") return -1;
    return VISTA_LAYOUT[a].y - VISTA_LAYOUT[b].y;
  });
}

export function getProductionTier(perHour: number): 0 | 1 | 2 | 3 {
  if (perHour <= 0) return 0;
  if (perHour < 15) return 1;
  if (perHour < 40) return 2;
  return 3;
}

export function getTroopDotCount(count: number, cap = 5): number {
  if (count <= 0) return 0;
  if (count <= 5) return 1;
  if (count <= 15) return 2;
  if (count <= 35) return 3;
  if (count <= 60) return 4;
  return cap;
}

export type SeasonTheme = {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  hill: string;
  meadow: string;
  meadowEdge: string;
  path: string;
  pathEdge: string;
  tree: string;
  treeDark: string;
  ambientIcon?: string;
  ambientCount: number;
};

export type SeasonPalette = {
  background: string;
  spring: string;
  summer: string;
  autumn: string;
  winter: string;
  isDark: boolean;
};

export function getSeasonTheme(season: Season, palette: SeasonPalette): SeasonTheme {
  const { isDark } = palette;
  const meadowBase = isDark ? "#243020" : "#5a8a48";
  const meadowEdge = isDark ? "#1a2418" : "#4a7540";
  const pathBase = isDark ? "#3a3428" : "#c4b090";
  const pathEdge = isDark ? "#2a261c" : "#a89878";
  const hillBase = isDark ? "#1e1c16" : "#8ab070";

  switch (season) {
    case "spring":
      return {
        skyTop: isDark ? "#1a2838" : "#8ec8e8",
        skyMid: isDark ? "#142820" : "#b8dcc8",
        skyBottom: isDark ? "#121810" : "#e8f4e0",
        hill: isDark ? "#1c2818" : "#7ab868",
        meadow: meadowBase,
        meadowEdge,
        path: pathBase,
        pathEdge,
        tree: palette.spring,
        treeDark: isDark ? "#2a4028" : "#3d6a38",
        ambientIcon: "flower-outline",
        ambientCount: 5,
      };
    case "summer":
      return {
        skyTop: isDark ? "#283048" : "#6eb0e8",
        skyMid: isDark ? "#302818" : "#f0d888",
        skyBottom: isDark ? "#181410" : "#f8ecd0",
        hill: isDark ? "#282018" : "#c4a858",
        meadow: isDark ? "#2a3820" : "#6a9a50",
        meadowEdge: isDark ? "#1e2818" : "#568840",
        path: pathBase,
        pathEdge,
        tree: palette.summer,
        treeDark: isDark ? "#3a3018" : "#7a6020",
        ambientIcon: "weather-sunny",
        ambientCount: 1,
      };
    case "autumn":
      return {
        skyTop: isDark ? "#302820" : "#c8a078",
        skyMid: isDark ? "#281c14" : "#e8c8a0",
        skyBottom: isDark ? "#14100c" : "#f0e4d0",
        hill: isDark ? "#2a2018" : "#b88858",
        meadow: isDark ? "#2a2818" : "#8a7a48",
        meadowEdge: isDark ? "#1e1c12" : "#6a5a38",
        path: pathBase,
        pathEdge,
        tree: palette.autumn,
        treeDark: isDark ? "#3a2818" : "#8a5030",
        ambientIcon: "leaf",
        ambientCount: 6,
      };
    case "winter":
      return {
        skyTop: isDark ? "#1c2838" : "#a8c0d8",
        skyMid: isDark ? "#243038" : "#d0dce8",
        skyBottom: isDark ? "#121820" : "#e8eef4",
        hill: isDark ? "#242c34" : "#98a8b8",
        meadow: isDark ? "#2a3038" : "#b0b8c0",
        meadowEdge: isDark ? "#1c2228" : "#9098a0",
        path: isDark ? "#3a4048" : "#d0d4d8",
        pathEdge: isDark ? "#2a3038" : "#b0b4b8",
        tree: palette.winter,
        treeDark: isDark ? "#2a3848" : "#607080",
        ambientIcon: "snowflake",
        ambientCount: 7,
      };
  }
}

export function slotsToMap(slots: VistaSlot[]): Map<string, VistaSlot> {
  const map = new Map<string, VistaSlot>();
  for (const slot of slots) {
    const prev = map.get(slot.slotType);
    if (!prev || (slot.level ?? 0) > (prev.level ?? 0)) {
      map.set(slot.slotType, slot);
    }
  }
  return map;
}

/** @deprecated use getSeasonTheme */
export function getSeasonSky(season: Season, palette: SeasonPalette) {
  const t = getSeasonTheme(season, palette);
  return {
    skyTop: t.skyTop,
    skyBottom: t.skyBottom,
    ground: t.meadow,
    groundAccent: t.meadowEdge,
    ambientIcon: t.ambientIcon,
    ambientCount: t.ambientCount,
  };
}
