import { Router } from "express";
import { db } from "@workspace/db";
import {
  townsTable,
  buildingSlotsTable,
  activitiesTable,
  seasonObjectiveClaimsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  SEASON_OBJECTIVE_BY_ID,
  buildSeasonObjectiveList,
} from "@workspace/season-objectives";
import { getCurrentSeasonInfo } from "../lib/gameEngine.js";
import { loadArmyContext, recruitedFromRow } from "../lib/armyService.js";
import { calculateArmyComposition, calculateEconomyScore } from "../lib/gameEngine.js";

const router = Router();

async function loadObjectiveContext(townId: number) {
  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return null;

  const { season, cycleNumber, seasonIndex, cycleStartedAt } = getCurrentSeasonInfo();
  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const { army } = await loadArmyContext(townId);
  const recruited = recruitedFromRow(army);
  const comp = calculateArmyComposition(slots, recruited);

  const snapshot = {
    gold: town.gold,
    food: town.food,
    wood: town.wood,
    stone: town.stone,
    peacefulMode: town.peacefulMode,
    economyScore: calculateEconomyScore(slots),
    armyScore: comp.totalPower,
    population: town.population,
    slots: slots.map((s) => ({ slotType: s.slotType, level: s.level })),
  };

  const claims = await db
    .select()
    .from(seasonObjectiveClaimsTable)
    .where(
      and(
        eq(seasonObjectiveClaimsTable.townId, townId),
        eq(seasonObjectiveClaimsTable.cycleNumber, cycleNumber),
        eq(seasonObjectiveClaimsTable.seasonIndex, seasonIndex),
      ),
    );

  const activities = await db
    .select({ type: activitiesTable.type, createdAt: activitiesTable.createdAt })
    .from(activitiesTable)
    .where(eq(activitiesTable.townId, townId));

  return {
    town,
    season,
    cycleNumber,
    seasonIndex,
    cycleStartedAt,
    snapshot,
    claimedIds: new Set(claims.map((c) => c.objectiveId)),
    activities,
  };
}

router.get("/towns/:townId/season-objectives", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const ctx = await loadObjectiveContext(townId);
  if (!ctx) return void res.status(404).json({ error: "Town not found" });

  const objectives = buildSeasonObjectiveList(
    ctx.season,
    ctx.snapshot,
    ctx.activities,
    ctx.cycleStartedAt,
    ctx.seasonIndex,
    ctx.claimedIds,
  );

  res.json({
    season: ctx.season,
    cycleNumber: ctx.cycleNumber,
    seasonIndex: ctx.seasonIndex,
    objectives,
  });
});

router.post("/towns/:townId/season-objectives/:objectiveId/claim", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const objectiveId = req.params["objectiveId"] ?? "";
  const def = SEASON_OBJECTIVE_BY_ID[objectiveId];
  if (!def) return void res.status(404).json({ error: "Unknown objective" });

  const ctx = await loadObjectiveContext(townId);
  if (!ctx) return void res.status(404).json({ error: "Town not found" });

  if (def.season !== ctx.season) {
    return void res.status(400).json({ error: "This objective is not active this season" });
  }

  if (ctx.claimedIds.has(objectiveId)) {
    return void res.status(400).json({ error: "Already claimed" });
  }

  const objectives = buildSeasonObjectiveList(
    ctx.season,
    ctx.snapshot,
    ctx.activities,
    ctx.cycleStartedAt,
    ctx.seasonIndex,
    ctx.claimedIds,
  );
  const progress = objectives.find((o) => o.id === objectiveId);
  if (!progress?.complete) {
    return void res.status(400).json({ error: "Objective not complete yet" });
  }

  const reward = def.reward;
  await db
    .update(townsTable)
    .set({
      gold: ctx.town.gold + reward.gold,
      food: ctx.town.food + reward.food,
      wood: ctx.town.wood + reward.wood,
      stone: ctx.town.stone + reward.stone,
    })
    .where(eq(townsTable.id, townId));

  await db.insert(seasonObjectiveClaimsTable).values({
    townId,
    cycleNumber: ctx.cycleNumber,
    seasonIndex: ctx.seasonIndex,
    objectiveId,
  });

  await db.insert(activitiesTable).values({
    townId,
    type: "season_objective_claimed",
    title: "Season objective complete",
    body: `${def.title}: claimed ${reward.gold}G, ${reward.food}F, ${reward.wood}W, ${reward.stone}S`,
    icon: "flag-checkered",
    iconColor: "#d4a520",
  });

  res.json({
    objectiveId,
    reward,
    gold: ctx.town.gold + reward.gold,
    food: ctx.town.food + reward.food,
    wood: ctx.town.wood + reward.wood,
    stone: ctx.town.stone + reward.stone,
  });
});

export default router;
