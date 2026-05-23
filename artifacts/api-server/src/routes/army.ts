import { Router } from "express";
import { db } from "@workspace/db";
import { townsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  RECRUIT_COST_PER_TROOP,
  RECRUIT_MS_PER_TROOP,
  getUnitCaps,
  type UnitType,
} from "../lib/gameEngine.js";
import {
  buildArmyResponse,
  loadArmyContext,
  recruitedFromRow,
  resolveArmyTraining,
} from "../lib/armyService.js";
import { armyTable } from "@workspace/db";
import { resolvePendingRaidsForTown } from "./raids.js";
import { initSlotsForTown } from "../lib/slotsInit.js";

const router = Router();

router.get("/towns/:townId/army", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  await resolvePendingRaidsForTown(townId);
  const { slots, army } = await loadArmyContext(townId);
  res.json(buildArmyResponse(townId, slots, army));
});

router.post("/towns/:townId/army/recruit", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const { unit, count } = req.body as { unit?: UnitType; count?: number };

  if (!unit || !["infantry", "archers", "cavalry"].includes(unit)) {
    return void res.status(400).json({ error: "unit must be infantry, archers, or cavalry" });
  }
  const batch = Math.floor(count ?? 0);
  if (batch < 1 || batch > 5) {
    return void res.status(400).json({ error: "count must be between 1 and 5" });
  }

  await initSlotsForTown(townId);
  const { slots } = await loadArmyContext(townId);
  let army = await resolveArmyTraining(townId, slots);

  if (army.trainingEndsAt && army.trainingUnit) {
    return void res.status(400).json({ error: "Training already in progress" });
  }

  const caps = getUnitCaps(slots);
  const cap = caps[unit];
  if (cap <= 0) {
    return void res.status(400).json({ error: `Build ${unit === "cavalry" ? "Stables" : unit === "archers" ? "Archery Range" : "Barracks"} first` });
  }

  const recruited = recruitedFromRow(army);
  const room = cap - recruited[unit];
  if (room <= 0) {
    return void res.status(400).json({ error: "Already at cap for this unit type" });
  }

  const toTrain = Math.min(batch, room);

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  const costPer = RECRUIT_COST_PER_TROOP[unit];
  const totalGold = costPer.gold * toTrain;
  const totalFood = costPer.food * toTrain;
  if (town.gold < totalGold || town.food < totalFood) {
    return void res.status(400).json({
      error: "Insufficient resources",
      cost: { gold: totalGold, food: totalFood, wood: 0, stone: 0 },
    });
  }

  const durationMs = Math.round(RECRUIT_MS_PER_TROOP[unit] * toTrain);
  const trainingEndsAt = new Date(Date.now() + durationMs);

  await db.update(townsTable).set({
    gold: town.gold - totalGold,
    food: town.food - totalFood,
  }).where(eq(townsTable.id, townId));

  const [updated] = await db.update(armyTable).set({
    trainingUnit: unit,
    trainingCount: toTrain,
    trainingEndsAt,
    updatedAt: new Date(),
  }).where(eq(armyTable.townId, townId)).returning();

  army = await resolveArmyTraining(townId, slots);
  res.json(buildArmyResponse(townId, slots, updated ?? army));
});

export default router;
