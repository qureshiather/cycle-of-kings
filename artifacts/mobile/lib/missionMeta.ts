import type { ResourceAmounts } from "@/lib/buildingMeta";
import type { ResourceKey } from "@/lib/resourceMeta";

const REWARD_TIER: Record<string, string> = {
  easy: "Low",
  medium: "Medium",
  hard: "High",
};

export function missionRewardTierLabel(difficulty: string): string {
  return REWARD_TIER[difficulty] ?? "Medium";
}

/** Top loot types for this card (bases are hidden; amounts roll on return). */
export function missionPossibleLootResources(
  card: { lootGold: number; lootFood: number; lootWood: number; lootStone: number },
  max = 2,
): ResourceKey[] {
  const ranked: { key: ResourceKey; base: number }[] = [
    { key: "gold", base: card.lootGold ?? 0 },
    { key: "food", base: card.lootFood ?? 0 },
    { key: "wood", base: card.lootWood ?? 0 },
    { key: "stone", base: card.lootStone ?? 0 },
  ];
  return ranked
    .filter((e) => e.base > 0)
    .sort((a, b) => b.base - a.base)
    .slice(0, max)
    .map((e) => e.key);
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
