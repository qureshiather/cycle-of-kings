import { Router } from "express";
import { db } from "@workspace/db";
import { tradeRoutesTable, townsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/towns/:townId/trades", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const routes = await db.select().from(tradeRoutesTable)
    .where(eq(tradeRoutesTable.fromTownId, townId));

  const townIds = [...new Set([...routes.map(r => r.fromTownId), ...routes.map(r => r.toTownId)])];
  const towns = townIds.length ? await db.select().from(townsTable) : [];
  const townMap = new Map(towns.map(t => [t.id, t.name]));

  res.json(routes.map(r => ({
    ...r,
    fromTownName: townMap.get(r.fromTownId) ?? "Unknown",
    toTownName:   townMap.get(r.toTownId)   ?? "Unknown",
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/towns/:townId/trades", async (req, res) => {
  const fromTownId = parseInt(req.params["townId"] ?? "");
  const { toTownId, resourceType, amountPerHour } = req.body as { toTownId?: number; resourceType?: string; amountPerHour?: number };

  if (!toTownId || !resourceType || !amountPerHour) return void res.status(400).json({ error: "toTownId, resourceType, amountPerHour required" });
  if (fromTownId === toTownId) return void res.status(400).json({ error: "Cannot trade with yourself" });

  const [toTown] = await db.select().from(townsTable).where(eq(townsTable.id, toTownId)).limit(1);
  if (!toTown) return void res.status(400).json({ error: "Destination town not found" });

  const [fromTown] = await db.select().from(townsTable).where(eq(townsTable.id, fromTownId)).limit(1);

  const [route] = await db.insert(tradeRoutesTable).values({ fromTownId, toTownId, resourceType, amountPerHour, active: true }).returning();
  res.status(201).json({
    ...route,
    fromTownName: fromTown?.name ?? "Unknown",
    toTownName: toTown.name,
    createdAt: route.createdAt.toISOString(),
  });
});

router.delete("/towns/:townId/trades/:tradeId", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const tradeId = parseInt(req.params["tradeId"] ?? "");
  await db.delete(tradeRoutesTable).where(and(eq(tradeRoutesTable.id, tradeId), eq(tradeRoutesTable.fromTownId, townId)));
  res.json({ success: true });
});

export default router;
