import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable, townsTable, armyTable, trophiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { initSlotsForTown } from "./slots.js";
import { getCurrentSeasonInfo } from "../lib/gameEngine.js";
import { authUserIdFrom, requireAuth } from "../middleware/requireAuth.js";
import { toPlayerJson } from "../lib/playerResponse.js";

const router = Router();

const MIN_RULER_NAME_LENGTH = 2;
const MAX_RULER_NAME_LENGTH = 14;

async function townIdForPlayer(playerId: number): Promise<number | null> {
  const towns = await db.select().from(townsTable).where(eq(townsTable.playerId, playerId)).limit(1);
  return towns[0]?.id ?? null;
}

router.get("/players/me", requireAuth, async (_req, res) => {
  const authUserId = authUserIdFrom(res);
  const rows = await db.select().from(playersTable).where(eq(playersTable.authUserId, authUserId)).limit(1);
  if (!rows.length) return void res.status(404).json({ error: "No kingdom for this account" });
  const townId = await townIdForPlayer(rows[0].id);
  res.json(toPlayerJson(rows[0], townId));
});

router.post("/players", requireAuth, async (req, res) => {
  const authUserId = authUserIdFrom(res);
  const { name } = req.body as { name?: string };
  if (!name?.trim()) return void res.status(400).json({ error: "name required" });

  const trimmedName = name.trim();
  if (trimmedName.length < MIN_RULER_NAME_LENGTH || trimmedName.length > MAX_RULER_NAME_LENGTH) {
    return void res.status(400).json({
      error: `Name must be ${MIN_RULER_NAME_LENGTH}–${MAX_RULER_NAME_LENGTH} characters`,
    });
  }

  const existing = await db.select().from(playersTable).where(eq(playersTable.authUserId, authUserId)).limit(1);
  if (existing.length > 0) {
    const townId = await townIdForPlayer(existing[0].id);
    return void res.json(toPlayerJson(existing[0], townId));
  }

  const nameTaken = await db.select().from(playersTable).where(eq(playersTable.name, trimmedName)).limit(1);
  if (nameTaken.length > 0) {
    return void res.status(409).json({ error: "Name already taken. Choose a different ruler name." });
  }

  const { cycleNumber } = getCurrentSeasonInfo();
  const [player] = await db
    .insert(playersTable)
    .values({ authUserId, name: trimmedName })
    .returning();
  const [town] = await db
    .insert(townsTable)
    .values({
      playerId: player.id,
      name: `${trimmedName}'s Kingdom`,
      gold: 200,
      food: 200,
      wood: 150,
      stone: 100,
      lastPlayedCycleNumber: cycleNumber,
    })
    .returning();

  await db.insert(armyTable).values({ townId: town.id });
  await initSlotsForTown(town.id);

  res.json(toPlayerJson(player, town.id));
});

router.get("/players/:playerId", async (req, res) => {
  const playerId = parseInt(req.params["playerId"] ?? "");
  const rows = await db.select().from(playersTable).where(eq(playersTable.id, playerId)).limit(1);
  if (!rows.length) return void res.status(404).json({ error: "Not found" });
  const townId = await townIdForPlayer(rows[0].id);
  res.json(toPlayerJson(rows[0], townId));
});

router.get("/players/:playerId/trophies", async (req, res) => {
  const playerId = parseInt(req.params["playerId"] ?? "");
  const rows = await db.select().from(trophiesTable).where(eq(trophiesTable.playerId, playerId));
  res.json(rows.map(t => ({ ...t, earnedAt: t.earnedAt.toISOString() })));
});

export default router;
