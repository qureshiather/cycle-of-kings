import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable, townsTable, armyTable, trophiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/players", async (req, res) => {
  const { deviceId, name } = req.body as { deviceId?: string; name?: string };
  if (!deviceId || !name) return void res.status(400).json({ error: "deviceId and name required" });

  const existing = await db.select().from(playersTable).where(eq(playersTable.deviceId, deviceId)).limit(1);
  if (existing.length > 0) {
    const p = existing[0];
    const towns = await db.select().from(townsTable).where(eq(townsTable.playerId, p.id)).limit(1);
    return void res.json({ ...p, townId: towns[0]?.id ?? null, createdAt: p.createdAt.toISOString() });
  }

  const [player] = await db.insert(playersTable).values({ deviceId, name }).returning();
  const [town] = await db.insert(townsTable).values({
    playerId: player.id,
    name: `${name}'s Kingdom`,
    gold: 200, food: 200, wood: 100, stone: 100,
  }).returning();

  await db.insert(armyTable).values({ townId: town.id, infantry: 0, archers: 0, cavalry: 0, catapults: 0, capacity: 20 });

  res.json({ ...player, townId: town.id, createdAt: player.createdAt.toISOString() });
});

router.get("/players/:playerId", async (req, res) => {
  const playerId = parseInt(req.params["playerId"] ?? "");
  const rows = await db.select().from(playersTable).where(eq(playersTable.id, playerId)).limit(1);
  if (!rows.length) return void res.status(404).json({ error: "Not found" });
  const p = rows[0];
  const towns = await db.select().from(townsTable).where(eq(townsTable.playerId, p.id)).limit(1);
  res.json({ ...p, townId: towns[0]?.id ?? null, createdAt: p.createdAt.toISOString() });
});

router.get("/players/:playerId/trophies", async (req, res) => {
  const playerId = parseInt(req.params["playerId"] ?? "");
  const rows = await db.select().from(trophiesTable).where(eq(trophiesTable.playerId, playerId));
  res.json(rows.map(t => ({ ...t, earnedAt: t.earnedAt.toISOString() })));
});

export default router;
