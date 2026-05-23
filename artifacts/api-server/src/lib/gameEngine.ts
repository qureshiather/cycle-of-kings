export const BUILDING_COSTS: Record<string, { wood: number; stone: number; gold: number; food: number }> = {
  farm:         { wood: 50,  stone: 20,  gold: 0,  food: 0 },
  mine:         { wood: 30,  stone: 50,  gold: 0,  food: 0 },
  quarry:       { wood: 20,  stone: 30,  gold: 0,  food: 0 },
  lumberMill:   { wood: 0,   stone: 30,  gold: 0,  food: 0 },
  barracks:     { wood: 60,  stone: 40,  gold: 30, food: 0 },
  archeryRange: { wood: 50,  stone: 30,  gold: 20, food: 0 },
  stables:      { wood: 70,  stone: 20,  gold: 40, food: 0 },
  market:       { wood: 40,  stone: 0,   gold: 20, food: 0 },
  tavern:       { wood: 50,  stone: 20,  gold: 10, food: 0 },
  house:        { wood: 30,  stone: 20,  gold: 0,  food: 0 },
  townHall:     { wood: 80,  stone: 60,  gold: 50, food: 0 },
  wall:         { wood: 0,   stone: 40,  gold: 0,  food: 0 },
  tower:        { wood: 20,  stone: 60,  gold: 20, food: 0 },
  spyGuild:     { wood: 55,  stone: 25,  gold: 35, food: 0 },
  shipyard:     { wood: 80,  stone: 30,  gold: 25, food: 0 },
  museum:       { wood: 60,  stone: 50,  gold: 40, food: 0 },
  monument:     { wood: 100, stone: 120, gold: 80, food: 0 },
};

export const UPGRADE_COST_MULTIPLIER = 1.8;
export const REFUND_RATIO = 0.75;

export const BASE_PRODUCTION = { gold: 5, food: 5, wood: 5, stone: 5 };

export const PRODUCTION_RATES: Record<string, { food: number; gold: number; wood: number; stone: number }> = {
  farm:         { food: 5,  gold: 0, wood: 0, stone: 0 },
  mine:         { food: 0,  gold: 3, wood: 0, stone: 0 },
  quarry:       { food: 0,  gold: 0, wood: 0, stone: 4 },
  lumberMill:   { food: 0,  gold: 0, wood: 8, stone: 0 },
  market:       { food: 1,  gold: 2, wood: 0, stone: 0 },
  barracks:     { food: 0,  gold: 0, wood: 0, stone: 0 },
  archeryRange: { food: 0,  gold: 0, wood: 0, stone: 0 },
  stables:      { food: 0,  gold: 0, wood: 0, stone: 0 },
  tavern:       { food: 2,  gold: 0, wood: 0, stone: 0 },
  house:        { food: 0,  gold: 0, wood: 0, stone: 0 },
  townHall:     { food: 0,  gold: 3, wood: 0, stone: 0 },
  wall:         { food: 0,  gold: 0, wood: 0, stone: 0 },
  tower:        { food: 0,  gold: 0, wood: 0, stone: 0 },
  spyGuild:     { food: 0,  gold: 0, wood: 0, stone: 0 },
  shipyard:     { food: 2,  gold: 0, wood: 0, stone: 0 },
  museum:       { food: 0,  gold: 0, wood: 0, stone: 0 },
  monument:     { food: 0,  gold: 0, wood: 0, stone: 0 },
};

const ECONOMY_WEIGHTS: Record<string, number> = {
  farm: 8, mine: 6, quarry: 7, lumberMill: 10,
  market: 12, tavern: 8, house: 8, museum: 15, monument: 25,
};

/** Balance knobs — tune in one place. */
export const FOOD_PER_CAPITA = 0.4;
/** Ongoing food drain per recruited troop per hour (missions/raids still count). */
export const TROOP_FOOD_UPKEEP = 0.4;
export const POP_GROWTH_BASE = 1.5;
export const POP_DEPOP_RATE = 0.08;
export const POP_FLOOR = 5;
/** Starting population for new towns and when repopulating an empty realm. */
export const STARTING_POPULATION = 10;
export const THRIVING_REALM_POP = 50;
export const SPY_HOARD_LOOT_THRESHOLD = 200;

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

export type RecruitedTroops = { infantry: number; archers: number; cavalry: number };
export type UnitType = keyof RecruitedTroops;

export const RECRUIT_COST_PER_TROOP: Record<UnitType, { gold: number; food: number }> = {
  infantry: { gold: 3, food: 2 },
  archers: { gold: 4, food: 2 },
  cavalry: { gold: 6, food: 3 },
};

/** Milliseconds to train one troop. */
export const RECRUIT_MS_PER_TROOP: Record<UnitType, number> = {
  infantry: (8 * 60 * 1000) / 5,
  archers: (10 * 60 * 1000) / 5,
  cavalry: (12 * 60 * 1000) / 5,
};

export interface SlotLike { slotType: string; level: number; upgrading?: boolean; }

/** Level that counts for gameplay (no troops/ships while a build or upgrade is in progress). */
export function effectiveSlotLevel(slot: SlotLike | undefined): number {
  if (!slot || slot.level <= 0) return 0;
  if (slot.upgrading) return Math.max(0, slot.level - 1);
  return slot.level;
}

export function calculateProduction(
  slots: SlotLike[],
  season: Season,
  realmMods: { gold: number; food: number; wood: number; stone: number } = { gold: 1, food: 1, wood: 1, stone: 1 },
): { gold: number; food: number; wood: number; stone: number } {
  const seasonMods = getSeasonModifiers(season);
  const mods = {
    gold: seasonMods.gold * realmMods.gold,
    food: seasonMods.food * realmMods.food,
    wood: seasonMods.wood * realmMods.wood,
    stone: seasonMods.stone * realmMods.stone,
  };
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

export function getUnitCaps(slots: SlotLike[]): RecruitedTroops {
  const bLevel = effectiveSlotLevel(slots.find((s) => s.slotType === "barracks"));
  const aLevel = effectiveSlotLevel(slots.find((s) => s.slotType === "archeryRange"));
  const sLevel = effectiveSlotLevel(slots.find((s) => s.slotType === "stables"));
  return { infantry: bLevel * 5, archers: aLevel * 5, cavalry: sLevel * 3 };
}

export function getTotalTroopCap(caps: RecruitedTroops): number {
  return caps.infantry + caps.archers + caps.cavalry;
}

export function calculateArmyComposition(slots: SlotLike[], recruited: RecruitedTroops): ArmyComposition {
  const bLevel = effectiveSlotLevel(slots.find((s) => s.slotType === "barracks"));
  const aLevel = effectiveSlotLevel(slots.find((s) => s.slotType === "archeryRange"));
  const sLevel = effectiveSlotLevel(slots.find((s) => s.slotType === "stables"));

  const infantry = Math.max(0, recruited.infantry);
  const archers = Math.max(0, recruited.archers);
  const cavalry = Math.max(0, recruited.cavalry);

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

export function applyCasualties(
  recruited: RecruitedTroops,
  deployed: RecruitedTroops,
  totalCasualties: number,
): RecruitedTroops {
  const totalDeployed = deployed.infantry + deployed.archers + deployed.cavalry;
  if (totalCasualties <= 0 || totalDeployed <= 0) return recruited;

  let remaining = totalCasualties;
  const infShare = deployed.infantry / totalDeployed;
  const archShare = deployed.archers / totalDeployed;
  const cavShare = deployed.cavalry / totalDeployed;

  const infLoss = Math.min(recruited.infantry, Math.floor(totalCasualties * infShare));
  remaining -= infLoss;
  const archLoss = Math.min(recruited.archers, Math.floor(totalCasualties * archShare));
  remaining -= archLoss;
  const cavLoss = Math.min(recruited.cavalry, Math.max(0, remaining));

  return {
    infantry: Math.max(0, recruited.infantry - infLoss),
    archers: Math.max(0, recruited.archers - archLoss),
    cavalry: Math.max(0, recruited.cavalry - cavLoss),
  };
}

export function calculateArmyCapacity(slots: SlotLike[]): number {
  const house = slots.find(s => s.slotType === "house");
  return 10 + (house?.level ?? 0) * 10;
}

function slotLvl(slots: SlotLike[], slotType: string): number {
  return effectiveSlotLevel(slots.find((s) => s.slotType === slotType));
}

export function calculatePopulationCap(slots: SlotLike[]): number {
  const th = slotLvl(slots, "townHall");
  if (th < 1) return 0;
  const house = slotLvl(slots, "house");
  return Math.round(20 + house * 15 + th * 5);
}

export function calculateMorale(slots: SlotLike[]): number {
  const tavern = slotLvl(slots, "tavern");
  const museum = slotLvl(slots, "museum");
  const monument = slotLvl(slots, "monument");
  return Math.min(100, Math.round(tavern * 4 + museum * 6 + monument * 10));
}

export function calculateFoodUpkeepPerHour(population: number): number {
  return Math.max(0, population) * FOOD_PER_CAPITA;
}

export function calculateTroopFoodUpkeepPerHour(totalTroops: number): number {
  return Math.max(0, totalTroops) * TROOP_FOOD_UPKEEP;
}

/** True when farms can feed people (stockpile or production beats upkeep at current pop). */
export function canPopulationGrow(
  foodStockpile: number,
  foodProductionPerHour: number,
  population: number,
): boolean {
  if (foodStockpile <= 0 && foodProductionPerHour <= 0) return false;
  const upkeep = calculateFoodUpkeepPerHour(population);
  return foodStockpile > 0 || foodProductionPerHour > upkeep;
}

export function calculatePopulationGrowthPerHour(
  slots: SlotLike[],
  morale: number,
  foodStockpile: number,
  foodProductionPerHour: number,
  population: number,
): number {
  if (!canPopulationGrow(foodStockpile, foodProductionPerHour, population)) return 0;
  const tavern = slotLvl(slots, "tavern");
  const museum = slotLvl(slots, "museum");
  const monument = slotLvl(slots, "monument");
  const cultureBonus = tavern * 0.5 + museum * 1 + monument * 2;
  const moraleBonus = morale * 0.02;
  return POP_GROWTH_BASE + cultureBonus + moraleBonus;
}

export function calculateSpyCount(slots: SlotLike[]): number {
  return slotLvl(slots, "spyGuild") * 3;
}

export function calculateShipCount(slots: SlotLike[]): number {
  return slotLvl(slots, "shipyard") * 2;
}

export function calculateStaticDefense(slots: SlotLike[]): number {
  const wall  = slots.find(s => s.slotType === "wall");
  const tower = slots.find(s => s.slotType === "tower");
  return 10 + (wall?.level ?? 0) * 20 + (tower?.level ?? 0) * 30;
}

export function calculateTotalDefense(
  slots: SlotLike[],
  recruited: RecruitedTroops,
  onMission: { onMissionInfantry: number; onMissionArchers: number; onMissionCavalry: number },
): number {
  const comp   = calculateArmyComposition(slots, recruited);
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
  return hall?.level ?? 0;
}

/** +3 gold/h per town hall level; 5% faster builds per level above 1 (max 45% reduction). */
export function getTownHallBonuses(slots: SlotLike[]): {
  bonusGoldPerHour: number;
  buildSpeedMultiplier: number;
} {
  const level = getTownHallLevel(slots);
  if (level < 1) {
    return { bonusGoldPerHour: 0, buildSpeedMultiplier: 1 };
  }
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
    spyGuild: 14, shipyard: 16, museum: 18, monument: 25,
  };
  const base = baseMins[slotType] ?? 10;
  const raw = base * Math.pow(2, currentLevel - 1) * 60 * 1000;
  const { buildSpeedMultiplier } = getTownHallBonuses(slots);
  return Math.round(raw * buildSpeedMultiplier);
}

/** PvP raid march time before combat resolves (ms). */
export const RAID_MARCH_DURATION_MS = 2 * 60 * 60 * 1000;

export interface CombatForces { infantry: number; archers: number; cavalry: number; }

/** Raid attack power (infantry/archer synergy + cavalry bonus). */
export function calculateRaidAttackPower(attacker: CombatForces): number {
  let attackPower = attacker.infantry * 10 + attacker.archers * 15 + attacker.cavalry * 12;
  if (attacker.infantry > 0 && attacker.archers > 0) attackPower += attacker.archers * 3;
  if (attacker.cavalry > 0) attackPower *= 1.1;
  return attackPower;
}

/** Gold/food paid to defender when a raid is repelled (scales with attacker strength). */
export function calculateDefenderBounty(attackPower: number): { gold: number; food: number } {
  return {
    gold: Math.floor(attackPower * 2),
    food: Math.floor(attackPower * 0.8),
  };
}

export function estimateRaidWinChance(attackPower: number, defenderStrength: number): number {
  const total = attackPower + defenderStrength;
  return total > 0 ? attackPower / total : 0;
}

export function simulateCombat(attacker: CombatForces, defenderStrength: number): { victory: boolean; casualties: number; attackPower: number } {
  const attackPower = calculateRaidAttackPower(attacker);
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

export function applyFullTick(
  town: {
    gold: number;
    food: number;
    wood: number;
    stone: number;
    population: number;
    lastTickAt: Date | string;
  },
  slots: SlotLike[],
  production: { gold: number; food: number; wood: number; stone: number },
  totalTroops: number = 0,
): {
  gold: number;
  food: number;
  wood: number;
  stone: number;
  population: number;
} {
  const lastTick = typeof town.lastTickAt === "string" ? new Date(town.lastTickAt) : town.lastTickAt;
  const hours = Math.min((Date.now() - lastTick.getTime()) / 3_600_000, 24);

  const resources = {
    gold: town.gold + production.gold * hours,
    food: town.food + production.food * hours,
    wood: town.wood + production.wood * hours,
    stone: town.stone + production.stone * hours,
  };

  const popUpkeep = calculateFoodUpkeepPerHour(town.population) * hours;
  const troopUpkeep = calculateTroopFoodUpkeepPerHour(totalTroops) * hours;
  resources.food -= popUpkeep + troopUpkeep;

  const cap = calculatePopulationCap(slots);
  const morale = calculateMorale(slots);
  let population = Math.max(0, town.population ?? 0);

  // Repopulate towns that were created before the population column or hit zero cap bug.
  if (cap > 0 && population < POP_FLOOR) {
    population = Math.min(cap, STARTING_POPULATION);
  }

  if (canPopulationGrow(resources.food, production.food, population)) {
    const growthPerHour = calculatePopulationGrowthPerHour(
      slots,
      morale,
      resources.food,
      production.food,
      population,
    );
    population = Math.min(cap, population + growthPerHour * hours);
  }

  if (resources.food <= 0) {
    const loss = Math.max(1, Math.floor(population * POP_DEPOP_RATE * hours));
    population = Math.max(0, population - loss);
  }

  if (cap > 0) {
    population = Math.min(cap, Math.max(POP_FLOOR, population));
  } else {
    population = 0;
  }

  return { ...resources, population };
}

const MISSION_TITLES: Record<string, string[]> = {
  explore: [
    "Scout the Dark Forest", "Map the Northern Ridges", "Investigate Old Ruins", "Survey the Valley",
    "Chart the Marshlands", "Probe the Abandoned Keep", "Trail the River Fork", "Search the Burial Mounds",
    "Recon the Highland Pass", "Explore the Crystal Caves", "Track the Nomad Trails", "Find the Hidden Ford",
  ],
  patrol: [
    "Border Guard Duty", "Road Patrol", "Village Watch", "Mountain Pass Guard",
    "Harbor Watch", "Bridge Garrison", "Night Watch Rounds", "Farmland Patrol",
    "Coastline Sentinel", "Forest Road Escort", "Gatehouse Inspection", "Supply Line Guard",
  ],
  naval: [
    "Coastal Raid", "Harbor Smuggling Run", "Island Supply Run", "Blockade Breaker",
    "Treasure Fleet Intercept", "Smuggler's Cove", "Lighthouse Sortie", "River Estuary Strike",
  ],
  raid: [
    "Strike Enemy Camp", "Raid Merchant Convoy", "Ambush the Scouts", "Loot the Outpost",
    "Burn the Siege Stores", "Hit the Bandit Den", "Storm the Watchtower", "Plunder the Tax Cart",
    "Break the Supply Depot", "Raid the Smuggler Cove", "Sack the Rival Manor", "Intercept the War Party",
  ],
};

const MISSION_DESCS: Record<string, string[]> = {
  explore: [
    "Venture into unknown territory to chart the land.",
    "Map the treacherous northern ridges.",
    "Old ruins may hold ancient treasure.",
    "Survey the valley for strategic advantage.",
    "The marsh hides paths and peril alike.",
    "A ruined keep may still guard forgotten riches.",
    "Follow the river fork before rivals do.",
    "Ancient barrows sometimes yield grave goods.",
    "Highland passes reveal enemy movements.",
    "Crystal caves glitter — and collapse.",
    "Nomad trails cross contested ground.",
    "A hidden ford could change the campaign.",
  ],
  patrol: [
    "Keep the borders safe from roving bandits.",
    "Escort caravans along the dangerous road.",
    "Protect the villages from nightly raids.",
    "Hold the mountain pass against enemy scouts.",
    "Watch the harbor for smugglers and spies.",
    "Hold the bridge until reinforcements arrive.",
    "Walk the walls while the realm sleeps.",
    "Patrol the fields before harvest raiders strike.",
    "Scan the coast for landing parties.",
    "Escort woodcutters through wolf country.",
    "Inspect travelers at the main gate.",
    "Guard the supply wagons at the crossroads.",
  ],
  naval: [
    "Send ships to raid coastal stores and return with timber and stone.",
    "Run contraband past harbor patrols for a risky payout.",
    "Ferry supplies from an offshore island before rivals claim it.",
    "Break an enemy blockade and seize what you can carry.",
    "Intercept a treasure fleet — fortune favors the bold.",
    "Raid a smuggler cove; they won't report you to the crown.",
    "Sortie from the lighthouse to scout and seize coastal goods.",
    "Strike upriver where defenses are thin but loot is rich.",
  ],
  raid: [
    "A swift strike on an enemy encampment.",
    "Intercept a merchant convoy for supplies.",
    "Ambush scouts before they can report back.",
    "Loot an enemy outpost for resources.",
    "Destroy siege stores before they reach the walls.",
    "Clear a bandit den troubling the roads.",
    "Topple a watchtower that sees too much.",
    "Seize coin from a hated tax collector.",
    "Break an enemy depot before the march.",
    "Raid smugglers who dodge your tariffs.",
    "Humiliate a rival lord and take his stores.",
    "Cut off a war party before it joins the siege.",
  ],
};

const MISSION_CARD_COUNT = 5;
const LOOT_ROLL_MIN = 0.35;
const LOOT_ROLL_MAX = 1.65;

export function lootEstimateRange(base: number): { min: number; max: number } {
  if (base <= 0) return { min: 0, max: 0 };
  return {
    min: Math.max(1, Math.floor(base * LOOT_ROLL_MIN)),
    max: Math.max(1, Math.ceil(base * LOOT_ROLL_MAX)),
  };
}

export function rollMissionLoot(
  bases: { gold: number; food: number; wood: number; stone: number },
  seed: number,
): { gold: number; food: number; wood: number; stone: number } {
  const rng = seededRandom(seed);
  const roll = (base: number) =>
    base <= 0 ? 0 : Math.max(1, Math.round(base * (LOOT_ROLL_MIN + rng() * (LOOT_ROLL_MAX - LOOT_ROLL_MIN))));
  return {
    gold: roll(bases.gold),
    food: roll(bases.food),
    wood: roll(bases.wood),
    stone: roll(bases.stone),
  };
}

export function generateEnemyForce(
  seed: number,
  playerTotal: number,
  difficulty: "easy" | "medium" | "hard",
): { infantry: number; archers: number; cavalry: number } {
  const rng = seededRandom(seed);
  const diffScale = { easy: 0.55, medium: 0.8, hard: 1.05 }[difficulty];
  const enemyTotal = Math.max(
    1,
    Math.round(playerTotal * diffScale * (0.7 + rng() * 0.55)),
  );
  let inf = Math.floor(rng() * (enemyTotal + 1));
  let arch = Math.floor(rng() * (enemyTotal - inf + 1));
  let cav = enemyTotal - inf - arch;
  if (cav < 0) {
    arch = Math.max(0, arch + cav);
    cav = 0;
  }
  if (inf + arch + cav === 0) inf = 1;
  return { infantry: inf, archers: arch, cavalry: cav };
}

export interface MissionCardData {
  id: string;
  type: "explore" | "patrol" | "raid" | "naval";
  difficulty: "easy" | "medium" | "hard";
  title: string;
  description: string;
  minTroops: number;
  minShips: number;
  baseSuccessRate: number;
  lootGold: number;
  lootFood: number;
  lootWood: number;
  lootStone: number;
  durationMinutes: number;
}

export interface SpyCardData {
  id: string;
  type: "infiltrate" | "steal" | "sabotage";
  difficulty: "easy" | "medium" | "hard";
  title: string;
  description: string;
  minSpies: number;
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

/** Mission board refreshes every 30 minutes (two rotations per hour). */
export function getCurrentMissionSeed(): number {
  const n = new Date();
  const halfHour = n.getUTCMinutes() >= 30 ? 1 : 0;
  return getCurrentHourSeed() * 10 + halfHour;
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

  const deals = Array.from({ length: dealCount }, (_, i) => {
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

  if (!deals.some((d) => d.receiveResource === "food")) {
    const slot = deals[0];
    const payResource: ResourceType = slot.payResource === "food" ? "gold" : slot.payResource;
    deals[0] = {
      ...slot,
      title: "Grain Merchant",
      payResource,
      receiveResource: "food",
    };
  }

  return deals;
}

export function generateMissionCards(
  hourSeed: number,
  totalTroops: number = 5,
  armyPower: number = 50,
  shipyardLevel: number = 0,
  totalShips: number = 0,
): MissionCardData[] {
  const rng = seededRandom(hourSeed);
  const landTypes = ["explore", "patrol", "raid"] as const;

  const powerBase = Math.max(30, armyPower);
  const troopBase = Math.max(3, totalTroops);
  const shipBase = Math.max(1, totalShips);

  const difficulties = [
    { name: "easy"   as const, troopFrac: 0.2, shipFrac: 0.25, successRate: 0.85, lootMult: 0.8,  durBase: 20 },
    { name: "medium" as const, troopFrac: 0.5, shipFrac: 0.5,  successRate: 0.65, lootMult: 1.6,  durBase: 40 },
    { name: "hard"   as const, troopFrac: 0.8, shipFrac: 0.75, successRate: 0.45, lootMult: 2.8,  durBase: 70 },
  ];

  const used = new Set<string>();
  const cards: MissionCardData[] = [];
  let guard = 0;
  const navalSlots = shipyardLevel > 0 ? Math.min(2, Math.max(1, Math.floor(shipyardLevel / 2))) : 0;
  let navalAdded = 0;

  while (cards.length < MISSION_CARD_COUNT && guard < 80) {
    guard += 1;
    const wantNaval = navalAdded < navalSlots && cards.length >= MISSION_CARD_COUNT - navalSlots;
    const type = wantNaval
      ? "naval"
      : landTypes[Math.floor(rng() * landTypes.length)];
    const titleIdx = Math.floor(rng() * MISSION_TITLES[type].length);
    const key = `${type}-${titleIdx}`;
    if (used.has(key)) continue;
    used.add(key);
    if (type === "naval") navalAdded += 1;

    const diff = difficulties[Math.floor(rng() * difficulties.length)];
    const minTroops = type === "naval" ? 0 : Math.max(1, Math.round(troopBase * diff.troopFrac));
    const minShips = type === "naval" ? Math.max(1, Math.round(shipBase * diff.shipFrac)) : 0;
    const i = cards.length;
    const navalLoot = type === "naval" ? 1.35 : 1;

    cards.push({
      id: `mission-${hourSeed}-${i}`,
      type,
      difficulty: diff.name,
      title: MISSION_TITLES[type][titleIdx],
      description: MISSION_DESCS[type][titleIdx],
      minTroops,
      minShips,
      baseSuccessRate: type === "naval"
        ? Math.min(0.92, diff.successRate + shipyardLevel * 0.02)
        : diff.successRate,
      lootGold:  Math.ceil((8 + rng() * 40) * diff.lootMult * (powerBase / 50) * (type === "naval" ? 0.7 : 1)),
      lootFood:  Math.ceil((6 + rng() * 30) * diff.lootMult * (powerBase / 50) * (type === "naval" ? 0.5 : 1)),
      lootWood:  Math.ceil((5 + rng() * 25) * diff.lootMult * (powerBase / 50) * navalLoot),
      lootStone: Math.ceil((3 + rng() * 15) * diff.lootMult * (powerBase / 50) * navalLoot),
      durationMinutes: Math.ceil((type === "naval" ? diff.durBase * 1.2 : diff.durBase) * (0.85 + rng() * 0.5)),
    });
  }

  return cards;
}

const SPY_TITLES: Record<string, string[]> = {
  infiltrate: [
    "Infiltrate the Rival Court", "Pose as Merchants", "Bribe the Gatekeeper",
    "Forge Travel Papers", "Sneak Through the Servants' Wing",
  ],
  steal: [
    "Raid the Granary Ledgers", "Lift the Tax Strongbox", "Empty the Wine Cellar Stores",
    "Swipe the Armory Requisition", "Clean Out the Counting House",
  ],
  sabotage: [
    "Sabotage the Siege Towers", "Poison the War Council's Maps",
    "Burn the Supply Manifests", "Spook the Mercenary Camp",
  ],
};

const SPY_DESCS: Record<string, string[]> = {
  infiltrate: [
    "Blend in and learn where the gold is kept.",
    "Merchants hear everything worth selling.",
    "A few coins at the gate open many doors.",
    "Paperwork opens paths guards never watch.",
    "Servants know which lord is hoarding grain.",
  ],
  steal: [
    "Grain records reveal hidden stores.",
    "The strongbox holds more than the ledger admits.",
    "A lord's cellar can feed an army.",
    "Requisitions hide weapons and coin.",
    "Counting houses spill secrets and silver.",
  ],
  sabotage: [
    "Slow their march without open battle.",
    "Bad maps send armies into marshes.",
    "Fire in the archive buys you time.",
    "Rumors empty camps faster than swords.",
  ],
};

const SPY_CARD_COUNT = 4;

export function generateSpyCards(hourSeed: number, spyCount: number = 3): SpyCardData[] {
  const rng = seededRandom(hourSeed * 13 + 7);
  const types = ["infiltrate", "steal", "sabotage"] as const;
  const spyBase = Math.max(1, spyCount);

  const difficulties = [
    { name: "easy"   as const, spyFrac: 0.25, successRate: 0.7,  lootMult: 1.0, durBase: 25 },
    { name: "medium" as const, spyFrac: 0.5,  successRate: 0.5,  lootMult: 2.2, durBase: 45 },
    { name: "hard"   as const, spyFrac: 0.75, successRate: 0.32, lootMult: 4.5, durBase: 65 },
  ];

  const used = new Set<string>();
  const cards: SpyCardData[] = [];
  let guard = 0;

  while (cards.length < SPY_CARD_COUNT && guard < 60) {
    guard += 1;
    const type = types[Math.floor(rng() * types.length)];
    const titleIdx = Math.floor(rng() * SPY_TITLES[type].length);
    const key = `${type}-${titleIdx}`;
    if (used.has(key)) continue;
    used.add(key);

    const diff = difficulties[Math.floor(rng() * difficulties.length)];
    const minSpies = Math.max(1, Math.round(spyBase * diff.spyFrac));
    const hoardRoll = rng();
    const hoardMult = hoardRoll < 0.08 ? 6 + rng() * 4 : 1;

    cards.push({
      id: `spy-${hourSeed}-${cards.length}`,
      type,
      difficulty: diff.name,
      title: SPY_TITLES[type][titleIdx],
      description: SPY_DESCS[type][titleIdx],
      minSpies,
      baseSuccessRate: diff.successRate,
      lootGold:  Math.ceil((15 + rng() * 80) * diff.lootMult * hoardMult),
      lootFood:  Math.ceil((20 + rng() * 100) * diff.lootMult * hoardMult),
      lootWood:  Math.ceil((5 + rng() * 40) * diff.lootMult * hoardMult),
      lootStone: Math.ceil((5 + rng() * 35) * diff.lootMult * hoardMult),
      durationMinutes: Math.ceil(diff.durBase * (0.9 + rng() * 0.4)),
    });
  }

  return cards;
}

export function rollSpyLoot(
  bases: { gold: number; food: number; wood: number; stone: number },
  seed: number,
): { gold: number; food: number; wood: number; stone: number } {
  const rng = seededRandom(seed);
  const roll = (base: number) => {
    if (base <= 0) return 0;
    const mult = LOOT_ROLL_MIN + rng() * (LOOT_ROLL_MAX - LOOT_ROLL_MIN);
    return Math.max(1, Math.round(base * mult));
  };
  return {
    gold: roll(bases.gold),
    food: roll(bases.food),
    wood: roll(bases.wood),
    stone: roll(bases.stone),
  };
}
