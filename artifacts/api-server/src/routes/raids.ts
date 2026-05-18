import { Router } from "express";
import { db } from "@workspace/db";
import { raidsTable, townsTable, armyTable, gridCellsTable, fortificationsTable, activitiesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { simulateCombat, calculateDefenseRating, calculateArmyComposition } from "../lib/gameEngine.js";

const router = Router();

function fmtLoot(gold: number, food: number, wood: number, stone: number): string {
  const parts: string[] = [];
  if (gold > 0) parts.push(`${Math.floor(gold)}G`);
  if (food > 0) parts.push(`${Math.floor(food)}F`);
  if (wood > 0) parts.push(`${Math.floor(wood)}W`);
  if (stone > 0) parts.push(`${Math.floor(stone)}St`);
  return parts.join(" · ") || "nothing";
}

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
  const { attackerTownId, defenderTownId, infantry = 0, archers = 0, cavalry = 0 } = req.body as {
    attackerTownId?: number; defenderTownId?: number;
    infantry?: number; archers?: number; cavalry?: number;
  };

  if (!attackerTownId || !defenderTownId) return void res.status(400).json({ error: "attackerTownId and defenderTownId required" });
  if (attackerTownId === defenderTownId) return void res.status(400).json({ error: "Cannot raid yourself" });

  const attCells = await db.select().from(gridCellsTable).where(eq(gridCellsTable.townId, attackerTownId));
  const attComposition = calculateArmyComposition(attCells);
  const armyRows = await db.select().from(armyTable).where(eq(armyTable.townId, attackerTownId)).limit(1);
  const onMission = armyRows[0] ?? { onMissionInfantry: 0, onMissionArchers: 0, onMissionCavalry: 0 };

  const availInfantry = Math.max(0, attComposition.infantry - onMission.onMissionInfantry);
  const availArchers  = Math.max(0, attComposition.archers  - onMission.onMissionArchers);
  const availCavalry  = Math.max(0, attComposition.cavalry  - onMission.onMissionCavalry);

  if (infantry > availInfantry || archers > availArchers || cavalry > availCavalry) {
    return void res.status(400).json({ error: "Not enough available troops" });
  }
  if (infantry + archers + cavalry === 0) {
    return void res.status(400).json({ error: "Must send at least 1 troop" });
  }

  const [defTown] = await db.select().from(townsTable).where(eq(townsTable.id, defenderTownId)).limit(1);
  if (!defTown) return void res.status(400).json({ error: "Defender not found" });

  const defCells = await db.select().from(gridCellsTable).where(eq(gridCellsTable.townId, defenderTownId));
  const defComposition = calculateArmyComposition(defCells);
  const forts = await db.select().from(fortificationsTable).where(eq(fortificationsTable.townId, defenderTownId));

  const fortBonus = calculateDefenseRating(forts);
  const defenderStrength = defComposition.totalPower + fortBonus + defTown.defenseRating;

  const { victory, casualties } = simulateCombat({ infantry, archers, cavalry }, defenderStrength);

  let lootGold = 0, lootFood = 0, lootWood = 0, lootStone = 0;
  if (victory) {
    lootGold  = defTown.gold  * 0.3;
    lootFood  = defTown.food  * 0.3;
    lootWood  = defTown.wood  * 0.3;
    lootStone = defTown.stone * 0.3;

    await db.update(townsTable)
      .set({ gold: defTown.gold - lootGold, food: defTown.food - lootFood, wood: defTown.wood - lootWood, stone: defTown.stone - lootStone })
      .where(eq(townsTable.id, defenderTownId));

    const [attTown] = await db.select().from(townsTable).where(eq(townsTable.id, attackerTownId)).limit(1);
    if (attTown) {
      await db.update(townsTable)
        .set({ gold: attTown.gold + lootGold, food: attTown.food + lootFood, wood: attTown.wood + lootWood, stone: attTown.stone + lootStone })
        .where(eq(townsTable.id, attackerTownId));
    }
  }

  const [attackerTown] = await db.select().from(townsTable).where(eq(townsTable.id, attackerTownId)).limit(1);

  const [raid] = await db.insert(raidsTable).values({
    attackerTownId, defenderTownId,
    result: victory ? "victory" : "defeat",
    attackerInfantry: infantry, attackerArchers: archers, attackerCavalry: cavalry, attackerCatapults: 0,
    defenderStrength,
    lootGold, lootFood, lootWood, lootStone,
    attackerCasualties: casualties,
  }).returning();

  // Activity for attacker
  await db.insert(activitiesTable).values({
    townId: attackerTownId,
    type: victory ? "raid_outgoing_win" : "raid_outgoing_loss",
    title: victory ? "Raid Victory!" : "Raid Defeated",
    body: victory
      ? `Raided ${defTown.name} — plundered ${fmtLoot(lootGold, lootFood, lootWood, lootStone)}. Lost ${casualties} troops.`
      : `Attacked ${defTown.name} but were repelled. Lost ${casualties} troops.`,
    icon: victory ? "sword" : "shield-off",
    iconColor: victory ? "#d4a520" : "#cc4040",
  });

  // Activity for defender
  await db.insert(activitiesTable).values({
    townId: defenderTownId,
    type: victory ? "raid_incoming_loss" : "raid_incoming_win",
    title: victory ? "Your Kingdom Was Raided!" : "Raid Repelled!",
    body: victory
      ? `${attackerTown?.name ?? "An enemy"} raided your kingdom and took ${fmtLoot(lootGold, lootFood, lootWood, lootStone)}.`
      : `${attackerTown?.name ?? "An enemy"} attacked your kingdom but your defenses held!`,
    icon: victory ? "shield-alert" : "shield-check",
    iconColor: victory ? "#cc4040" : "#3d7a35",
  });

  res.status(201).json({
    ...raid,
    attackerTownName: attackerTown?.name ?? "Unknown",
    defenderTownName: defTown.name,
    createdAt: raid.createdAt.toISOString(),
  });
});

export default router;
