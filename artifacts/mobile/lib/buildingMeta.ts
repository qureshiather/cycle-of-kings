import { getMaxActiveMissions } from "@workspace/building-progression";
import type { ColorPalette, SlotColorKey } from "@/constants/colors";

export const SLOT_NAMES: Record<string, string> = {
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
  spyGuild: "Spy Guild",
  shipyard: "Shipyard",
  museum: "Museum",
  monument: "Monument",
};

export const SLOT_ICONS: Record<string, string> = {
  townHall: "castle",
  farm: "sprout",
  mine: "pickaxe",
  quarry: "mine",
  lumberMill: "axe",
  barracks: "shield-sword",
  archeryRange: "bow-arrow",
  stables: "horse",
  market: "store",
  tavern: "glass-mug-variant",
  house: "home",
  wall: "wall",
  tower: "chess-rook",
  spyGuild: "incognito",
  shipyard: "ferry",
  museum: "bank",
  monument: "pillar",
};

/** Theme-aware building accent color. */
export function getSlotColor(slotType: string, palette: ColorPalette): string {
  const key = slotType as SlotColorKey;
  if (key in palette.slots) return palette.slots[key];
  return palette.gold;
}

export const SLOT_BONUS: Record<string, (level: number) => string> = {
  farm: (l) => `+${l * 5} food/h`,
  mine: (l) => `+${l * 3} gold/h`,
  quarry: (l) => `+${l * 4} stone/h`,
  lumberMill: (l) => `+${l * 8} wood/h`,
  market: (l) => `+${l * 2} gold/h`,
  barracks: (l) => `+${l * 5} Infantry`,
  archeryRange: (l) => `+${l * 5} Archers`,
  stables: (l) => `+${l * 3} Cavalry`,
  house: (l) => `+${l * 15} population cap`,
  tavern: (l) => `+${Math.round(l * 2.5)} morale · +${(l * 0.5).toFixed(1)} pop/h`,
  museum: (l) => `+${l * 6} morale · +${l} pop/h`,
  monument: (l) => `Wonder · +${l * 2} pop/h · score`,
  spyGuild: (l) => `+${l * 3} spies`,
  shipyard: (l) => `+${l * 2} ships`,
  townHall: (l) => {
    const missions = getMaxActiveMissions(l);
    const missionLabel = missions === 1 ? "1 mission" : `${missions} missions`;
    return `+${l * 3} gold/h · ${missionLabel}`;
  },
  wall: (l) => `+${l * 20} defense`,
  tower: (l) => `+${l * 30} defense`,
};

export const BASE_COSTS: Record<string, { wood: number; stone: number; gold: number; food: number }> = {
  farm: { wood: 50, stone: 20, gold: 0, food: 0 },
  mine: { wood: 30, stone: 50, gold: 0, food: 0 },
  quarry: { wood: 20, stone: 30, gold: 0, food: 0 },
  lumberMill: { wood: 0, stone: 30, gold: 0, food: 0 },
  barracks: { wood: 60, stone: 40, gold: 30, food: 0 },
  archeryRange: { wood: 50, stone: 30, gold: 20, food: 0 },
  stables: { wood: 70, stone: 20, gold: 40, food: 0 },
  market: { wood: 40, stone: 0, gold: 20, food: 0 },
  tavern: { wood: 50, stone: 20, gold: 10, food: 0 },
  house: { wood: 30, stone: 20, gold: 0, food: 0 },
  townHall: { wood: 80, stone: 60, gold: 50, food: 0 },
  wall: { wood: 0, stone: 40, gold: 0, food: 0 },
  tower: { wood: 20, stone: 60, gold: 20, food: 0 },
  spyGuild: { wood: 55, stone: 25, gold: 35, food: 0 },
  shipyard: { wood: 80, stone: 30, gold: 25, food: 0 },
  museum: { wood: 60, stone: 50, gold: 40, food: 0 },
  monument: { wood: 100, stone: 120, gold: 80, food: 0 },
};

export type ResourceAmounts = { gold: number; food: number; wood: number; stone: number };

export function getBuildingCost(slotType: string, targetLevel: number): ResourceAmounts {
  const base = BASE_COSTS[slotType] ?? { wood: 0, stone: 0, gold: 0, food: 0 };
  const mult = Math.pow(1.8, targetLevel - 1);
  return {
    gold: Math.ceil(base.gold * mult),
    food: Math.ceil(base.food * mult),
    wood: Math.ceil(base.wood * mult),
    stone: Math.ceil(base.stone * mult),
  };
}

export function formatCost(slotType: string, targetLevel: number): string {
  const cost = getBuildingCost(slotType, targetLevel);
  const parts: string[] = [];
  if (cost.gold > 0) parts.push(`${cost.gold}G`);
  if (cost.food > 0) parts.push(`${cost.food}F`);
  if (cost.wood > 0) parts.push(`${cost.wood}W`);
  if (cost.stone > 0) parts.push(`${cost.stone}St`);
  return parts.join(" · ") || "Free";
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Done";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
