import { Router } from "express";
import { db } from "@workspace/db";
import { townsTable, playersTable, gridCellsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { calculateArmyComposition } from "../lib/gameEngine.js";

const router = Router();

router.get("/leaderboard", async (_req, res) => {
  const towns = await db.select().from(townsTable);
  const players = await db.select().from(playersTable);
  const allCells = await db.select().from(gridCellsTable);

  const playerMap = new Map(players.map(p => [p.id, p.name]));

  const cellsByTown = new Map<number, typeof allCells>();
  for (const cell of allCells) {
    if (!cellsByTown.has(cell.townId)) cellsByTown.set(cell.townId, []);
    cellsByTown.get(cell.townId)!.push(cell);
  }

  const entries = towns.map(town => {
    const cells = cellsByTown.get(town.id) ?? [];
    const composition = calculateArmyComposition(cells);
    const militaryPower = composition.totalPower;
    const score = Math.floor(
      town.gold + town.food * 0.5 + town.wood * 0.5 + town.stone * 0.5 +
      militaryPower * 2 + town.population * 10
    );
    return {
      townId: town.id,
      townName: town.name,
      playerId: town.playerId,
      playerName: playerMap.get(town.playerId) ?? "Unknown",
      score,
      gold: Math.floor(town.gold),
      population: town.population,
      militaryPower,
    };
  });

  entries.sort((a, b) => b.score - a.score);
  res.json(entries.map((e, i) => ({ ...e, rank: i + 1 })));
});

export default router;
