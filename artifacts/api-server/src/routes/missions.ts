import { Router } from "express";
import { db } from "@workspace/db";
import { missionsTable, armyTable, townsTable, buildingSlotsTable, activitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getMaxActiveMissionsFromSlots } from "@workspace/building-progression";
import {
  generateMissionCards,
  generateEnemyForce,
  getCurrentMissionSeed,
  rollMissionLoot,
  calculateArmyComposition,
} from "../lib/gameEngine.js";
import { initSlotsForTown } from "./slots.js";

const MERCENARY_GOLD_COST = 10;

const router = Router();

function fmtLoot(gold: number, food: number, wood: number, stone: number): string {
  const parts: string[] = [];
  if (gold > 0) parts.push(`${Math.floor(gold)}G`);
  if (food > 0) parts.push(`${Math.floor(food)}F`);
  if (wood > 0) parts.push(`${Math.floor(wood)}W`);
  if (stone > 0) parts.push(`${Math.floor(stone)}St`);
  return parts.join(" · ") || "no loot";
}

function troopSide(
  infantry: number,
  archers: number,
  cavalry: number,
  mercenaries = 0,
) {
  return {
    infantry,
    archers,
    cavalry,
    mercenaries,
    total: infantry + archers + cavalry + mercenaries,
  };
}

function buildMissionMetadata(
  m: {
    missionTitle: string;
    infantry: number;
    archers: number;
    cavalry: number;
    mercenaries: number;
    enemyInfantry: number;
    enemyArchers: number;
    enemyCavalry: number;
    lootGold: number | null;
    lootFood: number | null;
    lootWood: number | null;
    lootStone: number | null;
    casualties: number | null;
  },
  success: boolean,
) {
  return {
    missionTitle: m.missionTitle,
    success,
    playerTroops: troopSide(m.infantry, m.archers, m.cavalry, m.mercenaries),
    enemyTroops: troopSide(m.enemyInfantry, m.enemyArchers, m.enemyCavalry, 0),
    loot: success
      ? {
          gold: m.lootGold ?? 0,
          food: m.lootFood ?? 0,
          wood: m.lootWood ?? 0,
          stone: m.lootStone ?? 0,
        }
      : undefined,
    casualties: m.casualties ?? 0,
  };
}

router.get("/missions", async (req, res) => {
  const townId = parseInt(String(req.query["townId"] ?? ""));
  if (!townId) return void res.status(400).json({ error: "townId required" });

  await initSlotsForTown(townId);
  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const composition = calculateArmyComposition(slots);
  const seed = getCurrentMissionSeed();

  res.json(generateMissionCards(seed, composition.totalTroops, composition.totalPower));
});

async function resolvePendingMissions(townId: number) {
  const now = new Date();
  const active = await db.select().from(missionsTable)
    .where(and(eq(missionsTable.townId, townId), eq(missionsTable.status, "active")));

  for (const m of active) {
    if (m.returnsAt <= now) {
      const success = Math.random() < m.successRate;
      const ownTroops = m.infantry + m.archers + m.cavalry;
      const casualties = success
        ? Math.floor(ownTroops * 0.05)
        : Math.floor(ownTroops * 0.2);

      const baseLoot = {
        gold: m.lootGold ?? 0,
        food: m.lootFood ?? 0,
        wood: m.lootWood ?? 0,
        stone: m.lootStone ?? 0,
      };
      const rolled = success
        ? rollMissionLoot(baseLoot, m.id * 17_371 + townId)
        : { gold: 0, food: 0, wood: 0, stone: 0 };

      await db.update(missionsTable).set({
        status: success ? "returned" : "failed",
        result: success ? "victory" : "defeat",
        lootGold: rolled.gold,
        lootFood: rolled.food,
        lootWood: rolled.wood,
        lootStone: rolled.stone,
        casualties,
      }).where(eq(missionsTable.id, m.id));

      const resolved = {
        ...m,
        lootGold: rolled.gold,
        lootFood: rolled.food,
        lootWood: rolled.wood,
        lootStone: rolled.stone,
        casualties,
      };

      const armyRows = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
      if (armyRows.length) {
        const army = armyRows[0];
        await db.update(armyTable).set({
          onMissionInfantry: Math.max(0, army.onMissionInfantry - m.infantry),
          onMissionArchers:  Math.max(0, army.onMissionArchers  - m.archers),
          onMissionCavalry:  Math.max(0, army.onMissionCavalry  - m.cavalry),
          updatedAt: new Date(),
        }).where(eq(armyTable.townId, townId));
      }

      if (success) {
        const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
        if (town) {
          await db.update(townsTable).set({
            gold:  town.gold  + rolled.gold,
            food:  town.food  + rolled.food,
            wood:  town.wood  + rolled.wood,
            stone: town.stone + rolled.stone,
          }).where(eq(townsTable.id, townId));
        }
      }

      const playerTotal = troopSide(m.infantry, m.archers, m.cavalry, m.mercenaries).total;
      const enemyTotal = troopSide(m.enemyInfantry, m.enemyArchers, m.enemyCavalry).total;
      const metadata = buildMissionMetadata(resolved, success);

      await db.insert(activitiesTable).values({
        townId,
        type: success ? "mission_success" : "mission_fail",
        title: success ? `Mission Complete` : `Mission Failed`,
        body: success
          ? `"${m.missionTitle}" — Your ${playerTotal} vs their ${enemyTotal}. Spoils: ${fmtLoot(rolled.gold, rolled.food, rolled.wood, rolled.stone)}`
          : `"${m.missionTitle}" — Your ${playerTotal} vs their ${enemyTotal}. ${casualties} troops lost.`,
        icon: success ? "flag-checkered" : "skull-crossbones",
        iconColor: success ? "#3d7a35" : "#cc4040",
        metadata: JSON.stringify(metadata),
      });
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
  })));
});

router.post("/towns/:townId/missions", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const {
    missionCardId,
    infantry = 0,
    archers = 0,
    cavalry = 0,
    mercenaries = 0,
  } = req.body as { missionCardId?: string; infantry?: number; archers?: number; cavalry?: number; mercenaries?: number };

  if (!missionCardId) return void res.status(400).json({ error: "missionCardId required" });

  await initSlotsForTown(townId);
  await resolvePendingMissions(townId);

  const activeCount = await db.select().from(missionsTable)
    .where(and(eq(missionsTable.townId, townId), eq(missionsTable.status, "active")));
  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const maxActive = getMaxActiveMissionsFromSlots(slots);
  if (activeCount.length >= maxActive) {
    return void res.status(400).json({
      error: maxActive === 1
        ? "Only 1 mission at a time. Upgrade Town Hall for more slots."
        : `At mission limit (${maxActive}). Upgrade Town Hall for more slots.`,
    });
  }
  const composition = calculateArmyComposition(slots);
  const seed = getCurrentMissionSeed();
  const cards = generateMissionCards(seed, composition.totalTroops, composition.totalPower);
  const card = cards.find(c => c.id === missionCardId);
  if (!card) return void res.status(400).json({ error: "Invalid mission card" });

  const armyRows = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
  const onMission = armyRows[0] ?? { onMissionInfantry: 0, onMissionArchers: 0, onMissionCavalry: 0 };

  const availInfantry = Math.max(0, composition.infantry - onMission.onMissionInfantry);
  const availArchers  = Math.max(0, composition.archers  - onMission.onMissionArchers);
  const availCavalry  = Math.max(0, composition.cavalry  - onMission.onMissionCavalry);

  if (infantry > availInfantry || archers > availArchers || cavalry > availCavalry) {
    return void res.status(400).json({ error: "Not enough available troops" });
  }

  const totalTroops = infantry + archers + cavalry + mercenaries;
  if (totalTroops < card.minTroops) {
    return void res.status(400).json({ error: `Need at least ${card.minTroops} troops (including mercenaries)` });
  }

  if (mercenaries > 0) {
    const mercCost = mercenaries * MERCENARY_GOLD_COST;
    const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
    if (!town) return void res.status(404).json({ error: "Town not found" });
    if (town.gold < mercCost) return void res.status(400).json({ error: `Need ${mercCost} gold for ${mercenaries} mercenaries` });
    await db.update(townsTable).set({ gold: town.gold - mercCost }).where(eq(townsTable.id, townId));
  }

  const surplus = Math.max(0, totalTroops - card.minTroops);
  const successRate = Math.min(0.95, card.baseSuccessRate + surplus * 0.01);

  const enemy = generateEnemyForce(
    townId * 31 + Date.now() % 10_000,
    totalTroops,
    card.difficulty,
  );

  if (armyRows.length) {
    await db.update(armyTable).set({
      onMissionInfantry: onMission.onMissionInfantry + infantry,
      onMissionArchers:  onMission.onMissionArchers  + archers,
      onMissionCavalry:  onMission.onMissionCavalry  + cavalry,
      updatedAt: new Date(),
    }).where(eq(armyTable.townId, townId));
  } else {
    await db.insert(armyTable).values({
      townId,
      onMissionInfantry: infantry,
      onMissionArchers:  archers,
      onMissionCavalry:  cavalry,
    });
  }

  const returnsAt = new Date(Date.now() + card.durationMinutes * 60 * 1000);
  const [mission] = await db.insert(missionsTable).values({
    townId,
    missionCardId,
    missionTitle: card.title,
    missionType: card.type,
    missionDifficulty: card.difficulty,
    infantry,
    archers,
    cavalry,
    mercenaries,
    enemyInfantry: enemy.infantry,
    enemyArchers: enemy.archers,
    enemyCavalry: enemy.cavalry,
    successRate,
    status: "active",
    returnsAt,
    lootGold: card.lootGold,
    lootFood: card.lootFood,
    lootWood: card.lootWood,
    lootStone: card.lootStone,
  }).returning();

  const totalStr = [
    infantry ? `${infantry} inf` : "",
    archers ? `${archers} arch` : "",
    cavalry ? `${cavalry} cav` : "",
    mercenaries ? `${mercenaries} merc` : "",
  ].filter(Boolean).join(", ");

  const enemyTotal = enemy.infantry + enemy.archers + enemy.cavalry;

  await db.insert(activitiesTable).values({
    townId,
    type: "mission_dispatched",
    title: "Mission Dispatched",
    body: `"${card.title}" — ${totalStr} (${totalTroops}) vs ~${enemyTotal} foes. Returns in ${card.durationMinutes}m.`,
    icon: "map-marker-path",
    iconColor: "#9a7a5a",
  });

  res.status(201).json({ ...mission, dispatchedAt: mission.dispatchedAt.toISOString(), returnsAt: mission.returnsAt.toISOString() });
});

export default router;
