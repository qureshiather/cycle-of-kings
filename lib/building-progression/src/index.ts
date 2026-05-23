export type SlotType =
  | "townHall"
  | "farm"
  | "mine"
  | "quarry"
  | "lumberMill"
  | "barracks"
  | "archeryRange"
  | "stables"
  | "spyGuild"
  | "shipyard"
  | "market"
  | "tavern"
  | "house"
  | "museum"
  | "monument"
  | "wall"
  | "tower";

export type SlotLike = {
  slotType: string;
  level: number;
  upgrading?: boolean;
  upgradeEndsAt?: string | Date | null;
};

/** Built and construction finished — troops/ships/spies only count when operational. */
export function isSlotOperational(slot: SlotLike | undefined): boolean {
  if ((slot?.level ?? 0) < 1) return false;
  if (!slot?.upgrading) return true;
  if (slot.upgradeEndsAt != null) {
    const end = slot.upgradeEndsAt instanceof Date ? slot.upgradeEndsAt : new Date(slot.upgradeEndsAt);
    if (!Number.isNaN(end.getTime()) && end <= new Date()) return true;
  }
  return false;
}

export type BuildingPrereq = {
  /** Minimum Town Hall level to build this for the first time. */
  townHallLevel: number;
  /** Other buildings that must exist at min level (only checked when building from empty). */
  requires?: { slot: SlotType; minLevel: number }[];
};

/**
 * First-time build requirements. Upgrades only need resources (once built).
 */
export const BUILD_REQUIREMENTS: Record<SlotType, BuildingPrereq> = {
  townHall: { townHallLevel: 1 },
  farm: { townHallLevel: 1 },
  house: { townHallLevel: 1 },
  lumberMill: { townHallLevel: 2 },
  quarry: { townHallLevel: 2 },
  mine: { townHallLevel: 2 },
  wall: { townHallLevel: 2 },
  market: { townHallLevel: 3 },
  tavern: { townHallLevel: 3 },
  barracks: { townHallLevel: 3, requires: [{ slot: "wall", minLevel: 1 }] },
  archeryRange: { townHallLevel: 4, requires: [{ slot: "barracks", minLevel: 1 }] },
  stables: { townHallLevel: 4, requires: [{ slot: "barracks", minLevel: 1 }] },
  spyGuild: { townHallLevel: 4, requires: [{ slot: "market", minLevel: 1 }] },
  shipyard: { townHallLevel: 4, requires: [{ slot: "lumberMill", minLevel: 1 }] },
  museum: { townHallLevel: 4, requires: [{ slot: "tavern", minLevel: 1 }] },
  monument: { townHallLevel: 5, requires: [{ slot: "museum", minLevel: 1 }] },
  tower: { townHallLevel: 5, requires: [{ slot: "wall", minLevel: 2 }] },
};

export type BuildingCategory = "production" | "army" | "culture";

export const BUILDING_CATEGORY_ORDER: BuildingCategory[] = ["production", "army", "culture"];

/** Buildings grouped for the kingdom UI. */
export const BUILDINGS_BY_CATEGORY: Record<BuildingCategory, SlotType[]> = {
  production: [
    "townHall",
    "farm",
    "house",
    "lumberMill",
    "quarry",
    "mine",
    "wall",
    "market",
    "tower",
  ],
  culture: ["tavern", "museum", "monument"],
  army: ["barracks", "archeryRange", "stables", "spyGuild", "shipyard"],
};

export const BUILDING_CATEGORY_LABELS: Record<BuildingCategory, string> = {
  production: "Production",
  culture: "Culture",
  army: "Army",
};

/** Flat display order (production, army, culture). */
export const BUILDING_GRID_ORDER: SlotType[] = BUILDING_CATEGORY_ORDER.flatMap(
  (category) => BUILDINGS_BY_CATEGORY[category],
);

export const MAX_CONCURRENT_MISSIONS = 3;
export const MAX_CONCURRENT_SPY_OPS = 2;

/** Active build/upgrade slots allowed by Town Hall level. */
export function getMaxConcurrentUpgrades(townHallLevel: number): number {
  if (townHallLevel <= 2) return 1;
  if (townHallLevel <= 4) return 2;
  return 3;
}

/** Best row for a slot type (highest level). Handles legacy duplicate DB rows. */
export function getSlotRecord(slots: SlotLike[], slotType: string): SlotLike | undefined {
  let best: SlotLike | undefined;
  for (const s of slots) {
    if (s.slotType !== slotType) continue;
    const lv = Number(s.level) || 0;
    const bestLv = Number(best?.level) || 0;
    if (!best || lv > bestLv || (lv === bestLv && best.upgrading && !s.upgrading)) best = s;
  }
  return best;
}

export function getTownHallLevel(slots: SlotLike[]): number {
  return slotLevel(slots, "townHall");
}

/** Active mission slots from Town Hall level (0 if no hall; capped at 3 at TH3+). */
export function getMaxActiveMissions(townHallLevel: number): number {
  if (townHallLevel < 1) return 0;
  return Math.min(townHallLevel, MAX_CONCURRENT_MISSIONS);
}

export function getMaxActiveMissionsFromSlots(slots: SlotLike[]): number {
  return getMaxActiveMissions(getTownHallLevel(slots));
}

export function getMaxActiveSpyOps(spyGuildLevel: number): number {
  if (spyGuildLevel < 1) return 0;
  return Math.min(spyGuildLevel, MAX_CONCURRENT_SPY_OPS);
}

function slotLevel(slots: SlotLike[], slotType: string): number {
  let max = 0;
  for (const s of slots) {
    if (s.slotType !== slotType) continue;
    const lv = Number(s.level) || 0;
    if (lv > max) max = lv;
  }
  return max;
}

const SLOT_LABELS: Record<SlotType, string> = {
  townHall: "Town Hall",
  farm: "Farm",
  mine: "Mine",
  quarry: "Quarry",
  lumberMill: "Lumber Mill",
  barracks: "Barracks",
  archeryRange: "Archery Range",
  stables: "Stables",
  spyGuild: "Spy Guild",
  shipyard: "Shipyard",
  market: "Market",
  tavern: "Tavern",
  house: "House",
  museum: "Museum",
  monument: "Monument",
  wall: "Town Wall",
  tower: "Watch Tower",
};

export function getBuildBlockReason(
  slotType: string,
  slots: SlotLike[],
): string | null {
  if (slotType === "townHall") {
    return slotLevel(slots, "townHall") > 0 ? "Already built" : null;
  }

  const req = BUILD_REQUIREMENTS[slotType as SlotType];
  if (!req) return "Unknown building";

  const th = getTownHallLevel(slots);
  if (th < req.townHallLevel) {
    return `Requires Town Hall ${req.townHallLevel}`;
  }

  for (const r of req.requires ?? []) {
    const lv = slotLevel(slots, r.slot);
    if (lv < r.minLevel) {
      return `Requires ${SLOT_LABELS[r.slot]} level ${r.minLevel}`;
    }
  }

  return null;
}

export function canFirstTimeBuild(slotType: string, slots: SlotLike[]): boolean {
  if (slotLevel(slots, slotType) > 0) return true;
  return getBuildBlockReason(slotType, slots) === null;
}

export function formatRequirementHint(slotType: SlotType): string {
  return formatRequirementParts(slotType).join(" · ");
}

/** Ordered requirement parts for UI (Town Hall first, then building prereqs). */
export function formatRequirementParts(slotType: SlotType): string[] {
  const req = BUILD_REQUIREMENTS[slotType];
  const parts: string[] = [`Town Hall ${req.townHallLevel}`];
  for (const r of req.requires ?? []) {
    parts.push(`${SLOT_LABELS[r.slot]} ${r.minLevel}`);
  }
  return parts;
}

/** Parts of {@link formatRequirementParts} the player has not satisfied yet (empty if buildable). */
export function getUnmetRequirementParts(slotType: SlotType, slots: SlotLike[]): string[] {
  const req = BUILD_REQUIREMENTS[slotType];
  const missing: string[] = [];
  const th = getTownHallLevel(slots);
  if (th < req.townHallLevel) {
    missing.push(`Town Hall ${req.townHallLevel}`);
  }
  for (const r of req.requires ?? []) {
    if (slotLevel(slots, r.slot) < r.minLevel) {
      missing.push(`${SLOT_LABELS[r.slot]} ${r.minLevel}`);
    }
  }
  return missing;
}

export function getSlotLabel(slotType: SlotType): string {
  return SLOT_LABELS[slotType];
}
