import { Router } from "express";
import { db } from "@workspace/db";
import { townsTable, gridCellsTable, fortificationsTable, playersTable, armyTable, missionsTable, activitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  getCurrentSeasonInfo, calculateProduction, calculateArmyCapacity, calculatePopulation,
  calculateDefenseRating, calculateBuildingCost, getUpgradeDurationMs, isBorderCell,
  applyTick, REFUND_RATIO, GRID_SIZE,
} from "../lib/gameEngine.js";

const router = Router();

const BUILDING_NAMES: Record<string, string> = {
  farm: "Farm", mine: "Mine", quarry: "Quarry", lumberMill: "Lumber Mill",
  barracks: "Barracks", archeryRange: "Archery Range", stables: "Stables",
  market: "Market", tavern: "Tavern", house: "House",
};

async function getAndTickTown(townId: number) {
  const rows = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!rows.length) return null;
  const town = rows[0];
  const cells = await db.select().from(gridCellsTable).where(eq(gridCellsTable.townId, townId));
  const forts = await db.select().from(fortificationsTable).where(eq(fortificationsTable.townId, townId));

  // Complete any finished upgrades
  const now = new Date();
  for (const cell of cells) {
    if (cell.upgrading && cell.upgradeEndsAt && cell.upgradeEndsAt <= now) {
      await db.update(gridCellsTable).set({ upgrading: false }).where(eq(gridCellsTable.id, cell.id));
      await db.insert(activitiesTable).values({
        townId,
        type: "upgrade_complete",
        title: "Building Upgraded",
        body: `${BUILDING_NAMES[cell.buildingType] ?? cell.buildingType} reached level ${cell.level}`,
        icon: "arrow-up-bold-circle",
        iconColor: "#d4a520",
      });
    }
  }

  const { season } = getCurrentSeasonInfo();
  const production = calculateProduction(cells, season);
  const tickedResources = applyTick(town, production);
  const capacity = calculateArmyCapacity(cells);
  const { population, populationCap } = calculatePopulation(cells);
  const defenseRating = calculateDefenseRating(forts);

  await db.update(townsTable)
    .set({ gold: tickedResources.gold, food: tickedResources.food, wood: tickedResources.wood, stone: tickedResources.stone, defenseRating, population, populationCap, lastTickAt: new Date() })
    .where(eq(townsTable.id, townId));

  return { ...town, ...tickedResources, defenseRating, population, populationCap, production };
}

router.get("/towns", async (_req, res) => {
  const towns = await db.select({
    id: townsTable.id,
    name: townsTable.name,
    playerId: townsTable.playerId,
    defenseRating: townsTable.defenseRating,
    population: townsTable.population,
    peacefulMode: townsTable.peacefulMode,
  }).from(townsTable);

  const playerIds = [...new Set(towns.map(t => t.playerId))];
  const players = playerIds.length
    ? await db.select({ id: playersTable.id, name: playersTable.name }).from(playersTable)
    : [];
  const playerMap = new Map(players.map(p => [p.id, p.name]));

  res.json(towns.map(t => ({ ...t, playerName: playerMap.get(t.playerId) ?? "Unknown" })));
});

router.get("/towns/:townId", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const data = await getAndTickTown(townId);
  if (!data) return void res.status(404).json({ error: "Not found" });
  const { production, ...town } = data;
  const cells = await db.select().from(gridCellsTable).where(eq(gridCellsTable.townId, townId));
  const { season } = getCurrentSeasonInfo();
  const prod = calculateProduction(cells, season);

  res.json({
    ...town,
    goldPerHour: prod.gold,
    foodPerHour: prod.food,
    woodPerHour: prod.wood,
    stonePerHour: prod.stone,
    lastTickAt: town.lastTickAt instanceof Date ? town.lastTickAt.toISOString() : town.lastTickAt,
  });
});

router.get("/towns/:townId/grid", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const cells = await db.select().from(gridCellsTable).where(eq(gridCellsTable.townId, townId));
  res.json(cells.map(c => ({
    ...c,
    upgradeEndsAt: c.upgradeEndsAt?.toISOString() ?? null,
  })));
});

router.post("/towns/:townId/buildings", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const { row, col, buildingType } = req.body as { row?: number; col?: number; buildingType?: string };

  if (row === undefined || col === undefined || !buildingType) return void res.status(400).json({ error: "row, col, buildingType required" });
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return void res.status(400).json({ error: "Out of bounds" });

  const towns = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!towns.length) return void res.status(404).json({ error: "Town not found" });
  const town = towns[0];

  const occupied = await db.select().from(gridCellsTable)
    .where(and(eq(gridCellsTable.townId, townId), eq(gridCellsTable.row, row), eq(gridCellsTable.col, col)))
    .limit(1);
  if (occupied.length) return void res.status(400).json({ error: "Cell occupied" });

  const cost = calculateBuildingCost(buildingType, 1);
  if (town.gold < cost.gold || town.food < cost.food || town.wood < cost.wood || town.stone < cost.stone) {
    return void res.status(400).json({ error: "Insufficient resources", cost });
  }

  await db.update(townsTable).set({
    gold: town.gold - cost.gold,
    food: town.food - cost.food,
    wood: town.wood - cost.wood,
    stone: town.stone - cost.stone,
  }).where(eq(townsTable.id, townId));

  const [cell] = await db.insert(gridCellsTable).values({ townId, row, col, buildingType, level: 1, upgrading: false }).returning();

  await db.insert(activitiesTable).values({
    townId,
    type: "building_placed",
    title: "Building Constructed",
    body: `${BUILDING_NAMES[buildingType] ?? buildingType} placed at (${row},${col})`,
    icon: "hammer-wrench",
    iconColor: "#7a7a6a",
  });

  res.status(201).json({ ...cell, upgradeEndsAt: null });
});

router.patch("/towns/:townId/buildings/:row/:col", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const fromRow = parseInt(req.params["row"] ?? "");
  const fromCol = parseInt(req.params["col"] ?? "");
  const { newRow, newCol } = req.body as { newRow?: number; newCol?: number };

  if (newRow === undefined || newCol === undefined) return void res.status(400).json({ error: "newRow, newCol required" });
  if (newRow < 0 || newRow >= GRID_SIZE || newCol < 0 || newCol >= GRID_SIZE) return void res.status(400).json({ error: "Out of bounds" });

  const [existing] = await db.select().from(gridCellsTable)
    .where(and(eq(gridCellsTable.townId, townId), eq(gridCellsTable.row, fromRow), eq(gridCellsTable.col, fromCol)));
  if (!existing) return void res.status(404).json({ error: "No building there" });

  const target = await db.select().from(gridCellsTable)
    .where(and(eq(gridCellsTable.townId, townId), eq(gridCellsTable.row, newRow), eq(gridCellsTable.col, newCol)));
  if (target.length) return void res.status(400).json({ error: "Target cell occupied" });

  const [updated] = await db.update(gridCellsTable)
    .set({ row: newRow, col: newCol })
    .where(eq(gridCellsTable.id, existing.id))
    .returning();
  res.json({ ...updated, upgradeEndsAt: updated.upgradeEndsAt?.toISOString() ?? null });
});

router.delete("/towns/:townId/buildings/:row/:col", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const row = parseInt(req.params["row"] ?? "");
  const col = parseInt(req.params["col"] ?? "");

  const [cell] = await db.select().from(gridCellsTable)
    .where(and(eq(gridCellsTable.townId, townId), eq(gridCellsTable.row, row), eq(gridCellsTable.col, col)));
  if (!cell || cell.buildingType === "empty") return void res.status(404).json({ error: "No building there" });

  const cost = calculateBuildingCost(cell.buildingType, cell.level);
  const refund = {
    gold:  cost.gold  * REFUND_RATIO,
    food:  cost.food  * REFUND_RATIO,
    wood:  cost.wood  * REFUND_RATIO,
    stone: cost.stone * REFUND_RATIO,
  };

  await db.delete(gridCellsTable).where(eq(gridCellsTable.id, cell.id));

  const [towns] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (towns) {
    await db.update(townsTable).set({
      gold:  towns.gold  + refund.gold,
      food:  towns.food  + refund.food,
      wood:  towns.wood  + refund.wood,
      stone: towns.stone + refund.stone,
    }).where(eq(townsTable.id, townId));
  }

  const updatedTown = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  const t = updatedTown[0];
  const cells = await db.select().from(gridCellsTable).where(eq(gridCellsTable.townId, townId));
  const { season } = getCurrentSeasonInfo();
  const prod = calculateProduction(cells, season);

  res.json({ ...t, goldPerHour: prod.gold, foodPerHour: prod.food, woodPerHour: prod.wood, stonePerHour: prod.stone, lastTickAt: t?.lastTickAt?.toISOString() });
});

router.post("/towns/:townId/buildings/:row/:col/upgrade", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const row = parseInt(req.params["row"] ?? "");
  const col = parseInt(req.params["col"] ?? "");

  const [cell] = await db.select().from(gridCellsTable)
    .where(and(eq(gridCellsTable.townId, townId), eq(gridCellsTable.row, row), eq(gridCellsTable.col, col)));
  if (!cell || cell.buildingType === "empty") return void res.status(400).json({ error: "No building there" });
  if (cell.upgrading) return void res.status(400).json({ error: "Already upgrading" });
  if (cell.level >= 10) return void res.status(400).json({ error: "Max level reached" });

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  const nextLevel = cell.level + 1;
  const cost = calculateBuildingCost(cell.buildingType, nextLevel);
  if (town.gold < cost.gold || town.food < cost.food || town.wood < cost.wood || town.stone < cost.stone) {
    return void res.status(400).json({ error: "Insufficient resources", cost });
  }

  const durationMs = getUpgradeDurationMs(cell.buildingType, cell.level);
  const upgradeEndsAt = new Date(Date.now() + durationMs);

  await db.update(townsTable).set({ gold: town.gold - cost.gold, food: town.food - cost.food, wood: town.wood - cost.wood, stone: town.stone - cost.stone }).where(eq(townsTable.id, townId));

  const [updated] = await db.update(gridCellsTable)
    .set({ upgrading: true, upgradeEndsAt, level: nextLevel })
    .where(eq(gridCellsTable.id, cell.id))
    .returning();

  const durationStr = durationMs < 60000
    ? `${Math.round(durationMs / 1000)}s`
    : durationMs < 3600000
      ? `${Math.round(durationMs / 60000)}m`
      : `${Math.round(durationMs / 3600000)}h`;

  await db.insert(activitiesTable).values({
    townId,
    type: "upgrade_started",
    title: "Upgrade Started",
    body: `${BUILDING_NAMES[cell.buildingType] ?? cell.buildingType} upgrading to level ${nextLevel} — done in ${durationStr}`,
    icon: "clock-outline",
    iconColor: "#7a7a9a",
  });

  res.json({ ...updated, upgradeEndsAt: updated.upgradeEndsAt?.toISOString() ?? null });
});

router.get("/towns/:townId/fortifications", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const forts = await db.select().from(fortificationsTable).where(eq(fortificationsTable.townId, townId));
  res.json(forts.map(f => ({ ...f })));
});

router.post("/towns/:townId/fortifications", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const { row, col, type } = req.body as { row?: number; col?: number; type?: string };
  if (row === undefined || col === undefined || !type) return void res.status(400).json({ error: "row, col, type required" });

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  const cost = type === "tower"
    ? { wood: 20, stone: 50, gold: 10, food: 0 }
    : { wood: 0, stone: 30, gold: 0, food: 0 };

  if (town.gold < cost.gold || town.wood < cost.wood || town.stone < cost.stone) {
    return void res.status(400).json({ error: "Insufficient resources" });
  }

  const borderBonus = isBorderCell(row, col);

  await db.update(townsTable).set({ gold: town.gold - cost.gold, wood: town.wood - cost.wood, stone: town.stone - cost.stone }).where(eq(townsTable.id, townId));

  const [fort] = await db.insert(fortificationsTable).values({ townId, row, col, type, level: 1, borderBonus }).returning();
  res.status(201).json(fort);
});

router.patch("/towns/:townId/peaceful", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const { peaceful } = req.body as { peaceful?: boolean };
  if (peaceful === undefined) return void res.status(400).json({ error: "peaceful boolean required" });

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  await db.update(townsTable).set({ peacefulMode: peaceful }).where(eq(townsTable.id, townId));
  res.json({ peacefulMode: peaceful });
});

router.post("/towns/:townId/reset", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  await db.delete(gridCellsTable).where(eq(gridCellsTable.townId, townId));
  await db.delete(fortificationsTable).where(eq(fortificationsTable.townId, townId));
  await db.delete(armyTable).where(eq(armyTable.townId, townId));
  await db.delete(missionsTable).where(eq(missionsTable.townId, townId));

  await db.update(townsTable).set({
    gold: 200, food: 200, wood: 150, stone: 100,
    defenseRating: 10, population: 8, populationCap: 10,
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

router.delete("/towns/:townId/fortifications/:row/:col", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const row = parseInt(req.params["row"] ?? "");
  const col = parseInt(req.params["col"] ?? "");

  await db.delete(fortificationsTable)
    .where(and(eq(fortificationsTable.townId, townId), eq(fortificationsTable.row, row), eq(fortificationsTable.col, col)));

  const [t] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  res.json(t ? { ...t, lastTickAt: t.lastTickAt.toISOString() } : {});
});

export default router;
