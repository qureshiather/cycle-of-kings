import { Router } from "express";
import { db } from "@workspace/db";
import { townsTable, buildingSlotsTable, activitiesTable, armyTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getBuildBlockReason } from "@workspace/building-progression";
import { SLOT_TYPES } from "@workspace/db";
import {
  getCurrentSeasonInfo, calculateProduction, calculateBuildingCost,
  getUpgradeDurationMs, applyTick, calculateEconomyScore,
  calculateArmyComposition, calculateStaticDefense, calculateTotalDefense,
  REFUND_RATIO,
} from "../lib/gameEngine.js";

const router = Router();

function initialSlotLevel(slotType: string): number {
  return slotType === "townHall" ? 1 : 0;
}

const SLOT_NAMES: Record<string, string> = {
  farm: "Farm", mine: "Mine", quarry: "Quarry", lumberMill: "Lumber Mill",
  barracks: "Barracks", archeryRange: "Archery Range", stables: "Stables",
  market: "Market", tavern: "Tavern", house: "House",
  townHall: "Town Hall",
  wall: "Town Wall", tower: "Watch Tower",
};

function formatDuration(durationMs: number): string {
  if (durationMs < 60_000) return `${Math.round(durationMs / 1000)}s`;
  if (durationMs < 3_600_000) return `${Math.round(durationMs / 60_000)}m`;
  return `${Math.round(durationMs / 3_600_000)}h`;
}

async function logConstructionStarted(
  townId: number,
  slotType: string,
  targetLevel: number,
  durationMs: number,
): Promise<void> {
  await db.insert(activitiesTable).values({
    townId,
    type: "upgrade_started",
    title: "Construction started",
    body: `${SLOT_NAMES[slotType] ?? slotType} building to level ${targetLevel} — ${formatDuration(durationMs)} remaining`,
    icon: "hammer-wrench",
    iconColor: "#7a7a9a",
  });
}

async function logConstructionComplete(
  townId: number,
  slotType: string,
  level: number,
): Promise<void> {
  await db.insert(activitiesTable).values({
    townId,
    type: "upgrade_complete",
    title: "Construction complete",
    body: `${SLOT_NAMES[slotType] ?? slotType} built to level ${level}`,
    icon: "check-circle",
    iconColor: "#d4a520",
  });
}

/** Keep highest level per slotType; remove legacy duplicate rows. */
async function dedupeSlotsForTown(townId: number): Promise<void> {
  const existing = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const bestByType = new Map<string, (typeof existing)[number]>();
  for (const slot of existing) {
    const prev = bestByType.get(slot.slotType);
    if (!prev || slot.level > prev.level || (slot.level === prev.level && slot.id > prev.id)) {
      bestByType.set(slot.slotType, slot);
    }
  }
  const keepIds = new Set([...bestByType.values()].map((s) => s.id));
  const dupes = existing.filter((s) => !keepIds.has(s.id));
  if (dupes.length > 0) {
    for (const slot of dupes) {
      await db.delete(buildingSlotsTable).where(eq(buildingSlotsTable.id, slot.id));
    }
  }
}

async function initSlotsForTown(townId: number): Promise<void> {
  await dedupeSlotsForTown(townId);
  const existing = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const existingTypes = new Set(existing.map((s) => s.slotType));
  const missing = SLOT_TYPES.filter((t) => !existingTypes.has(t));
  if (missing.length > 0) {
    await db.insert(buildingSlotsTable).values(
      missing.map((slotType) => ({
        townId,
        slotType,
        level: initialSlotLevel(slotType),
      })),
    );
  }
}

async function getTickedTown(townId: number) {
  const rows = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!rows.length) return null;
  const town = rows[0];
  await initSlotsForTown(townId);
  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));

  const now = new Date();
  for (const slot of slots) {
    if (slot.upgrading && slot.upgradeEndsAt && slot.upgradeEndsAt <= now) {
      await db.update(buildingSlotsTable).set({ upgrading: false }).where(eq(buildingSlotsTable.id, slot.id));
      await logConstructionComplete(townId, slot.slotType, slot.level);
    }
  }

  const freshSlots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const { season } = getCurrentSeasonInfo();
  const production = calculateProduction(freshSlots, season);
  const tickedResources = applyTick(town, production);

  const armyRows = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
  const onMission = armyRows[0] ?? { onMissionInfantry: 0, onMissionArchers: 0, onMissionCavalry: 0 };

  const economyScore = calculateEconomyScore(freshSlots);
  const comp = calculateArmyComposition(freshSlots);
  const armyScore = comp.totalPower;
  const staticDefense = calculateStaticDefense(freshSlots);
  const totalDefense = calculateTotalDefense(freshSlots, onMission);

  await db.update(townsTable).set({
    gold: tickedResources.gold,
    food: tickedResources.food,
    wood: tickedResources.wood,
    stone: tickedResources.stone,
    defenseRating: staticDefense,
    lastTickAt: new Date(),
  }).where(eq(townsTable.id, townId));

  return {
    town: { ...town, ...tickedResources, defenseRating: staticDefense },
    slots: freshSlots,
    production,
    economyScore,
    armyScore,
    staticDefense,
    totalDefense,
    onMission,
  };
}

router.get("/towns/:townId/slots", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  await initSlotsForTown(townId);
  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  res.json(slots.map(s => ({ ...s, upgradeEndsAt: s.upgradeEndsAt?.toISOString() ?? null })));
});

router.post("/towns/:townId/slots/:slotType/build", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const slotType = req.params["slotType"] ?? "";

  if (!SLOT_TYPES.includes(slotType as any)) return void res.status(400).json({ error: "Invalid slot type" });

  await initSlotsForTown(townId);

  const [slot] = await db.select().from(buildingSlotsTable)
    .where(and(eq(buildingSlotsTable.townId, townId), eq(buildingSlotsTable.slotType, slotType)));
  if (!slot) return void res.status(400).json({ error: "Slot not found" });
  if (slot.level > 0) {
    return void res.status(400).json({ error: "Already built. Build to a higher level instead." });
  }

  const allSlots = await db
    .select()
    .from(buildingSlotsTable)
    .where(eq(buildingSlotsTable.townId, townId));
  const block = getBuildBlockReason(slotType, allSlots);
  if (block) return void res.status(400).json({ error: block });

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  const cost = calculateBuildingCost(slotType, 1);
  if (town.gold < cost.gold || town.food < cost.food || town.wood < cost.wood || town.stone < cost.stone) {
    return void res.status(400).json({ error: "Insufficient resources", cost });
  }

  await db.update(townsTable).set({
    gold: town.gold - cost.gold, food: town.food - cost.food,
    wood: town.wood - cost.wood, stone: town.stone - cost.stone,
  }).where(eq(townsTable.id, townId));

  const durationMs = getUpgradeDurationMs(slotType, 0, allSlots);
  const upgradeEndsAt = new Date(Date.now() + durationMs);

  const [updated] = await db.update(buildingSlotsTable)
    .set({ level: 1, upgrading: true, upgradeEndsAt })
    .where(eq(buildingSlotsTable.id, slot.id))
    .returning();

  await logConstructionStarted(townId, slotType, 1, durationMs);

  res.status(201).json({
    ...updated,
    upgradeEndsAt: updated.upgradeEndsAt?.toISOString() ?? null,
  });
});

router.post("/towns/:townId/slots/:slotType/upgrade", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const slotType = req.params["slotType"] ?? "";

  if (!SLOT_TYPES.includes(slotType as any)) return void res.status(400).json({ error: "Invalid slot type" });

  await initSlotsForTown(townId);

  const [slot] = await db.select().from(buildingSlotsTable)
    .where(and(eq(buildingSlotsTable.townId, townId), eq(buildingSlotsTable.slotType, slotType)));
  if (!slot) return void res.status(400).json({ error: "Slot not found" });
  if (slot.level === 0) return void res.status(400).json({ error: "Not built yet. Build level 1 first." });
  if (slot.upgrading) return void res.status(400).json({ error: "Already upgrading" });
  if (slot.level >= 10) return void res.status(400).json({ error: "Max level reached" });

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  const nextLevel = slot.level + 1;
  const cost = calculateBuildingCost(slotType, nextLevel);
  if (town.gold < cost.gold || town.food < cost.food || town.wood < cost.wood || town.stone < cost.stone) {
    return void res.status(400).json({ error: "Insufficient resources", cost });
  }

  const allSlots = await db
    .select()
    .from(buildingSlotsTable)
    .where(eq(buildingSlotsTable.townId, townId));
  const durationMs = getUpgradeDurationMs(slotType, slot.level, allSlots);
  const upgradeEndsAt = new Date(Date.now() + durationMs);

  await db.update(townsTable).set({
    gold: town.gold - cost.gold, food: town.food - cost.food,
    wood: town.wood - cost.wood, stone: town.stone - cost.stone,
  }).where(eq(townsTable.id, townId));

  const [updated] = await db.update(buildingSlotsTable)
    .set({ upgrading: true, upgradeEndsAt, level: nextLevel })
    .where(eq(buildingSlotsTable.id, slot.id))
    .returning();

  await logConstructionStarted(townId, slotType, nextLevel, durationMs);

  res.json({ ...updated, upgradeEndsAt: updated.upgradeEndsAt?.toISOString() ?? null });
});

router.delete("/towns/:townId/slots/:slotType", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const slotType = req.params["slotType"] ?? "";

  if (!SLOT_TYPES.includes(slotType as any)) return void res.status(400).json({ error: "Invalid slot type" });

  await initSlotsForTown(townId);

  const [slot] = await db.select().from(buildingSlotsTable)
    .where(and(eq(buildingSlotsTable.townId, townId), eq(buildingSlotsTable.slotType, slotType)));
  if (!slot || slot.level === 0) return void res.status(400).json({ error: "Nothing to demolish" });
  if (slotType === "townHall") return void res.status(400).json({ error: "Town Hall cannot be demolished" });

  const cost = calculateBuildingCost(slotType, slot.level);
  const refund = {
    gold:  cost.gold  * REFUND_RATIO,
    food:  cost.food  * REFUND_RATIO,
    wood:  cost.wood  * REFUND_RATIO,
    stone: cost.stone * REFUND_RATIO,
  };

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (town) {
    await db.update(townsTable).set({
      gold: town.gold + refund.gold, food: town.food + refund.food,
      wood: town.wood + refund.wood, stone: town.stone + refund.stone,
    }).where(eq(townsTable.id, townId));
  }

  const [updated] = await db.update(buildingSlotsTable)
    .set({ level: 0, upgrading: false, upgradeEndsAt: null })
    .where(eq(buildingSlotsTable.id, slot.id))
    .returning();

  await db.insert(activitiesTable).values({
    townId,
    type: "building_demolished",
    title: "Building Demolished",
    body: `${SLOT_NAMES[slotType] ?? slotType} demolished — 75% resources refunded`,
    icon: "delete-outline",
    iconColor: "#cc4040",
  });

  res.json({ ...updated, upgradeEndsAt: null });
});

export { getTickedTown, initSlotsForTown, logConstructionComplete };
export default router;
