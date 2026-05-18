export const BUILDING_COSTS: Record<string, { wood: number; stone: number; gold: number; food: number }> = {
  farm:         { wood: 50,  stone: 20,  gold: 0,  food: 0 },
  mine:         { wood: 30,  stone: 50,  gold: 0,  food: 0 },
  quarry:       { wood: 20,  stone: 30,  gold: 0,  food: 0 },
  lumberMill:   { wood: 0,   stone: 30,  gold: 0,  food: 0 },
  barracks:     { wood: 60,  stone: 40,  gold: 30, food: 0 },
  archeryRange: { wood: 50,  stone: 30,  gold: 20, food: 0 },
  stables:      { wood: 70,  stone: 20,  gold: 40, food: 10 },
  market:       { wood: 40,  stone: 0,   gold: 20, food: 0 },
  tavern:       { wood: 50,  stone: 20,  gold: 10, food: 0 },
  house:        { wood: 30,  stone: 20,  gold: 0,  food: 0 },
  townHall:     { wood: 80,  stone: 60,  gold: 50, food: 20 },
  wall:         { wood: 0,   stone: 40,  gold: 0,  food: 0 },
  tower:        { wood: 20,  stone: 60,  gold: 20, food: 0 },
};

export const UPGRADE_COST_MULTIPLIER = 1.8;
export const REFUND_RATIO = 0.75;

export const BASE_PRODUCTION = { gold: 5, food: 5, wood: 5, stone: 5 };

export const PRODUCTION_RATES: Record<string, { food: number; gold: number; wood: number; stone: number }> = {
  farm:         { food: 5,  gold: 0, wood: 0, stone: 0 },
  mine:         { food: 0,  gold: 3, wood: 0, stone: 0 },
  quarry:       { food: 0,  gold: 0, wood: 0, stone: 4 },
  lumberMill:   { food: 0,  gold: 0, wood: 8, stone: 0 },
  market:       { food: 0,  gold: 2, wood: 0, stone: 0 },
  barracks:     { food: 0,  gold: 0, wood: 0, stone: 0 },
  archeryRange: { food: 0,  gold: 0, wood: 0, stone: 0 },
  stables:      { food: 0,  gold: 0, wood: 0, stone: 0 },
  tavern:       { food: 0,  gold: 0, wood: 0, stone: 0 },
  house:        { food: 0,  gold: 0, wood: 0, stone: 0 },
  townHall:     { food: 0,  gold: 3, wood: 0, stone: 0 },
  wall:         { food: 0,  gold: 0, wood: 0, stone: 0 },
  tower:        { food: 0,  gold: 0, wood: 0, stone: 0 },
};

const ECONOMY_WEIGHTS: Record<string, number> = {
  farm: 8, mine: 6, quarry: 7, lumberMill: 10,
  market: 12, tavern: 5, house: 8,
};

export type Season = "spring" | "summer" | "autumn" | "winter";

const SEASON_EPOCH = new Date("2024-01-01T00:00:00Z");
const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;
const SEASONS_PER_CYCLE = 4;
const MS_PER_CYCLE = MS_PER_WEEK * SEASONS_PER_CYCLE;

export function getCurrentSeasonInfo(): { season: Season; cycleNumber: number; seasonIndex: number; cycleStartedAt: string; nextWipeAt: string } {
  const now = new Date();
  const weeksSinceEpoch = Math.floor((now.getTime() - SEASON_EPOCH.getTime()) / MS_PER_WEEK);
  const seasonIndex = ((weeksSinceEpoch % SEASONS_PER_CYCLE) + SEASONS_PER_CYCLE) % SEASONS_PER_CYCLE;
  const cycleNumber = Math.floor(weeksSinceEpoch / SEASONS_PER_CYCLE) + 1;
  const seasons: Season[] = ["spring", "summer", "autumn", "winter"];
  const season = seasons[seasonIndex];

  const cycleStartMs = SEASON_EPOCH.getTime() + (cycleNumber - 1) * MS_PER_CYCLE;
  const nextWipeMs = cycleStartMs + MS_PER_CYCLE;

  return {
    season,
    cycleNumber,
    seasonIndex,
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

export interface SlotLike { slotType: string; level: number; }

export function calculateProduction(slots: SlotLike[], season: Season): { gold: number; food: number; wood: number; stone: number } {
  const mods = getSeasonModifiers(season);
  let gold = BASE_PRODUCTION.gold * mods.gold;
  let food = BASE_PRODUCTION.food * mods.food;
  let wood = BASE_PRODUCTION.wood * mods.wood;
  let stone = BASE_PRODUCTION.stone * mods.stone;
  for (const slot of slots) {
    if (slot.level === 0) continue;
    const rates = PRODUCTION_RATES[slot.slotType];
    if (!rates) continue;
    gold  += rates.gold  * slot.level * mods.gold;
    food  += rates.food  * slot.level * mods.food;
    wood  += rates.wood  * slot.level * mods.wood;
    stone += rates.stone * slot.level * mods.stone;
  }
  const { bonusGoldPerHour } = getTownHallBonuses(slots);
  gold += bonusGoldPerHour * mods.gold;
  return { gold, food, wood, stone };
}

export function calculateEconomyScore(slots: SlotLike[]): number {
  let score = 0;
  for (const slot of slots) {
    if (slot.level === 0) continue;
    const weight = ECONOMY_WEIGHTS[slot.slotType] ?? 0;
    score += slot.level * weight;
  }
  return score;
}

export interface ArmyComposition {
  infantry: number;
  archers: number;
  cavalry: number;
  infantryAttackMult: number;
  archerAttackMult: number;
  cavalryAttackMult: number;
  totalTroops: number;
  totalPower: number;
}

export function calculateArmyComposition(slots: SlotLike[]): ArmyComposition {
  const barracks     = slots.find(s => s.slotType === "barracks");
  const archeryRange = slots.find(s => s.slotType === "archeryRange");
  const stables      = slots.find(s => s.slotType === "stables");

  const bLevel = barracks?.level ?? 0;
  const aLevel = archeryRange?.level ?? 0;
  const sLevel = stables?.level ?? 0;

  const infantry = bLevel * 5;
  const archers  = aLevel * 5;
  const cavalry  = sLevel * 3;

  const infantryAttackMult = 1 + Math.max(0, bLevel - 1) * 0.15;
  const archerAttackMult   = 1 + Math.max(0, aLevel - 1) * 0.15;
  const cavalryAttackMult  = 1 + Math.max(0, sLevel - 1) * 0.15;

  const totalTroops = infantry + archers + cavalry;
  const totalPower  = Math.round(
    infantry * 10 * infantryAttackMult +
    archers  * 15 * archerAttackMult +
    cavalry  * 12 * cavalryAttackMult
  );

  return { infantry, archers, cavalry, infantryAttackMult, archerAttackMult, cavalryAttackMult, totalTroops, totalPower };
}

export function calculateArmyCapacity(slots: SlotLike[]): number {
  const house = slots.find(s => s.slotType === "house");
  return 10 + (house?.level ?? 0) * 10;
}

export function calculateStaticDefense(slots: SlotLike[]): number {
  const wall  = slots.find(s => s.slotType === "wall");
  const tower = slots.find(s => s.slotType === "tower");
  return 10 + (wall?.level ?? 0) * 20 + (tower?.level ?? 0) * 30;
}

export function calculateTotalDefense(
  slots: SlotLike[],
  onMission: { onMissionInfantry: number; onMissionArchers: number; onMissionCavalry: number },
): number {
  const comp   = calculateArmyComposition(slots);
  const static_ = calculateStaticDefense(slots);

  const availInfantry = Math.max(0, comp.infantry - onMission.onMissionInfantry);
  const availArchers  = Math.max(0, comp.archers  - onMission.onMissionArchers);
  const availCavalry  = Math.max(0, comp.cavalry  - onMission.onMissionCavalry);

  const availPower = Math.round(availInfantry * 10 + availArchers * 15 + availCavalry * 12);
  return static_ + availPower;
}

export function calculateBuildingCost(slotType: string, targetLevel: number): { wood: number; stone: number; gold: number; food: number } {
  const base = BUILDING_COSTS[slotType] ?? { wood: 0, stone: 0, gold: 0, food: 0 };
  const mult = Math.pow(UPGRADE_COST_MULTIPLIER, targetLevel - 1);
  return {
    wood:  Math.ceil(base.wood  * mult),
    stone: Math.ceil(base.stone * mult),
    gold:  Math.ceil(base.gold  * mult),
    food:  Math.ceil(base.food  * mult),
  };
}

export function getTownHallLevel(slots: SlotLike[]): number {
  const hall = slots.find((s) => s.slotType === "townHall");
  return Math.max(1, hall?.level ?? 1);
}

/** +3 gold/h per town hall level; 5% faster builds per level above 1 (max 45% reduction). */
export function getTownHallBonuses(slots: SlotLike[]): {
  bonusGoldPerHour: number;
  buildSpeedMultiplier: number;
} {
  const level = getTownHallLevel(slots);
  const buildSpeedMultiplier = Math.max(0.55, 1 - (level - 1) * 0.05);
  return { bonusGoldPerHour: level * 3, buildSpeedMultiplier };
}

export function getUpgradeDurationMs(
  slotType: string,
  currentLevel: number,
  slots: SlotLike[] = [],
): number {
  const baseMins: Record<string, number> = {
    farm: 5, mine: 8, quarry: 6, lumberMill: 6,
    barracks: 10, archeryRange: 10, stables: 12,
    market: 10, tavern: 12, house: 7,
    townHall: 15, wall: 8, tower: 12,
  };
  const base = baseMins[slotType] ?? 10;
  const raw = base * Math.pow(2, currentLevel - 1) * 60 * 1000;
  const { buildSpeedMultiplier } = getTownHallBonuses(slots);
  return Math.round(raw * buildSpeedMultiplier);
}

export interface CombatForces { infantry: number; archers: number; cavalry: number; }

export function simulateCombat(attacker: CombatForces, defenderStrength: number): { victory: boolean; casualties: number; attackPower: number } {
  let attackPower = attacker.infantry * 10 + attacker.archers * 15 + attacker.cavalry * 12;
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
  patrol:  ["Border Guard Duty",     "Road Patrol",             "Village Watch",          "Mountain Pass Guard"],
  raid:    ["Strike Enemy Camp",     "Raid Merchant Convoy",    "Ambush the Scouts",       "Loot the Outpost"],
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
};

export interface MissionCardData {
  id: string;
  type: "explore" | "patrol" | "raid";
  difficulty: "easy" | "medium" | "hard";
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

export type ResourceType = "gold" | "food" | "wood" | "stone";

export interface TradeDealData {
  id: string;
  title: string;
  payResource: ResourceType;
  payAmount: number;
  receiveResource: ResourceType;
  receiveAmount: number;
}

const TRADE_MERCHANTS = [
  "Wandering Merchant",
  "Caravan Master",
  "Foreign Trader",
  "Market Broker",
  "Silk Road Peddler",
  "Harbor Factor",
];

const TRADE_RESOURCES: ResourceType[] = ["gold", "food", "wood", "stone"];

export function getNextHourRefreshAt(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 0, 0),
  ).toISOString();
}

/** Merchant deals refresh hourly; exchange rates skew unfavorable (pay more than fair value). */
export function generateTradeDeals(hourSeed: number, townId: number): TradeDealData[] {
  const rng = seededRandom(hourSeed * 997 + townId);
  const dealCount = 4;

  return Array.from({ length: dealCount }, (_, i) => {
    let payResource = TRADE_RESOURCES[Math.floor(rng() * TRADE_RESOURCES.length)];
    let receiveResource = TRADE_RESOURCES[Math.floor(rng() * TRADE_RESOURCES.length)];
    while (receiveResource === payResource) {
      receiveResource = TRADE_RESOURCES[Math.floor(rng() * TRADE_RESOURCES.length)];
    }

    const payAmount = Math.ceil(20 + rng() * 60);
    let ratio = 0.38 + rng() * 0.32;
    if (rng() < 0.12) ratio = 0.62 + rng() * 0.18;
    if (rng() < 0.04) ratio = 0.82 + rng() * 0.12;
    const receiveAmount = Math.max(1, Math.floor(payAmount * ratio));

    return {
      id: `trade-${hourSeed}-${i}`,
      title: TRADE_MERCHANTS[Math.floor(rng() * TRADE_MERCHANTS.length)],
      payResource,
      payAmount,
      receiveResource,
      receiveAmount,
    };
  });
}

export function generateMissionCards(hourSeed: number, totalTroops: number = 5, armyPower: number = 50): MissionCardData[] {
  const rng = seededRandom(hourSeed);
  const types = ["explore", "patrol", "raid"] as const;

  const powerBase = Math.max(30, armyPower);
  const troopBase = Math.max(3, totalTroops);

  const difficulties = [
    { name: "easy"   as const, troopFrac: 0.2, successRate: 0.85, lootMult: 0.8,  durBase: 20 },
    { name: "medium" as const, troopFrac: 0.5, successRate: 0.65, lootMult: 1.6,  durBase: 40 },
    { name: "hard"   as const, troopFrac: 0.8, successRate: 0.45, lootMult: 2.8,  durBase: 70 },
  ];

  return difficulties.map((diff, i) => {
    const type = types[Math.floor(rng() * types.length)];
    const titleIdx = Math.floor(rng() * MISSION_TITLES[type].length);
    const minTroops = Math.max(1, Math.round(troopBase * diff.troopFrac));

    return {
      id: `mission-${hourSeed}-${i}`,
      type,
      difficulty: diff.name,
      title: MISSION_TITLES[type][titleIdx],
      description: MISSION_DESCS[type][titleIdx],
      minTroops,
      baseSuccessRate: diff.successRate,
      lootGold:  Math.ceil(rng() * 40 * diff.lootMult * (powerBase / 50)),
      lootFood:  Math.ceil(rng() * 30 * diff.lootMult * (powerBase / 50)),
      lootWood:  Math.ceil(rng() * 25 * diff.lootMult * (powerBase / 50)),
      lootStone: Math.ceil(rng() * 15 * diff.lootMult * (powerBase / 50)),
      durationMinutes: Math.ceil(diff.durBase * (1 + rng() * 0.4)),
    };
  });
}
