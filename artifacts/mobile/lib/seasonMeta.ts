/** Season display + modifiers — keep in sync with `gameEngine.ts` getSeasonModifiers. */
export type Season = "spring" | "summer" | "autumn" | "winter";

export const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];

export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const SEASON_META: Record<
  Season,
  { icon: string; label: string; tagline: string }
> = {
  spring: { icon: "flower", label: "Spring", tagline: "Growth & harvest" },
  summer: { icon: "white-balance-sunny", label: "Summer", tagline: "Trade & prosperity" },
  autumn: { icon: "leaf", label: "Autumn", tagline: "Timber & stone" },
  winter: { icon: "snowflake", label: "Winter", tagline: "Hard times" },
};

export const SEASON_MODIFIERS: Record<
  Season,
  { gold: number; food: number; wood: number; stone: number }
> = {
  spring: { gold: 1.0, food: 1.3, wood: 1.2, stone: 1.0 },
  summer: { gold: 1.2, food: 1.1, wood: 1.0, stone: 1.0 },
  autumn: { gold: 1.0, food: 0.9, wood: 1.3, stone: 1.1 },
  winter: { gold: 0.9, food: 0.7, wood: 0.8, stone: 0.9 },
};

const RESOURCE_KEYS = ["gold", "food", "wood", "stone"] as const;
type ResourceKey = (typeof RESOURCE_KEYS)[number];

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  gold: "Gold",
  food: "Food",
  wood: "Wood",
  stone: "Stone",
};

export function getSeasonIndex(season: Season): number {
  return SEASON_ORDER.indexOf(season);
}

export function getSeasonProgress(cycleStartedAt: string, season: Season) {
  const seasonIndex = getSeasonIndex(season);
  const cycleStart = new Date(cycleStartedAt).getTime();
  const seasonStart = cycleStart + seasonIndex * MS_PER_WEEK;
  const seasonEnd = seasonStart + MS_PER_WEEK;
  const now = Date.now();
  const elapsed = Math.max(0, Math.min(MS_PER_WEEK, now - seasonStart));
  const progress = elapsed / MS_PER_WEEK;
  const dayOfSeason = Math.min(7, Math.floor(elapsed / MS_PER_DAY) + 1);
  const msRemaining = Math.max(0, seasonEnd - now);
  const daysRemaining = Math.ceil(msRemaining / MS_PER_DAY);
  return { seasonIndex, seasonStart, seasonEnd, progress, dayOfSeason, daysRemaining };
}

export function formatModifier(value: number): string {
  if (value === 1) return "—";
  const pct = Math.round((value - 1) * 100);
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

export function getActiveModifiers(mods: { gold: number; food: number; wood: number; stone: number }) {
  return RESOURCE_KEYS.filter((key) => mods[key] !== 1).map((key) => ({
    key,
    label: RESOURCE_LABELS[key],
    value: mods[key],
    text: formatModifier(mods[key]),
  }));
}

export function formatSeasonDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
