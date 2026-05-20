import type { ResourceAmounts } from "@/lib/buildingMeta";

const LOOT_ROLL_MIN = 0.35;
const LOOT_ROLL_MAX = 1.65;

export function lootEstimateRange(base: number): { min: number; max: number } {
  if (base <= 0) return { min: 0, max: 0 };
  return {
    min: Math.max(1, Math.floor(base * LOOT_ROLL_MIN)),
    max: Math.max(1, Math.ceil(base * LOOT_ROLL_MAX)),
  };
}

export function formatLootRangeLabel(base: number): string | null {
  const { min, max } = lootEstimateRange(base);
  if (max <= 0) return null;
  if (min === max) return `${min}`;
  return `${min}–${max}`;
}

export function missionLootEstimateLabel(card: {
  lootGold: number;
  lootFood: number;
  lootWood: number;
  lootStone: number;
}): string {
  const parts: string[] = [];
  const g = formatLootRangeLabel(card.lootGold ?? 0);
  const f = formatLootRangeLabel(card.lootFood ?? 0);
  const w = formatLootRangeLabel(card.lootWood ?? 0);
  const s = formatLootRangeLabel(card.lootStone ?? 0);
  if (g) parts.push(`${g} gold`);
  if (f) parts.push(`${f} food`);
  if (w) parts.push(`${w} wood`);
  if (s) parts.push(`${s} stone`);
  return parts.length ? parts.join(" · ") : "Random spoils";
}

export type MissionActivityMetadata = {
  missionTitle: string;
  success: boolean;
  playerTroops: { infantry: number; archers: number; cavalry: number; mercenaries?: number; total: number };
  enemyTroops: { infantry: number; archers: number; cavalry: number; mercenaries?: number; total: number };
  loot?: ResourceAmounts;
  casualties?: number;
};

export function parseMissionActivityMetadata(raw: unknown): MissionActivityMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as MissionActivityMetadata;
  if (!m.missionTitle || typeof m.success !== "boolean" || !m.playerTroops || !m.enemyTroops) return null;
  return m;
}

export function formatTroopLine(side: {
  infantry: number;
  archers: number;
  cavalry: number;
  mercenaries?: number;
  total: number;
}): string {
  const parts: string[] = [];
  if (side.infantry) parts.push(`${side.infantry} inf`);
  if (side.archers) parts.push(`${side.archers} arch`);
  if (side.cavalry) parts.push(`${side.cavalry} cav`);
  if (side.mercenaries) parts.push(`${side.mercenaries} merc`);
  return parts.length ? `${parts.join(", ")} (${side.total})` : `${side.total} troops`;
}
