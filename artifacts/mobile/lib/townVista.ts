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
  /** Continuous ground under the settlement — matches hills, not a separate slab. */
  terrain: string;
  meadow: string;
  meadowEdge: string;
  path: string;
  pathEdge: string;
  tileStroke: string;
  tree: string;
  treeDark: string;
  ambientIcon?: string;
  ambientCount: number;
};

/** Single land color for hills, terrain, and plots. */
function groundFromHill(hill: string): {
  terrain: string;
  meadow: string;
  meadowEdge: string;
  path: string;
  pathEdge: string;
  tileStroke: string;
} {
  return {
    terrain: hill,
    meadow: hill,
    meadowEdge: hill,
    path: hill,
    pathEdge: hill,
    tileStroke: hill,
  };
}

function blendHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const n = hex.replace("#", "").slice(0, 6);
    return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  const to = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to(mix(ar, br))}${to(mix(ag, bg))}${to(mix(ab, bb))}`;
}

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

  const base = (() => {
    switch (season) {
      case "spring":
        return {
          skyTop: isDark ? "#1a2838" : "#8ec8e8",
          skyMid: isDark ? "#142820" : "#a8d4b8",
          hill: isDark ? "#1c2818" : "#72a860",
          tree: palette.spring,
          treeDark: isDark ? "#2a4028" : "#3d6a38",
          ambientIcon: "flower-outline" as const,
          ambientCount: 5,
        };
      case "summer":
        return {
          skyTop: isDark ? "#283048" : "#6eb0e8",
          skyMid: isDark ? "#302818" : "#d8c878",
          hill: isDark ? "#282018" : "#8a9850",
          tree: palette.summer,
          treeDark: isDark ? "#3a3018" : "#6a7028",
          ambientIcon: "weather-sunny" as const,
          ambientCount: 1,
        };
      case "autumn":
        return {
          skyTop: isDark ? "#302820" : "#c8a078",
          skyMid: isDark ? "#281c14" : "#d8b888",
          hill: isDark ? "#2a2018" : "#a08048",
          tree: palette.autumn,
          treeDark: isDark ? "#3a2818" : "#7a5028",
          ambientIcon: "leaf" as const,
          ambientCount: 6,
        };
      case "winter":
        return {
          skyTop: isDark ? "#1c2838" : "#a8c0d8",
          skyMid: isDark ? "#243038" : "#b8c4d0",
          hill: isDark ? "#242c34" : "#8a98a8",
          tree: palette.winter,
          treeDark: isDark ? "#2a3848" : "#5a6878",
          ambientIcon: "snowflake" as const,
          ambientCount: 7,
        };
    }
  })();

  const ground = groundFromHill(base.hill);
  return {
    ...base,
    skyBottom: isDark ? base.hill : blendHex(base.hill, base.skyMid, 0.35),
    terrain: ground.terrain,
    meadow: ground.meadow,
    meadowEdge: ground.meadowEdge,
    path: ground.path,
    pathEdge: ground.pathEdge,
    tileStroke: ground.tileStroke,
  };
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
