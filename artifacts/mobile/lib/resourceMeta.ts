import type { ResourceAmounts } from "@/lib/buildingMeta";

export type ResourceKey = keyof ResourceAmounts;

export const RESOURCE_META: Record<
  ResourceKey,
  { icon: string; label: string; colorKey: ResourceKey | "gold" }
> = {
  gold: { icon: "gold", label: "Gold", colorKey: "gold" },
  food: { icon: "food-apple", label: "Food", colorKey: "food" },
  wood: { icon: "tree", label: "Wood", colorKey: "wood" },
  stone: { icon: "cube-outline", label: "Stone", colorKey: "stone" },
};

export const RESOURCE_ORDER: ResourceKey[] = ["gold", "food", "wood", "stone"];

/** Whole resources only — balances from production tick as floats on the server. */
export function floorResource(n: number): number {
  return Math.max(0, Math.floor(n));
}

export function normalizeResources(r: ResourceAmounts): ResourceAmounts {
  return {
    gold: floorResource(r.gold),
    food: floorResource(r.food),
    wood: floorResource(r.wood),
    stone: floorResource(r.stone),
  };
}

export function formatResourceAmount(n: number): string {
  const whole = floorResource(n);
  if (whole >= 1_000_000) return `${(whole / 1_000_000).toFixed(1)}M`;
  if (whole >= 10_000) return `${(whole / 1_000).toFixed(1)}k`;
  return String(whole);
}

/** Signed hourly rate (e.g. net food); negatives are not clamped to zero. */
export function formatResourceRate(n: number): string {
  if (n === 0) return "0";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  const rounded = Math.round(abs * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) return `${sign}${Math.round(rounded)}`;
  return `${sign}${rounded.toFixed(1)}`;
}

export function getNonZeroCosts(cost: ResourceAmounts): { key: ResourceKey; amount: number }[] {
  return RESOURCE_ORDER.filter((key) => cost[key] > 0).map((key) => ({ key, amount: cost[key] }));
}

export function singleResourceAmount(res: ResourceKey, amount: number): ResourceAmounts {
  return {
    gold: res === "gold" ? amount : 0,
    food: res === "food" ? amount : 0,
    wood: res === "wood" ? amount : 0,
    stone: res === "stone" ? amount : 0,
  };
}

export function canAffordCost(cost: ResourceAmounts, owned: ResourceAmounts): boolean {
  const have = normalizeResources(owned);
  return (
    have.gold >= cost.gold &&
    have.food >= cost.food &&
    have.wood >= cost.wood &&
    have.stone >= cost.stone
  );
}
