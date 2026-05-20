import { Router } from "express";
import { db } from "@workspace/db";
import { activitiesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/towns/:townId/activities", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const rows = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.townId, townId))
    .orderBy(desc(activitiesTable.createdAt))
    .limit(50);

  res.json(rows.map(r => ({
    ...r,
    metadata: r.metadata ? JSON.parse(r.metadata) : null,
    createdAt: r.createdAt.toISOString(),
  })));
});

export default router;
