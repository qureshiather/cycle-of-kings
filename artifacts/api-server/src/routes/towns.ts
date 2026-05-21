import { Router } from "express";
import { db } from "@workspace/db";
import {
  townsTable, buildingSlotsTable, playersTable, armyTable, missionsTable,
  spyOperationsTable, activitiesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  getCurrentSeasonInfo, calculateProduction, calculateEconomyScore,
  calculateArmyComposition, calculateStaticDefense, calculateTotalDefense,
  applyFullTick, calculatePopulationCap, calculatePopulationGrowthPerHour,
  calculateFoodUpkeepPerHour, calculateMorale, canPopulationGrow,
} from "../lib/gameEngine.js";
import { checkAchievementsForTown } from "../lib/awardAchievements.js";
import { initSlotsForTown, logConstructionComplete } from "./slots.js";

const router = Router();

async function getAndTickTown(townId: number) {
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
  const armyRows = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
  const onMission = armyRows[0] ?? {
    onMissionInfantry: 0, onMissionArchers: 0, onMissionCavalry: 0,
    onMissionSpies: 0, onMissionShips: 0,
  };

  const { season } = getCurrentSeasonInfo();
  const production = calculateProduction(freshSlots, season);
  const ticked = applyFullTick(town, freshSlots, production);
  const economyScore = calculateEconomyScore(freshSlots);
  const comp = calculateArmyComposition(freshSlots);
  const armyScore = comp.totalPower;
  const staticDefense = calculateStaticDefense(freshSlots);
  const totalDefense = calculateTotalDefense(freshSlots, onMission);
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
    gold: ticked.gold, food: ticked.food,
    wood: ticked.wood, stone: ticked.stone,
    population: ticked.population,
    defenseRating: staticDefense,
    lastTickAt: new Date(),
  }).where(eq(townsTable.id, townId));

  await checkAchievementsForTown(townId);

  return {
    ...town,
    ...ticked,
    defenseRating: staticDefense,
    production,
    economyScore,
    armyScore,
    staticDefense,
    totalDefense,
    populationCap,
    morale,
    foodUpkeepPerHour,
    populationPerHour,
    populationGrowing,
  };
}

router.get("/towns", async (_req, res) => {
  const towns = await db.select({
    id: townsTable.id,
    name: townsTable.name,
    playerId: townsTable.playerId,
    defenseRating: townsTable.defenseRating,
    peacefulMode: townsTable.peacefulMode,
  }).from(townsTable);

  const playerIds = [...new Set(towns.map(t => t.playerId))];
  const players = playerIds.length
    ? await db.select({ id: playersTable.id, name: playersTable.name }).from(playersTable)
    : [];
  const playerMap = new Map(players.map(p => [p.id, p.name]));

  res.json(towns.map(t => ({
    ...t,
    playerName: playerMap.get(t.playerId) ?? "Unknown",
    staticDefense: t.defenseRating,
    totalDefense: t.defenseRating,
  })));
});

router.get("/towns/:townId", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const data = await getAndTickTown(townId);
  if (!data) return void res.status(404).json({ error: "Not found" });
  const { production, ...town } = data;
  const netFoodPerHour = production.food - town.foodUpkeepPerHour;
  res.json({
    ...town,
    goldPerHour: production.gold,
    foodPerHour: production.food,
    woodPerHour: production.wood,
    stonePerHour: production.stone,
    netFoodPerHour,
    population: town.population ?? 0,
    populationCap: town.populationCap ?? 0,
    populationPerHour: town.populationPerHour ?? 0,
    foodUpkeepPerHour: town.foodUpkeepPerHour ?? 0,
    morale: town.morale ?? 0,
    populationGrowing: town.populationGrowing ?? false,
    lastTickAt: town.lastTickAt instanceof Date ? town.lastTickAt.toISOString() : town.lastTickAt,
  });
});

router.patch("/towns/:townId/peaceful", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const { peaceful } = req.body as { peaceful?: boolean };
  if (peaceful === undefined) return void res.status(400).json({ error: "peaceful boolean required" });

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  const { cycleNumber } = getCurrentSeasonInfo();

  if (!peaceful) {
    if (town.peacefulMode || town.peacefulOptedInCycle != null) {
      return void res.status(400).json({
        error: "Peaceful mode is permanent. You cannot return to PvP once you have opted in.",
      });
    }
    return void res.json({
      peacefulMode: false,
      peacefulOptedInCycle: null,
    });
  }

  if (town.peacefulMode) {
    const optedCycle = town.peacefulOptedInCycle ?? cycleNumber;
    if (town.peacefulOptedInCycle == null) {
      await db.update(townsTable).set({ peacefulOptedInCycle: optedCycle }).where(eq(townsTable.id, townId));
    }
    return void res.json({
      peacefulMode: true,
      peacefulOptedInCycle: optedCycle,
    });
  }

  if (town.peacefulOptedInCycle != null) {
    return void res.status(400).json({
      error: "You have already opted into peaceful mode and cannot change it.",
    });
  }

  await db.update(townsTable).set({
    peacefulMode: true,
    peacefulOptedInCycle: cycleNumber,
  }).where(eq(townsTable.id, townId));

  await checkAchievementsForTown(townId);

  res.json({
    peacefulMode: true,
    peacefulOptedInCycle: cycleNumber,
  });
});

router.post("/towns/:townId/reset", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  await db.update(buildingSlotsTable)
    .set({ level: 0, upgrading: false, upgradeEndsAt: null })
    .where(eq(buildingSlotsTable.townId, townId));

  await db.delete(armyTable).where(eq(armyTable.townId, townId));
  await db.insert(armyTable).values({ townId });

  await db.delete(missionsTable).where(eq(missionsTable.townId, townId));
  await db.delete(spyOperationsTable).where(eq(spyOperationsTable.townId, townId));

  await initSlotsForTown(townId);
  const halls = await db.select().from(buildingSlotsTable)
    .where(and(eq(buildingSlotsTable.townId, townId), eq(buildingSlotsTable.slotType, "townHall")));
  const hall = halls[0];
  if (hall) {
    await db.update(buildingSlotsTable).set({ level: 1 }).where(eq(buildingSlotsTable.id, hall.id));
  }

  await db.update(townsTable).set({
    gold: 200, food: 200, wood: 150, stone: 100,
    population: 10,
    defenseRating: 10,
    lastTickAt: new Date(),
  }).where(eq(townsTable.id, townId));

  await db.insert(activitiesTable).values({
    townId,
    type: "kingdom_reset",
    title: "Kingdom Reset",
    body: "All buildings demolished. Your kingdom starts fresh.",
    icon: "restore",
    iconColor: "#cc4040",
  });

  res.json({ success: true, gold: 200, food: 200, wood: 150, stone: 100 });
});

export default router;
