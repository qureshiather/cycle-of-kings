import { Router } from "express";
import { db } from "@workspace/db";
import { townsTable, buildingSlotsTable, activitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getBuildBlockReason, getMaxConcurrentUpgrades, getTownHallLevel } from "@workspace/building-progression";
import { getRealmEventModifiers } from "../lib/realmEvents.js";
import { loadArmyContext, recruitedFromRow } from "../lib/armyService.js";
import { SLOT_TYPES } from "@workspace/db";
import { checkAchievementsForTown } from "../lib/awardAchievements.js";
import {
  getCurrentSeasonInfo, calculateProduction, calculateBuildingCost,
  getUpgradeDurationMs, applyFullTick, calculateEconomyScore,
  calculateArmyComposition, calculateStaticDefense, calculateTotalDefense,
  calculatePopulationCap, calculatePopulationGrowthPerHour,
  calculateFoodUpkeepPerHour, calculateMorale, canPopulationGrow,
  REFUND_RATIO,
} from "../lib/gameEngine.js";

const router = Router();

async function assertConstructionQueue(townId: number, allSlots: { upgrading: boolean; slotType: string; level: number }[]) {
  const upgradingCount = allSlots.filter((s) => s.upgrading).length;
  const thLevel = getTownHallLevel(allSlots);
  const max = getMaxConcurrentUpgrades(thLevel);
  if (upgradingCount >= max) {
    throw new Error(`CONSTRUCTION_QUEUE_FULL:${upgradingCount}/${max}`);
  }
}

const SLOT_NAMES: Record<string, string> = {
  farm: "Farm", mine: "Mine", quarry: "Quarry", lumberMill: "Lumber Mill",
  barracks: "Barracks", archeryRange: "Archery Range", stables: "Stables",
  market: "Market", tavern: "Tavern", house: "House",
  townHall: "Town Hall",
  wall: "Town Wall", tower: "Watch Tower",
  spyGuild: "Spy Guild", shipyard: "Shipyard",
  museum: "Museum", monument: "Monument",
};

function formatDuration(durationMs: number): string {
  if (durationMs < 60_000) return `${Math.round(durationMs / 1000)}s`;
  if (durationMs < 3_600_000) return `${Math.round(durationMs / 60_000)}m`;
  return `${Math.round(durationMs / 3_600_000)}h`;
}

async function logConstructionStarted(
  townId: number,
  slotType: string,
  targetLevel: number,
  durationMs: number,
): Promise<void> {
  await db.insert(activitiesTable).values({
    townId,
    type: "upgrade_started",
    title: "Construction started",
    body: `${SLOT_NAMES[slotType] ?? slotType} building to level ${targetLevel} — ${formatDuration(durationMs)} remaining`,
    icon: "hammer-wrench",
    iconColor: "#7a7a9a",
  });
}

async function logConstructionComplete(
  townId: number,
  slotType: string,
  level: number,
): Promise<void> {
  await db.insert(activitiesTable).values({
    townId,
    type: "upgrade_complete",
    title: "Construction complete",
    body: `${SLOT_NAMES[slotType] ?? slotType} built to level ${level}`,
    icon: "check-circle",
    iconColor: "#d4a520",
  });
}

import { initSlotsForTown } from "../lib/slotsInit.js";

async function getTickedTown(townId: number) {
  const rows = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!rows.length) return null;
  const town = rows[0];
  await initSlotsForTown(townId);
  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));

  const now = new Date();
  for (const slot of slots) {
    if (slot.upgrading && slot.upgradeEndsAt && slot.upgradeEndsAt <= now) {
      await db.update(buildingSlotsTable).set({ upgrading: false }).where(eq(buildingSlotsTable.id, slot.id));
      await logConstructionComplete(townId, slot.slotType, slot.level);
    }
  }

  const freshSlots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const { army } = await loadArmyContext(townId);
  const recruited = recruitedFromRow(army);
  const { season, seasonIndex } = getCurrentSeasonInfo();
  const realmMods = getRealmEventModifiers();
  const production = calculateProduction(freshSlots, season, realmMods, seasonIndex);
  const comp = calculateArmyComposition(freshSlots, recruited);
  const ticked = applyFullTick(town, freshSlots, production, comp.totalTroops);
  const onMission = {
    onMissionInfantry: army.onMissionInfantry,
    onMissionArchers: army.onMissionArchers,
    onMissionCavalry: army.onMissionCavalry,
    onMissionSpies: army.onMissionSpies,
    onMissionShips: army.onMissionShips,
  };

  const economyScore = calculateEconomyScore(freshSlots);
  const armyScore = comp.totalPower;
  const staticDefense = calculateStaticDefense(freshSlots);
  const totalDefense = calculateTotalDefense(freshSlots, recruited, onMission);
  const populationCap = calculatePopulationCap(freshSlots);
  const morale = calculateMorale(freshSlots);
  const foodUpkeepPerHour = calculateFoodUpkeepPerHour(ticked.population);
  const populationPerHour = calculatePopulationGrowthPerHour(
    freshSlots,
    morale,
    ticked.food,
    production.food,
    ticked.population,
  );
  const populationGrowing = canPopulationGrow(ticked.food, production.food, ticked.population);

  await db.update(townsTable).set({
    gold: ticked.gold,
    food: ticked.food,
    wood: ticked.wood,
    stone: ticked.stone,
    population: ticked.population,
    defenseRating: staticDefense,
    lastTickAt: new Date(),
  }).where(eq(townsTable.id, townId));

  const awardedAchievements = await checkAchievementsForTown(townId);

  return {
    town: { ...town, ...ticked, defenseRating: staticDefense },
    slots: freshSlots,
    production,
    economyScore,
    armyScore,
    staticDefense,
    totalDefense,
    onMission,
    populationCap,
    morale,
    foodUpkeepPerHour,
    populationPerHour,
    awardedAchievements,
  };
}

function bestSlotPerType(slots: { id: number; slotType: string; level: number; upgrading: boolean; upgradeEndsAt: Date | null; townId: number }[]) {
  const best = new Map<string, (typeof slots)[number]>();
  for (const slot of slots) {
    const prev = best.get(slot.slotType);
    if (
      !prev
      || slot.level > prev.level
      || (slot.level === prev.level && prev.upgrading && !slot.upgrading)
      || (slot.level === prev.level && slot.upgrading === prev.upgrading && slot.id > prev.id)
    ) {
      best.set(slot.slotType, slot);
    }
  }
  return [...best.values()];
}

router.get("/towns/:townId/slots", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  await initSlotsForTown(townId); // includes completeDueUpgrades
  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const deduped = bestSlotPerType(slots);
  res.json(deduped.map(s => ({ ...s, upgradeEndsAt: s.upgradeEndsAt?.toISOString() ?? null })));
});

router.post("/towns/:townId/slots/:slotType/build", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const slotType = req.params["slotType"] ?? "";

  if (!SLOT_TYPES.includes(slotType as any)) return void res.status(400).json({ error: "Invalid slot type" });

  await initSlotsForTown(townId);

  const [slot] = await db.select().from(buildingSlotsTable)
    .where(and(eq(buildingSlotsTable.townId, townId), eq(buildingSlotsTable.slotType, slotType)));
  if (!slot) return void res.status(400).json({ error: "Slot not found" });
  if (slot.level > 0) {
    return void res.status(400).json({ error: "Already built. Build to a higher level instead." });
  }

  const allSlots = await db
    .select()
    .from(buildingSlotsTable)
    .where(eq(buildingSlotsTable.townId, townId));
  const block = getBuildBlockReason(slotType, allSlots);
  if (block) return void res.status(400).json({ error: block });

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  const cost = calculateBuildingCost(slotType, 1);
  if (town.gold < cost.gold || town.food < cost.food || town.wood < cost.wood || town.stone < cost.stone) {
    return void res.status(400).json({ error: "Insufficient resources", cost });
  }

  try {
    await assertConstructionQueue(townId, allSlots);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("CONSTRUCTION_QUEUE_FULL:")) {
      return void res.status(400).json({ error: `Construction queue full (${msg.split(":")[1]})` });
    }
    throw e;
  }

  await db.update(townsTable).set({
    gold: town.gold - cost.gold, food: town.food - cost.food,
    wood: town.wood - cost.wood, stone: town.stone - cost.stone,
  }).where(eq(townsTable.id, townId));

  const durationMs = getUpgradeDurationMs(slotType, 0, allSlots);
  const upgradeEndsAt = new Date(Date.now() + durationMs);

  const [updated] = await db.update(buildingSlotsTable)
    .set({ level: 1, upgrading: true, upgradeEndsAt })
    .where(eq(buildingSlotsTable.id, slot.id))
    .returning();

  await logConstructionStarted(townId, slotType, 1, durationMs);

  const ticked = await getTickedTown(townId);
  const awardedAchievements = ticked?.awardedAchievements ?? [];

  res.status(201).json({
    ...updated,
    upgradeEndsAt: updated.upgradeEndsAt?.toISOString() ?? null,
    awardedAchievements,
  });
});

router.post("/towns/:townId/slots/:slotType/upgrade", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const slotType = req.params["slotType"] ?? "";

  if (!SLOT_TYPES.includes(slotType as any)) return void res.status(400).json({ error: "Invalid slot type" });

  await initSlotsForTown(townId);

  const [slot] = await db.select().from(buildingSlotsTable)
    .where(and(eq(buildingSlotsTable.townId, townId), eq(buildingSlotsTable.slotType, slotType)));
  if (!slot) return void res.status(400).json({ error: "Slot not found" });
  if (slot.level === 0) return void res.status(400).json({ error: "Not built yet. Build level 1 first." });
  if (slot.upgrading) return void res.status(400).json({ error: "Already upgrading" });
  if (slot.level >= 10) return void res.status(400).json({ error: "Max level reached" });

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  const nextLevel = slot.level + 1;
  const cost = calculateBuildingCost(slotType, nextLevel);
  if (town.gold < cost.gold || town.food < cost.food || town.wood < cost.wood || town.stone < cost.stone) {
    return void res.status(400).json({ error: "Insufficient resources", cost });
  }

  const allSlots = await db
    .select()
    .from(buildingSlotsTable)
    .where(eq(buildingSlotsTable.townId, townId));

  try {
    await assertConstructionQueue(townId, allSlots);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.startsWith("CONSTRUCTION_QUEUE_FULL:")) {
      return void res.status(400).json({ error: `Construction queue full (${msg.split(":")[1]})` });
    }
    throw e;
  }

  const durationMs = getUpgradeDurationMs(slotType, slot.level, allSlots);
  const upgradeEndsAt = new Date(Date.now() + durationMs);

  await db.update(townsTable).set({
    gold: town.gold - cost.gold, food: town.food - cost.food,
    wood: town.wood - cost.wood, stone: town.stone - cost.stone,
  }).where(eq(townsTable.id, townId));

  const [updated] = await db.update(buildingSlotsTable)
    .set({ upgrading: true, upgradeEndsAt, level: nextLevel })
    .where(eq(buildingSlotsTable.id, slot.id))
    .returning();

  await logConstructionStarted(townId, slotType, nextLevel, durationMs);

  const ticked = await getTickedTown(townId);

  res.json({
    ...updated,
    upgradeEndsAt: updated.upgradeEndsAt?.toISOString() ?? null,
    awardedAchievements: ticked?.awardedAchievements ?? [],
  });
});

router.delete("/towns/:townId/slots/:slotType", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const slotType = req.params["slotType"] ?? "";

  if (!SLOT_TYPES.includes(slotType as any)) return void res.status(400).json({ error: "Invalid slot type" });

  await initSlotsForTown(townId);

  const [slot] = await db.select().from(buildingSlotsTable)
    .where(and(eq(buildingSlotsTable.townId, townId), eq(buildingSlotsTable.slotType, slotType)));
  if (!slot || slot.level === 0) return void res.status(400).json({ error: "Nothing to demolish" });
  if (slotType === "townHall") return void res.status(400).json({ error: "Town Hall cannot be demolished" });

  const cost = calculateBuildingCost(slotType, slot.level);
  const refund = {
    gold:  cost.gold  * REFUND_RATIO,
    food:  cost.food  * REFUND_RATIO,
    wood:  cost.wood  * REFUND_RATIO,
    stone: cost.stone * REFUND_RATIO,
  };

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (town) {
    await db.update(townsTable).set({
      gold: town.gold + refund.gold, food: town.food + refund.food,
      wood: town.wood + refund.wood, stone: town.stone + refund.stone,
    }).where(eq(townsTable.id, townId));
  }

  const [updated] = await db.update(buildingSlotsTable)
    .set({ level: 0, upgrading: false, upgradeEndsAt: null })
    .where(eq(buildingSlotsTable.id, slot.id))
    .returning();

  await db.insert(activitiesTable).values({
    townId,
    type: "building_demolished",
    title: "Building Demolished",
    body: `${SLOT_NAMES[slotType] ?? slotType} demolished — 75% resources refunded`,
    icon: "delete-outline",
    iconColor: "#cc4040",
  });

  res.json({ ...updated, upgradeEndsAt: null });
});

export { getTickedTown, initSlotsForTown, logConstructionComplete };
export default router;
