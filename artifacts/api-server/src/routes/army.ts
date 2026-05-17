import { Router } from "express";
import { db } from "@workspace/db";
import { armyTable, townsTable, gridCellsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { calculateArmyCapacity } from "../lib/gameEngine.js";

const router = Router();

const RECRUIT_COSTS: Record<string, { gold: number; food: number; wood: number; stone: number }> = {
  infantry: { gold: 10, food: 5, wood: 0, stone: 0 },
  archers:  { gold: 15, food: 5, wood: 5, stone: 0 },
  cavalry:  { gold: 25, food: 10, wood: 0, stone: 0 },
  catapults:{ gold: 50, food: 5, wood: 30, stone: 20 },
};

router.get("/towns/:townId/army", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const rows = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
  const cells = await db.select().from(gridCellsTable).where(eq(gridCellsTable.townId, townId));
  const capacity = calculateArmyCapacity(cells);

  if (!rows.length) {
    return void res.json({ townId, infantry: 0, archers: 0, cavalry: 0, catapults: 0, onMissionInfantry: 0, onMissionArchers: 0, onMissionCavalry: 0, onMissionCatapults: 0, capacity });
  }
  res.json({ ...rows[0], capacity });
});

router.post("/towns/:townId/army/recruit", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const { infantry = 0, archers = 0, cavalry = 0, catapults = 0 } = req.body as { infantry?: number; archers?: number; cavalry?: number; catapults?: number };

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  const armyRows = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
  const cells = await db.select().from(gridCellsTable).where(eq(gridCellsTable.townId, townId));
  const capacity = calculateArmyCapacity(cells);

  const currentArmy = armyRows[0] ?? { infantry: 0, archers: 0, cavalry: 0, catapults: 0, onMissionInfantry: 0, onMissionArchers: 0, onMissionCavalry: 0, onMissionCatapults: 0 };
  const totalCurrent = currentArmy.infantry + currentArmy.archers + currentArmy.cavalry + currentArmy.catapults;
  const totalNew = infantry + archers + cavalry + catapults;

  if (totalCurrent + totalNew > capacity) return void res.status(400).json({ error: "Exceeds army capacity" });

  const totalCost = {
    gold:  infantry * RECRUIT_COSTS.infantry.gold  + archers * RECRUIT_COSTS.archers.gold  + cavalry * RECRUIT_COSTS.cavalry.gold  + catapults * RECRUIT_COSTS.catapults.gold,
    food:  infantry * RECRUIT_COSTS.infantry.food  + archers * RECRUIT_COSTS.archers.food  + cavalry * RECRUIT_COSTS.cavalry.food  + catapults * RECRUIT_COSTS.catapults.food,
    wood:  infantry * RECRUIT_COSTS.infantry.wood  + archers * RECRUIT_COSTS.archers.wood  + cavalry * RECRUIT_COSTS.cavalry.wood  + catapults * RECRUIT_COSTS.catapults.wood,
    stone: infantry * RECRUIT_COSTS.infantry.stone + archers * RECRUIT_COSTS.archers.stone + cavalry * RECRUIT_COSTS.cavalry.stone + catapults * RECRUIT_COSTS.catapults.stone,
  };

  if (town.gold < totalCost.gold || town.food < totalCost.food || town.wood < totalCost.wood || town.stone < totalCost.stone) {
    return void res.status(400).json({ error: "Insufficient resources", totalCost });
  }

  await db.update(townsTable).set({ gold: town.gold - totalCost.gold, food: town.food - totalCost.food, wood: town.wood - totalCost.wood, stone: town.stone - totalCost.stone }).where(eq(townsTable.id, townId));

  if (!armyRows.length) {
    const [a] = await db.insert(armyTable).values({ townId, infantry, archers, cavalry, catapults, capacity }).returning();
    return void res.json({ ...a, capacity });
  }

  const [updated] = await db.update(armyTable).set({
    infantry:  currentArmy.infantry  + infantry,
    archers:   currentArmy.archers   + archers,
    cavalry:   currentArmy.cavalry   + cavalry,
    catapults: currentArmy.catapults + catapults,
    capacity,
    updatedAt: new Date(),
  }).where(eq(armyTable.townId, townId)).returning();

  res.json({ ...updated, capacity });
});

export default router;
