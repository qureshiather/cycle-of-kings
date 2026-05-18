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
  house: (l) => `+${l * 10} capacity`,
  tavern: (l) => `+${Math.round(l * 2.5)} morale`,
  townHall: (l) => `+${l * 3} gold/h`,
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
  stables: { wood: 70, stone: 20, gold: 40, food: 10 },
  market: { wood: 40, stone: 0, gold: 20, food: 0 },
  tavern: { wood: 50, stone: 20, gold: 10, food: 0 },
  house: { wood: 30, stone: 20, gold: 0, food: 0 },
  townHall: { wood: 80, stone: 60, gold: 50, food: 20 },
  wall: { wood: 0, stone: 40, gold: 0, food: 0 },
  tower: { wood: 20, stone: 60, gold: 20, food: 0 },
};

export function formatCost(slotType: string, targetLevel: number): string {
  const base = BASE_COSTS[slotType] ?? { wood: 0, stone: 0, gold: 0, food: 0 };
  const mult = Math.pow(1.8, targetLevel - 1);
  const parts: string[] = [];
  const g = Math.ceil(base.gold * mult);
  if (g > 0) parts.push(`${g}G`);
  const f = Math.ceil(base.food * mult);
  if (f > 0) parts.push(`${f}F`);
  const w = Math.ceil(base.wood * mult);
  if (w > 0) parts.push(`${w}W`);
  const s = Math.ceil(base.stone * mult);
  if (s > 0) parts.push(`${s}St`);
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
