import { db } from "@workspace/db";
import { armyTable, townsTable, buildingSlotsTable } from "@workspace/db";
import type { Army } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  getUnitCaps,
  calculateArmyComposition,
  calculateArmyCapacity,
  calculateSpyCount,
  calculateShipCount,
  type RecruitedTroops,
  type SlotLike,
} from "./gameEngine.js";
import { initSlotsForTown } from "./slotsInit.js";

export type ArmyRow = Army;

export function recruitedFromRow(army: ArmyRow): RecruitedTroops {
  return {
    infantry: army.infantry ?? 0,
    archers: army.archers ?? 0,
    cavalry: army.cavalry ?? 0,
  };
}

export async function ensureArmyRow(townId: number): Promise<ArmyRow> {
  const rows = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
  if (rows.length) return rows[0];
  const [inserted] = await db.insert(armyTable).values({ townId }).returning();
  return inserted;
}

export async function resolveArmyTraining(townId: number, slots: SlotLike[]): Promise<ArmyRow> {
  let army = await ensureArmyRow(townId);
  const now = new Date();

  if (army.trainingEndsAt && army.trainingEndsAt <= now && army.trainingUnit && army.trainingCount > 0) {
    const caps = getUnitCaps(slots);
    const unit = army.trainingUnit as keyof RecruitedTroops;
    const recruited = recruitedFromRow(army);
    const room = Math.max(0, caps[unit] - recruited[unit]);
    const added = Math.min(army.trainingCount, room);
    recruited[unit] += added;

    const [updated] = await db.update(armyTable).set({
      infantry: recruited.infantry,
      archers: recruited.archers,
      cavalry: recruited.cavalry,
      trainingUnit: null,
      trainingCount: 0,
      trainingEndsAt: null,
      updatedAt: now,
    }).where(eq(armyTable.townId, townId)).returning();
    army = updated;
  }

  return army;
}

export async function backfillLegacyArmyIfNeeded(townId: number, slots: SlotLike[]): Promise<ArmyRow> {
  let army = await resolveArmyTraining(townId, slots);
  if (army.legacyBackfilled) return army;

  const caps = getUnitCaps(slots);
  const hasBuildings = caps.infantry + caps.archers + caps.cavalry > 0;
  const empty = army.infantry === 0 && army.archers === 0 && army.cavalry === 0;

  if (hasBuildings && empty) {
    const [updated] = await db.update(armyTable).set({
      infantry: caps.infantry,
      archers: caps.archers,
      cavalry: caps.cavalry,
      legacyBackfilled: true,
      updatedAt: new Date(),
    }).where(eq(armyTable.townId, townId)).returning();
    return updated;
  }

  if (!army.legacyBackfilled) {
    const [updated] = await db.update(armyTable).set({ legacyBackfilled: true }).where(eq(armyTable.townId, townId)).returning();
    return updated;
  }

  return army;
}

export function buildArmyResponse(
  townId: number,
  slots: SlotLike[],
  army: ArmyRow,
) {
  const caps = getUnitCaps(slots);
  const recruited = recruitedFromRow(army);
  const composition = calculateArmyComposition(slots, recruited);
  const capacity = calculateArmyCapacity(slots);
  const spies = calculateSpyCount(slots);
  const ships = calculateShipCount(slots);

  return {
    townId,
    infantry: recruited.infantry,
    archers: recruited.archers,
    cavalry: recruited.cavalry,
    capInfantry: caps.infantry,
    capArchers: caps.archers,
    capCavalry: caps.cavalry,
    ships,
    spies,
    trainingUnit: army.trainingUnit ?? null,
    trainingCount: army.trainingCount ?? 0,
    trainingEndsAt: army.trainingEndsAt?.toISOString() ?? null,
    onMissionInfantry: army.onMissionInfantry,
    onMissionArchers: army.onMissionArchers,
    onMissionCavalry: army.onMissionCavalry,
    onMissionSpies: army.onMissionSpies,
    onMissionShips: army.onMissionShips,
    availableInfantry: Math.max(0, recruited.infantry - army.onMissionInfantry),
    availableArchers: Math.max(0, recruited.archers - army.onMissionArchers),
    availableCavalry: Math.max(0, recruited.cavalry - army.onMissionCavalry),
    availableSpies: Math.max(0, spies - army.onMissionSpies),
    availableShips: Math.max(0, ships - army.onMissionShips),
    infantryAttackMult: composition.infantryAttackMult,
    archerAttackMult: composition.archerAttackMult,
    cavalryAttackMult: composition.cavalryAttackMult,
    totalTroops: composition.totalTroops,
    totalPower: composition.totalPower,
    capacity,
  };
}

export async function loadArmyContext(townId: number) {
  await initSlotsForTown(townId);
  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const army = await backfillLegacyArmyIfNeeded(townId, slots);
  return { slots, army };
}
