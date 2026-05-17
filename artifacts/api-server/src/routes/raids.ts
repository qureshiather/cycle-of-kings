import { Router } from "express";
import { db } from "@workspace/db";
import { raidsTable, townsTable, armyTable, fortificationsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { simulateCombat, calculateDefenseRating } from "../lib/gameEngine.js";

const router = Router();

router.get("/towns/:townId/raids", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const raids = await db.select().from(raidsTable)
    .where(or(eq(raidsTable.attackerTownId, townId), eq(raidsTable.defenderTownId, townId)));

  const townIds = [...new Set([...raids.map(r => r.attackerTownId), ...raids.map(r => r.defenderTownId)])];
  const towns = townIds.length ? await db.select().from(townsTable) : [];
  const townMap = new Map(towns.map(t => [t.id, t.name]));

  res.json(raids.map(r => ({
    ...r,
    attackerTownName: townMap.get(r.attackerTownId) ?? "Unknown",
    defenderTownName: townMap.get(r.defenderTownId) ?? "Unknown",
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/raids", async (req, res) => {
  const { attackerTownId, defenderTownId, infantry = 0, archers = 0, cavalry = 0, catapults = 0 } = req.body as {
    attackerTownId?: number; defenderTownId?: number;
    infantry?: number; archers?: number; cavalry?: number; catapults?: number;
  };

  if (!attackerTownId || !defenderTownId) return void res.status(400).json({ error: "attackerTownId and defenderTownId required" });
  if (attackerTownId === defenderTownId) return void res.status(400).json({ error: "Cannot raid yourself" });

  const [attArmy] = await db.select().from(armyTable).where(eq(armyTable.townId, attackerTownId)).limit(1);
  if (!attArmy) return void res.status(400).json({ error: "No army" });
  if (attArmy.infantry < infantry || attArmy.archers < archers || attArmy.cavalry < cavalry || attArmy.catapults < catapults) {
    return void res.status(400).json({ error: "Not enough troops" });
  }

  const [defTown] = await db.select().from(townsTable).where(eq(townsTable.id, defenderTownId)).limit(1);
  if (!defTown) return void res.status(400).json({ error: "Defender not found" });

  const defArmy = await db.select().from(armyTable).where(eq(armyTable.townId, defenderTownId)).limit(1);
  const forts = await db.select().from(fortificationsTable).where(eq(fortificationsTable.townId, defenderTownId));

  const defArmyPower = defArmy.length
    ? defArmy[0].infantry * 12 + defArmy[0].archers * 10 + defArmy[0].cavalry * 11
    : 0;
  const fortBonus = calculateDefenseRating(forts);
  const defenderStrength = defArmyPower + fortBonus + defTown.defenseRating;

  await db.update(armyTable).set({
    infantry: attArmy.infantry - infantry,
    archers:  attArmy.archers  - archers,
    cavalry:  attArmy.cavalry  - cavalry,
    catapults: attArmy.catapults - catapults,
    updatedAt: new Date(),
  }).where(eq(armyTable.townId, attackerTownId));

  const { victory, casualties } = simulateCombat({ infantry, archers, cavalry, catapults }, defenderStrength);

  let lootGold = 0, lootFood = 0, lootWood = 0, lootStone = 0;
  if (victory) {
    lootGold  = defTown.gold  * 0.3;
    lootFood  = defTown.food  * 0.3;
    lootWood  = defTown.wood  * 0.3;
    lootStone = defTown.stone * 0.3;

    await db.update(townsTable).set({ gold: defTown.gold - lootGold, food: defTown.food - lootFood, wood: defTown.wood - lootWood, stone: defTown.stone - lootStone }).where(eq(townsTable.id, defenderTownId));

    const [attTown] = await db.select().from(townsTable).where(eq(townsTable.id, attackerTownId)).limit(1);
    if (attTown) await db.update(townsTable).set({ gold: attTown.gold + lootGold, food: attTown.food + lootFood, wood: attTown.wood + lootWood, stone: attTown.stone + lootStone }).where(eq(townsTable.id, attackerTownId));
  }

  const returnInf  = Math.max(0, infantry  - casualties);
  const returnArch = Math.max(0, archers   - Math.floor(casualties * 0.3));
  const returnCav  = Math.max(0, cavalry   - Math.floor(casualties * 0.2));
  const returnCat  = catapults;

  const [attArmyUpdated] = await db.select().from(armyTable).where(eq(armyTable.townId, attackerTownId)).limit(1);
  if (attArmyUpdated) {
    await db.update(armyTable).set({
      infantry:  attArmyUpdated.infantry  + returnInf,
      archers:   attArmyUpdated.archers   + returnArch,
      cavalry:   attArmyUpdated.cavalry   + returnCav,
      catapults: attArmyUpdated.catapults + returnCat,
      updatedAt: new Date(),
    }).where(eq(armyTable.townId, attackerTownId));
  }

  const [attackerTown] = await db.select().from(townsTable).where(eq(townsTable.id, attackerTownId)).limit(1);

  const [raid] = await db.insert(raidsTable).values({
    attackerTownId, defenderTownId,
    result: victory ? "victory" : "defeat",
    attackerInfantry: infantry, attackerArchers: archers, attackerCavalry: cavalry, attackerCatapults: catapults,
    defenderStrength,
    lootGold, lootFood, lootWood, lootStone,
    attackerCasualties: casualties,
  }).returning();

  res.status(201).json({
    ...raid,
    attackerTownName: attackerTown?.name ?? "Unknown",
    defenderTownName: defTown.name,
    createdAt: raid.createdAt.toISOString(),
  });
});

export default router;
