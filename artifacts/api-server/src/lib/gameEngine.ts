export const BUILDING_COSTS: Record<string, { wood: number; stone: number; gold: number; food: number }> = {
  farm:        { wood: 50,  stone: 20,  gold: 0,  food: 0 },
  mine:        { wood: 30,  stone: 50,  gold: 0,  food: 0 },
  quarry:      { wood: 20,  stone: 30,  gold: 0,  food: 0 },
  lumberMill:  { wood: 0,   stone: 30,  gold: 0,  food: 0 },
  barracks:    { wood: 60,  stone: 40,  gold: 30, food: 0 },
  market:      { wood: 40,  stone: 0,   gold: 20, food: 0 },
  tavern:      { wood: 50,  stone: 20,  gold: 10, food: 0 },
  house:       { wood: 30,  stone: 20,  gold: 0,  food: 0 },
  wall:        { wood: 0,   stone: 30,  gold: 0,  food: 0 },
  tower:       { wood: 20,  stone: 50,  gold: 10, food: 0 },
};

export const UPGRADE_COST_MULTIPLIER = 1.8;
export const REFUND_RATIO = 0.75;
export const GRID_SIZE = 9;

export const BASE_PRODUCTION = { gold: 5, food: 5, wood: 5, stone: 5 };

export const PRODUCTION_RATES: Record<string, { food: number; gold: number; wood: number; stone: number }> = {
  farm:       { food: 5,  gold: 0, wood: 0,  stone: 0 },
  mine:       { food: 0,  gold: 3, wood: 0,  stone: 0 },
  quarry:     { food: 0,  gold: 0, wood: 0,  stone: 4 },
  lumberMill: { food: 0,  gold: 0, wood: 8,  stone: 0 },
  market:     { food: 0,  gold: 2, wood: 0,  stone: 0 },
  barracks:   { food: 0,  gold: 0, wood: 0,  stone: 0 },
  tavern:     { food: 0,  gold: 0, wood: 0,  stone: 0 },
  house:      { food: 0,  gold: 0, wood: 0,  stone: 0 },
  empty:      { food: 0,  gold: 0, wood: 0,  stone: 0 },
};

export type Season = "spring" | "summer" | "autumn" | "winter";

const SEASON_EPOCH = new Date("2024-01-01T00:00:00Z");
const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30;

export function getCurrentSeasonInfo(): { season: Season; cycleNumber: number; monthIndex: number; cycleStartedAt: string; nextWipeAt: string } {
  const now = new Date();
  const monthsSinceEpoch = Math.floor((now.getTime() - SEASON_EPOCH.getTime()) / MS_PER_MONTH);
  const monthIndex = ((monthsSinceEpoch % 4) + 4) % 4;
  const cycleNumber = Math.floor(monthsSinceEpoch / 4) + 1;
  const seasons: Season[] = ["spring", "summer", "autumn", "winter"];
  const season = seasons[monthIndex];

  const cycleStartMs = SEASON_EPOCH.getTime() + (cycleNumber - 1) * 4 * MS_PER_MONTH;
  const nextWipeMs = cycleStartMs + 4 * MS_PER_MONTH;

  return {
    season,
    cycleNumber,
    monthIndex,
    cycleStartedAt: new Date(cycleStartMs).toISOString(),
    nextWipeAt: new Date(nextWipeMs).toISOString(),
  };
}

export function getSeasonModifiers(season: Season): { gold: number; food: number; wood: number; stone: number } {
  switch (season) {
    case "spring": return { gold: 1.0, food: 1.3, wood: 1.2, stone: 1.0 };
    case "summer": return { gold: 1.2, food: 1.1, wood: 1.0, stone: 1.0 };
    case "autumn": return { gold: 1.0, food: 0.9, wood: 1.3, stone: 1.1 };
    case "winter": return { gold: 0.9, food: 0.7, wood: 0.8, stone: 0.9 };
  }
}

export function getSeasonName(season: Season): string {
  return season.charAt(0).toUpperCase() + season.slice(1);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0xffffffff;
  };
}

export function getCurrentWeatherEvent(): { event: string | null; active: boolean } {
  const now = new Date();
  const seed = now.getUTCFullYear() * 10000 + now.getUTCMonth() * 100 + now.getUTCDate() + now.getUTCHours();
  const rng = seededRandom(seed);
  if (rng() < 0.15) {
    const events = ["Drought", "Storm", "Blight", "Dense Fog", "Harsh Winds"];
    return { event: events[Math.floor(rng() * events.length)], active: true };
  }
  return { event: null, active: false };
}

export interface CellLike { buildingType: string; level: number; row?: number; col?: number; }

export function calculateProduction(cells: CellLike[], season: Season): { gold: number; food: number; wood: number; stone: number } {
  const mods = getSeasonModifiers(season);
  let gold = BASE_PRODUCTION.gold * mods.gold;
  let food = BASE_PRODUCTION.food * mods.food;
  let wood = BASE_PRODUCTION.wood * mods.wood;
  let stone = BASE_PRODUCTION.stone * mods.stone;
  for (const cell of cells) {
    if (cell.buildingType === "empty") continue;
    const rates = PRODUCTION_RATES[cell.buildingType];
    if (!rates) continue;
    gold  += rates.gold  * cell.level * mods.gold;
    food  += rates.food  * cell.level * mods.food;
    wood  += rates.wood  * cell.level * mods.wood;
    stone += rates.stone * cell.level * mods.stone;
  }
  return { gold, food, wood, stone };
}

export function calculateArmyCapacity(cells: CellLike[]): number {
  let cap = 20;
  for (const cell of cells) {
    if (cell.buildingType === "barracks") cap += cell.level * 20;
    if (cell.buildingType === "house") cap += cell.level * 5;
  }
  return cap;
}

export function calculatePopulation(cells: CellLike[]): { population: number; populationCap: number } {
  let cap = 10;
  for (const cell of cells) {
    if (cell.buildingType === "house") cap += cell.level * 10;
  }
  return { population: Math.floor(cap * 0.8), populationCap: cap };
}

export interface FortLike { type: string; level: number; borderBonus: boolean; row: number; col: number; }

export function calculateDefenseRating(forts: FortLike[]): number {
  let defense = 10;
  for (const fort of forts) {
    if (fort.type === "wall") defense += fort.borderBonus ? fort.level * 8 : fort.level * 4;
    else if (fort.type === "tower") {
      const tooClose = forts.some(f => f.type === "tower" && f !== fort && Math.abs(f.row - fort.row) <= 1 && Math.abs(f.col - fort.col) <= 1);
      defense += tooClose ? fort.level * 5 : fort.level * 12;
    }
  }
  return defense;
}

export function isBorderCell(row: number, col: number): boolean {
  return row === 0 || row === GRID_SIZE - 1 || col === 0 || col === GRID_SIZE - 1;
}

export function calculateBuildingCost(buildingType: string, targetLevel: number): { wood: number; stone: number; gold: number; food: number } {
  const base = BUILDING_COSTS[buildingType] ?? { wood: 0, stone: 0, gold: 0, food: 0 };
  const mult = Math.pow(UPGRADE_COST_MULTIPLIER, targetLevel - 1);
  return {
    wood:  Math.ceil(base.wood  * mult),
    stone: Math.ceil(base.stone * mult),
    gold:  Math.ceil(base.gold  * mult),
    food:  Math.ceil(base.food  * mult),
  };
}

export function getUpgradeDurationMs(buildingType: string, currentLevel: number): number {
  const baseMins: Record<string, number> = {
    farm: 5, mine: 8, quarry: 6, lumberMill: 6, barracks: 15, market: 10, tavern: 12, house: 7,
  };
  const base = baseMins[buildingType] ?? 10;
  return base * Math.pow(2, currentLevel - 1) * 60 * 1000;
}

export interface CombatForces { infantry: number; archers: number; cavalry: number; catapults: number; }

export function simulateCombat(attacker: CombatForces, defenderStrength: number): { victory: boolean; casualties: number; attackPower: number } {
  let attackPower = attacker.infantry * 10 + attacker.archers * 15 + attacker.cavalry * 12 + attacker.catapults * 30;
  if (attacker.infantry > 0 && attacker.archers > 0) attackPower += attacker.archers * 3;
  if (attacker.cavalry > 0) attackPower *= 1.1;
  const totalPower = attackPower + defenderStrength;
  const winChance = totalPower > 0 ? attackPower / totalPower : 0;
  const victory = Math.random() < winChance;
  const totalAttackers = attacker.infantry + attacker.archers + attacker.cavalry;
  const casualties = victory
    ? Math.floor(totalAttackers * (1 - winChance) * 0.4)
    : Math.floor(totalAttackers * 0.3);
  return { victory, casualties: Math.max(0, casualties), attackPower };
}

export function applyTick(
  town: { gold: number; food: number; wood: number; stone: number; lastTickAt: Date | string },
  production: { gold: number; food: number; wood: number; stone: number }
): { gold: number; food: number; wood: number; stone: number } {
  const lastTick = typeof town.lastTickAt === "string" ? new Date(town.lastTickAt) : town.lastTickAt;
  const hours = Math.min((Date.now() - lastTick.getTime()) / 3_600_000, 24);
  return {
    gold:  town.gold  + production.gold  * hours,
    food:  town.food  + production.food  * hours,
    wood:  town.wood  + production.wood  * hours,
    stone: town.stone + production.stone * hours,
  };
}

const MISSION_TITLES: Record<string, string[]> = {
  explore: ["Scout the Dark Forest", "Map the Northern Ridges", "Investigate Old Ruins", "Survey the Valley"],
  patrol:  ["Border Guard Duty",  "Road Patrol",             "Village Watch",          "Mountain Pass Guard"],
  raid:    ["Strike Enemy Camp",  "Raid Merchant Convoy",    "Ambush the Scouts",       "Loot the Outpost"],
  siege:   ["Assault Enemy Keep", "Breach the Stone Walls",  "Storm the Fortress",      "Lay Siege to the Castle"],
};

const MISSION_DESCS: Record<string, string[]> = {
  explore: [
    "Venture into unknown territory to chart the land.",
    "Map the treacherous northern ridges.",
    "Old ruins may hold ancient treasure.",
    "Survey the valley for strategic advantage.",
  ],
  patrol: [
    "Keep the borders safe from roving bandits.",
    "Escort caravans along the dangerous road.",
    "Protect the villages from nightly raids.",
    "Hold the mountain pass against enemy scouts.",
  ],
  raid: [
    "A swift strike on an enemy encampment.",
    "Intercept a merchant convoy for supplies.",
    "Ambush scouts before they can report back.",
    "Loot an enemy outpost for resources.",
  ],
  siege: [
    "Full assault on an enemy fortification.",
    "Bring down the walls of the enemy keep.",
    "Storm the fortress while its garrison is thin.",
    "Lay a siege to force surrender.",
  ],
};

export interface MissionCardData {
  id: string;
  type: "explore" | "patrol" | "raid" | "siege";
  difficulty: "safe" | "moderate" | "risky" | "deadly";
  title: string;
  description: string;
  minTroops: number;
  baseSuccessRate: number;
  lootGold: number;
  lootFood: number;
  lootWood: number;
  lootStone: number;
  durationMinutes: number;
}

export function getCurrentHourSeed(): number {
  const n = new Date();
  return n.getUTCFullYear() * 1000000 + (n.getUTCMonth() + 1) * 10000 + n.getUTCDate() * 100 + n.getUTCHours();
}

export function generateMissionCards(hourSeed: number): MissionCardData[] {
  const rng = seededRandom(hourSeed);
  const types = ["explore", "patrol", "raid", "siege"] as const;
  const diffs = ["safe", "moderate", "risky", "deadly"] as const;
  const cards: MissionCardData[] = [];

  for (let i = 0; i < 5; i++) {
    const type = types[Math.floor(rng() * types.length)];
    const difficulty = diffs[Math.floor(rng() * diffs.length)];
    const titleIdx = Math.floor(rng() * MISSION_TITLES[type].length);
    const diffMult = { safe: 1, moderate: 1.5, risky: 2.5, deadly: 4 }[difficulty];
    const successRate = { safe: 0.9, moderate: 0.7, risky: 0.55, deadly: 0.35 }[difficulty];
    const minBase = { safe: 5, moderate: 15, risky: 30, deadly: 60 }[difficulty];
    const durBase = { safe: 30, moderate: 60, risky: 90, deadly: 120 }[difficulty];

    cards.push({
      id: `mission-${hourSeed}-${i}`,
      type,
      difficulty,
      title: MISSION_TITLES[type][titleIdx],
      description: MISSION_DESCS[type][titleIdx],
      minTroops: Math.ceil(minBase * (1 + rng() * 0.5)),
      baseSuccessRate: successRate,
      lootGold:  Math.ceil(rng() * 50 * diffMult),
      lootFood:  Math.ceil(rng() * 40 * diffMult),
      lootWood:  Math.ceil(rng() * 30 * diffMult),
      lootStone: Math.ceil(rng() * 20 * diffMult),
      durationMinutes: Math.ceil(durBase * (1 + rng() * 0.5)),
    });
  }

  return cards;
}
