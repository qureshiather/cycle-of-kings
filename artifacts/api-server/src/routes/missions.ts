import { Router } from "express";
import { db } from "@workspace/db";
import { missionsTable, armyTable, townsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { generateMissionCards, getCurrentHourSeed } from "../lib/gameEngine.js";

const router = Router();

router.get("/missions", async (req, res) => {
  const townId = parseInt(String(req.query["townId"] ?? ""));
  if (!townId) return void res.status(400).json({ error: "townId required" });
  const seed = getCurrentHourSeed();
  res.json(generateMissionCards(seed));
});

async function resolvePendingMissions(townId: number) {
  const now = new Date();
  const active = await db.select().from(missionsTable)
    .where(and(eq(missionsTable.townId, townId), eq(missionsTable.status, "active")));

  for (const m of active) {
    if (m.returnsAt <= now) {
      const success = Math.random() < m.successRate;
      const casualties = success ? Math.floor((m.infantry + m.archers + m.cavalry) * 0.05) : Math.floor((m.infantry + m.archers + m.cavalry) * 0.25);

      await db.update(missionsTable).set({
        status: success ? "returned" : "failed",
        result: success ? "victory" : "defeat",
        lootGold:  success ? m.lootGold  : 0,
        lootFood:  success ? m.lootFood  : 0,
        lootWood:  success ? m.lootWood  : 0,
        lootStone: success ? m.lootStone : 0,
        casualties,
      }).where(eq(missionsTable.id, m.id));

      const [army] = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
      if (army) {
        const returnInf = Math.max(0, m.infantry - casualties);
        const returnArch = Math.max(0, m.archers - Math.floor(casualties * 0.3));
        const returnCav = Math.max(0, m.cavalry - Math.floor(casualties * 0.2));

        await db.update(armyTable).set({
          infantry:  army.infantry  + returnInf,
          archers:   army.archers   + returnArch,
          cavalry:   army.cavalry   + returnCav,
          onMissionInfantry: Math.max(0, army.onMissionInfantry - m.infantry),
          onMissionArchers:  Math.max(0, army.onMissionArchers  - m.archers),
          onMissionCavalry:  Math.max(0, army.onMissionCavalry  - m.cavalry),
          updatedAt: new Date(),
        }).where(eq(armyTable.townId, townId));

        if (success) {
          const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
          if (town) {
            await db.update(townsTable).set({
              gold:  town.gold  + (m.lootGold  ?? 0),
              food:  town.food  + (m.lootFood  ?? 0),
              wood:  town.wood  + (m.lootWood  ?? 0),
              stone: town.stone + (m.lootStone ?? 0),
            }).where(eq(townsTable.id, townId));
          }
        }
      }
    }
  }
}

router.get("/towns/:townId/missions", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  await resolvePendingMissions(townId);
  const missions = await db.select().from(missionsTable).where(eq(missionsTable.townId, townId));
  res.json(missions.map(m => ({
    ...m,
    dispatchedAt: m.dispatchedAt.toISOString(),
    returnsAt: m.returnsAt.toISOString(),
    successRate: m.successRate,
  })));
});

router.post("/towns/:townId/missions", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const { missionCardId, infantry = 0, archers = 0, cavalry = 0 } = req.body as { missionCardId?: string; infantry?: number; archers?: number; cavalry?: number };
  if (!missionCardId) return void res.status(400).json({ error: "missionCardId required" });

  const seed = getCurrentHourSeed();
  const cards = generateMissionCards(seed);
  const card = cards.find(c => c.id === missionCardId);
  if (!card) return void res.status(400).json({ error: "Invalid mission card" });

  const totalTroops = infantry + archers + cavalry;
  if (totalTroops < card.minTroops) return void res.status(400).json({ error: `Need at least ${card.minTroops} troops` });

  const [army] = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
  if (!army) return void res.status(400).json({ error: "No army" });
  if (army.infantry < infantry || army.archers < archers || army.cavalry < cavalry) {
    return void res.status(400).json({ error: "Not enough troops" });
  }

  const surplus = Math.max(0, totalTroops - card.minTroops);
  const successRate = Math.min(0.95, card.baseSuccessRate + surplus * 0.005);

  await db.update(armyTable).set({
    infantry: army.infantry - infantry,
    archers:  army.archers  - archers,
    cavalry:  army.cavalry  - cavalry,
    onMissionInfantry: army.onMissionInfantry + infantry,
    onMissionArchers:  army.onMissionArchers  + archers,
    onMissionCavalry:  army.onMissionCavalry  + cavalry,
    updatedAt: new Date(),
  }).where(eq(armyTable.townId, townId));

  const returnsAt = new Date(Date.now() + card.durationMinutes * 60 * 1000);

  const [mission] = await db.insert(missionsTable).values({
    townId, missionCardId, missionTitle: card.title, missionType: card.type,
    infantry, archers, cavalry, successRate, status: "active", returnsAt,
    lootGold: card.lootGold, lootFood: card.lootFood, lootWood: card.lootWood, lootStone: card.lootStone,
  }).returning();

  res.status(201).json({ ...mission, dispatchedAt: mission.dispatchedAt.toISOString(), returnsAt: mission.returnsAt.toISOString() });
});

export default router;
