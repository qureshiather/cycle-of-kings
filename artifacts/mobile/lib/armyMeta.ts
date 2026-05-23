import type { ResourceAmounts } from "@/lib/buildingMeta";

/** Matches server RECRUIT_COST_PER_TROOP in gameEngine.ts */
export const RECRUIT_COST_PER_TROOP = {
  infantry: { gold: 3, food: 2 },
  archers: { gold: 4, food: 2 },
  cavalry: { gold: 6, food: 3 },
} as const;

export type ArmyUnitType = keyof typeof RECRUIT_COST_PER_TROOP;

/** Matches server TROOP_FOOD_UPKEEP */
export const TROOP_FOOD_UPKEEP_PER_HOUR = 0.4;

export function totalTroopCap(army: {
  capInfantry?: number;
  capArchers?: number;
  capCavalry?: number;
  totalCap?: number;
}): number {
  if (army.totalCap != null) return army.totalCap;
  return (army.capInfantry ?? 0) + (army.capArchers ?? 0) + (army.capCavalry ?? 0);
}

export function recruitCost(unit: ArmyUnitType, count: number): ResourceAmounts {
  const per = RECRUIT_COST_PER_TROOP[unit];
  return {
    gold: per.gold * count,
    food: per.food * count,
    wood: 0,
    stone: 0,
  };
}

export function formatUpkeepPerHour(amount: number): string {
  const rounded = Math.round(amount * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}
