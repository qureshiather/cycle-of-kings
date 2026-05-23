import { Router } from "express";
import { db } from "@workspace/db";
import { townsTable, playersTable, buildingSlotsTable, armyTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { calculateEconomyScore, calculateArmyComposition } from "../lib/gameEngine.js";

const router = Router();

router.get("/leaderboard", async (_req, res) => {
  const towns = await db.select().from(townsTable);
  const players = await db.select().from(playersTable);
  const allSlots = await db.select().from(buildingSlotsTable);
  const allArmy = await db.select().from(armyTable);

  const playerMap = new Map(players.map(p => [p.id, p.name]));

  const slotsByTown = new Map<number, typeof allSlots>();
  for (const slot of allSlots) {
    if (!slotsByTown.has(slot.townId)) slotsByTown.set(slot.townId, []);
    slotsByTown.get(slot.townId)!.push(slot);
  }

  const armyByTown = new Map(allArmy.map(a => [a.townId, a]));

  const competitiveTowns = towns.filter((town) => !town.peacefulMode);

  const entries = competitiveTowns.map(town => {
    const slots = slotsByTown.get(town.id) ?? [];
    const economyScore = calculateEconomyScore(slots);
    const army = armyByTown.get(town.id);
    const recruited = {
      infantry: army?.infantry ?? 0,
      archers: army?.archers ?? 0,
      cavalry: army?.cavalry ?? 0,
    };
    const composition = calculateArmyComposition(slots, recruited);
    const armyScore = composition.totalPower;
    const score = economyScore + armyScore;

    return {
      townId: town.id,
      townName: town.name,
      playerId: town.playerId,
      playerName: playerMap.get(town.playerId) ?? "Unknown",
      score,
      economyScore,
      armyScore,
      gold: Math.floor(town.gold),
    };
  });

  entries.sort((a, b) => b.score - a.score);
  res.json(entries.map((e, i) => ({ ...e, rank: i + 1 })));
});

export default router;
