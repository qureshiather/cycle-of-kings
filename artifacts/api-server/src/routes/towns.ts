import { Router } from "express";
import { db } from "@workspace/db";
import {
  townsTable, buildingSlotsTable, playersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  getCurrentSeasonInfo, calculateProduction, calculateEconomyScore,
  calculateStaticDefense, calculateTotalDefense,
  applyFullTick, calculatePopulationCap, calculatePopulationGrowthPerHour,
  calculateFoodUpkeepPerHour, calculateTroopFoodUpkeepPerHour, calculateMorale, canPopulationGrow,
} from "../lib/gameEngine.js";
import { getRealmEventModifiers } from "../lib/realmEvents.js";
import { performKingdomReset } from "../lib/kingdomReset.js";
import { recruitedFromRow, loadArmyContext } from "../lib/armyService.js";
import { calculateArmyComposition } from "../lib/gameEngine.js";
import { checkAchievementsForTown } from "../lib/awardAchievements.js";
import { initSlotsForTown, logConstructionComplete } from "./slots.js";

const router = Router();

async function getAndTickTown(townId: number): Promise<{ data: Record<string, unknown>; cycleReset: boolean } | null> {
  const rows = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!rows.length) return null;
  let town = rows[0];
  let cycleReset = false;

  const { cycleNumber } = getCurrentSeasonInfo();

  if (town.lastPlayedCycleNumber == null) {
    await db.update(townsTable).set({ lastPlayedCycleNumber: cycleNumber }).where(eq(townsTable.id, townId));
    town = { ...town, lastPlayedCycleNumber: cycleNumber };
  } else if (cycleNumber > town.lastPlayedCycleNumber) {
    await performKingdomReset(townId, "cycle");
    cycleReset = true;
    const refreshed = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
    if (!refreshed.length) return null;
    town = refreshed[0];
  }

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
  const onMission = {
    onMissionInfantry: army.onMissionInfantry,
    onMissionArchers: army.onMissionArchers,
    onMissionCavalry: army.onMissionCavalry,
    onMissionSpies: army.onMissionSpies,
    onMissionShips: army.onMissionShips,
  };

  const { season } = getCurrentSeasonInfo();
  const realmMods = getRealmEventModifiers();
  const production = calculateProduction(freshSlots, season, realmMods);
  const comp = calculateArmyComposition(freshSlots, recruited);
  const ticked = applyFullTick(town, freshSlots, production, comp.totalTroops);
  const economyScore = calculateEconomyScore(freshSlots);
  const armyScore = comp.totalPower;
  const staticDefense = calculateStaticDefense(freshSlots);
  const totalDefense = calculateTotalDefense(freshSlots, recruited, onMission);
  const populationCap = calculatePopulationCap(freshSlots);
  const morale = calculateMorale(freshSlots);
  const foodUpkeepPerHour = calculateFoodUpkeepPerHour(ticked.population);
  const troopFoodUpkeepPerHour = calculateTroopFoodUpkeepPerHour(comp.totalTroops);
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
    cycleReset,
    data: {
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
      troopFoodUpkeepPerHour,
      populationPerHour,
      populationGrowing,
    },
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
  const result = await getAndTickTown(townId);
  if (!result) return void res.status(404).json({ error: "Not found" });
  const { data, cycleReset } = result;
  const { production, ...town } = data as typeof data & {
    production: { gold: number; food: number; wood: number; stone: number };
  };
  const popUpkeep = (town.foodUpkeepPerHour as number) ?? 0;
  const troopUpkeep = (town.troopFoodUpkeepPerHour as number) ?? 0;
  const netFoodPerHour = production.food - popUpkeep - troopUpkeep;
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
    foodUpkeepPerHour: popUpkeep,
    troopFoodUpkeepPerHour: troopUpkeep,
    morale: town.morale ?? 0,
    populationGrowing: town.populationGrowing ?? false,
    lastTickAt: town.lastTickAt instanceof Date ? town.lastTickAt.toISOString() : town.lastTickAt,
    cycleReset,
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

  await performKingdomReset(townId, "manual");

  res.json({ success: true, gold: 200, food: 200, wood: 150, stone: 100 });
});

export { getAndTickTown };
export default router;
