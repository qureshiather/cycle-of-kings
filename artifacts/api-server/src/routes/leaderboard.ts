import { Router } from "express";
import { db } from "@workspace/db";
import { townsTable, playersTable, armyTable } from "@workspace/db";

const router = Router();

router.get("/leaderboard", async (_req, res) => {
  const towns = await db.select().from(townsTable);
  const players = await db.select().from(playersTable);
  const armies = await db.select().from(armyTable);

  const playerMap = new Map(players.map(p => [p.id, p.name]));
  const armyMap = new Map(armies.map(a => [a.townId, a]));

  const entries = towns.map(town => {
    const army = armyMap.get(town.id);
    const militaryPower = army ? army.infantry * 10 + army.archers * 15 + army.cavalry * 12 + army.catapults * 30 : 0;
    const score = town.gold + town.food * 0.5 + town.wood * 0.5 + town.stone * 0.5 + militaryPower * 2 + town.population * 10;
    return {
      townId: town.id,
      townName: town.name,
      playerId: town.playerId,
      playerName: playerMap.get(town.playerId) ?? "Unknown",
      score: Math.floor(score),
      gold: Math.floor(town.gold),
      population: town.population,
      militaryPower,
    };
  });

  entries.sort((a, b) => b.score - a.score);
  res.json(entries.map((e, i) => ({ ...e, rank: i + 1 })));
});

export default router;
