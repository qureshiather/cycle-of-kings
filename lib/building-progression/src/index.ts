export type SlotType =
  | "townHall"
  | "farm"
  | "mine"
  | "quarry"
  | "lumberMill"
  | "barracks"
  | "archeryRange"
  | "stables"
  | "market"
  | "tavern"
  | "house"
  | "wall"
  | "tower";

export type SlotLike = { slotType: string; level: number };

export type BuildingPrereq = {
  /** Minimum Town Hall level to build this for the first time. */
  townHallLevel: number;
  /** Other buildings that must exist at min level (only checked when building from empty). */
  requires?: { slot: SlotType; minLevel: number }[];
};

/**
 * First-time build requirements. Upgrades only need resources (once built).
 *
 * Progression:
 *   TH 1 — Town Hall (start), Farm, House
 *   TH 2 — Lumber Mill, Quarry, Mine, Wall
 *   TH 3 — Market, Tavern, Barracks (+ Wall)
 *   TH 4 — Archery Range, Stables (+ Barracks)
 *   TH 5 — Watch Tower (+ Wall 2)
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
  tower: { townHallLevel: 5, requires: [{ slot: "wall", minLevel: 2 }] },
};

export type BuildingCategory = "production" | "army";

export const BUILDING_CATEGORY_ORDER: BuildingCategory[] = ["production", "army"];

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
    "tavern",
    "tower",
  ],
  army: ["barracks", "archeryRange", "stables"],
};

export const BUILDING_CATEGORY_LABELS: Record<BuildingCategory, string> = {
  production: "Production",
  army: "Army",
};

/** Flat display order (production, then army). */
export const BUILDING_GRID_ORDER: SlotType[] = BUILDING_CATEGORY_ORDER.flatMap(
  (category) => BUILDINGS_BY_CATEGORY[category],
);

export const MAX_CONCURRENT_MISSIONS = 3;

export function getTownHallLevel(slots: SlotLike[]): number {
  const hall = slots.find((s) => s.slotType === "townHall");
  return Math.max(1, hall?.level ?? 1);
}

/** Active mission slots from Town Hall level (1 at TH1, capped at 3 at TH3+). */
export function getMaxActiveMissions(townHallLevel: number): number {
  return Math.min(Math.max(1, townHallLevel), MAX_CONCURRENT_MISSIONS);
}

export function getMaxActiveMissionsFromSlots(slots: SlotLike[]): number {
  return getMaxActiveMissions(getTownHallLevel(slots));
}

function slotLevel(slots: SlotLike[], slotType: string): number {
  return slots.find((s) => s.slotType === slotType)?.level ?? 0;
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
  market: "Market",
  tavern: "Tavern",
  house: "House",
  wall: "Town Wall",
  tower: "Watch Tower",
};

export function getBuildBlockReason(
  slotType: string,
  slots: SlotLike[],
): string | null {
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
  if (slotType === "townHall") return false;
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
