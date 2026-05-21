import { Router } from "express";
import { db } from "@workspace/db";
import {
  spyOperationsTable,
  armyTable,
  townsTable,
  buildingSlotsTable,
  activitiesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  generateSpyCards,
  getCurrentMissionSeed,
  calculateSpyCount,
  rollSpyLoot,
  calculateMorale,
} from "../lib/gameEngine.js";
import { SPY_HOARD_LOOT_THRESHOLD } from "@workspace/achievements";
import { checkAchievementsForTown } from "../lib/awardAchievements.js";
import { initSlotsForTown } from "./slots.js";

const router = Router();

function getMaxActiveSpyOpsFromSlotsLocal(slots: { slotType: string; level: number }[]): number {
  const guild = slots.find((s) => s.slotType === "spyGuild");
  const level = guild?.level ?? 0;
  if (level < 1) return 0;
  return Math.min(level, 2);
}

function fmtLoot(gold: number, food: number, wood: number, stone: number): string {
  const parts: string[] = [];
  if (gold > 0) parts.push(`${Math.floor(gold)}G`);
  if (food > 0) parts.push(`${Math.floor(food)}F`);
  if (wood > 0) parts.push(`${Math.floor(wood)}W`);
  if (stone > 0) parts.push(`${Math.floor(stone)}St`);
  return parts.join(" · ") || "no loot";
}

async function resolvePendingSpyOps(townId: number) {
  const now = new Date();
  const active = await db
    .select()
    .from(spyOperationsTable)
    .where(and(eq(spyOperationsTable.townId, townId), eq(spyOperationsTable.status, "active")));

  for (const op of active) {
    if (op.returnsAt <= now) {
      const slots = await db
        .select()
        .from(buildingSlotsTable)
        .where(eq(buildingSlotsTable.townId, townId));
      const morale = calculateMorale(slots);
      const successRate = Math.min(0.95, op.successRate + morale * 0.001);
      const success = Math.random() < successRate;

      const baseLoot = {
        gold: 0,
        food: 0,
        wood: 0,
        stone: 0,
      };
      const rolled = success
        ? rollSpyLoot(
            {
              gold: op.lootGold ?? 0,
              food: op.lootFood ?? 0,
              wood: op.lootWood ?? 0,
              stone: op.lootStone ?? 0,
            },
            op.id * 19_391 + townId,
          )
        : baseLoot;

      const spiesLost = success
        ? Math.floor(op.spiesDeployed * 0.1)
        : Math.floor(op.spiesDeployed * 0.4);

      await db
        .update(spyOperationsTable)
        .set({
          status: success ? "returned" : "failed",
          result: success ? "success" : "caught",
          lootGold: rolled.gold,
          lootFood: rolled.food,
          lootWood: rolled.wood,
          lootStone: rolled.stone,
          spiesLost,
        })
        .where(eq(spyOperationsTable.id, op.id));

      const armyRows = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
      if (armyRows.length) {
        const army = armyRows[0];
        await db
          .update(armyTable)
          .set({
            onMissionSpies: Math.max(0, army.onMissionSpies - op.spiesDeployed),
            updatedAt: new Date(),
          })
          .where(eq(armyTable.townId, townId));
      }

      if (success) {
        const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
        if (town) {
          await db
            .update(townsTable)
            .set({
              gold: town.gold + rolled.gold,
              food: town.food + rolled.food,
              wood: town.wood + rolled.wood,
              stone: town.stone + rolled.stone,
            })
            .where(eq(townsTable.id, townId));
        }
      }

      const totalLoot = rolled.gold + rolled.food + rolled.wood + rolled.stone;
      await db.insert(activitiesTable).values({
        townId,
        type: success ? "spy_success" : "spy_fail",
        title: success ? "Espionage Success" : "Spies Captured",
        body: success
          ? `"${op.title}" — ${op.spiesDeployed} spies returned. Loot: ${fmtLoot(rolled.gold, rolled.food, rolled.wood, rolled.stone)}`
          : `"${op.title}" — ${spiesLost} spies lost.`,
        icon: success ? "incognito" : "skull-crossbones",
        iconColor: success ? "#7a5aaa" : "#cc4040",
      });

      if (success) {
        await checkAchievementsForTown(townId, {
          shadow_network: true,
          treasure_hoard: totalLoot >= SPY_HOARD_LOOT_THRESHOLD,
        });
      }
    }
  }
}

router.get("/towns/:townId/spy-board", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  await initSlotsForTown(townId);
  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const spyCount = calculateSpyCount(slots);
  const seed = getCurrentMissionSeed();
  res.json(generateSpyCards(seed, spyCount));
});

router.get("/towns/:townId/spy-operations", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  await resolvePendingSpyOps(townId);
  const ops = await db.select().from(spyOperationsTable).where(eq(spyOperationsTable.townId, townId));
  res.json(
    ops.map((o) => ({
      ...o,
      cardId: o.cardId,
      dispatchedAt: o.dispatchedAt.toISOString(),
      returnsAt: o.returnsAt.toISOString(),
    })),
  );
});

router.post("/towns/:townId/spy-operations", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const { cardId, spies = 0 } = req.body as { cardId?: string; spies?: number };

  if (!cardId) return void res.status(400).json({ error: "cardId required" });

  await initSlotsForTown(townId);
  await resolvePendingSpyOps(townId);

  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const spyGuildLevel = slots.find((s) => s.slotType === "spyGuild")?.level ?? 0;
  if (spyGuildLevel < 1) {
    return void res.status(400).json({ error: "Build a Spy Guild first" });
  }

  const maxActive = getMaxActiveSpyOpsFromSlotsLocal(slots);
  const activeCount = await db
    .select()
    .from(spyOperationsTable)
    .where(and(eq(spyOperationsTable.townId, townId), eq(spyOperationsTable.status, "active")));
  if (activeCount.length >= maxActive) {
    return void res.status(400).json({ error: `At spy op limit (${maxActive})` });
  }

  const totalSpies = calculateSpyCount(slots);
  const armyRows = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
  const onMissionSpies = armyRows[0]?.onMissionSpies ?? 0;
  const available = Math.max(0, totalSpies - onMissionSpies);

  if (spies < 1 || spies > available) {
    return void res.status(400).json({ error: `Need 1–${available} available spies` });
  }

  const seed = getCurrentMissionSeed();
  const cards = generateSpyCards(seed, totalSpies);
  const card = cards.find((c) => c.id === cardId);
  if (!card) return void res.status(400).json({ error: "Invalid spy card" });

  if (spies < card.minSpies) {
    return void res.status(400).json({ error: `Need at least ${card.minSpies} spies` });
  }

  const morale = calculateMorale(slots);
  const successRate = Math.min(0.92, card.baseSuccessRate + (spies - card.minSpies) * 0.02 + morale * 0.002);

  if (armyRows.length) {
    await db
      .update(armyTable)
      .set({
        onMissionSpies: onMissionSpies + spies,
        updatedAt: new Date(),
      })
      .where(eq(armyTable.townId, townId));
  } else {
    await db.insert(armyTable).values({ townId, onMissionSpies: spies });
  }

  const returnsAt = new Date(Date.now() + card.durationMinutes * 60 * 1000);
  const [operation] = await db
    .insert(spyOperationsTable)
    .values({
      townId,
      cardId,
      title: card.title,
      operationType: card.type,
      difficulty: card.difficulty,
      spiesDeployed: spies,
      successRate,
      status: "active",
      returnsAt,
      lootGold: card.lootGold,
      lootFood: card.lootFood,
      lootWood: card.lootWood,
      lootStone: card.lootStone,
    })
    .returning();

  await db.insert(activitiesTable).values({
    townId,
    type: "spy_dispatched",
    title: "Spies Dispatched",
    body: `"${card.title}" — ${spies} agents abroad. Returns in ${card.durationMinutes}m.`,
    icon: "incognito",
    iconColor: "#7a5aaa",
  });

  const awardedAchievements = await checkAchievementsForTown(townId);

  res.status(201).json({
    operation: {
      ...operation,
      dispatchedAt: operation.dispatchedAt.toISOString(),
      returnsAt: operation.returnsAt.toISOString(),
    },
    awardedAchievements,
  });
});

export default router;
