import { db } from "@workspace/db";
import { buildingSlotsTable, SLOT_TYPES } from "@workspace/db";
import { eq } from "drizzle-orm";

function initialSlotLevel(slotType: string): number {
  return slotType === "townHall" ? 1 : 0;
}

async function dedupeSlotsForTown(townId: number): Promise<void> {
  const existing = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const bestByType = new Map<string, (typeof existing)[number]>();
  for (const slot of existing) {
    const prev = bestByType.get(slot.slotType);
    if (
      !prev
      || slot.level > prev.level
      || (slot.level === prev.level && prev.upgrading && !slot.upgrading)
      || (slot.level === prev.level && slot.upgrading === prev.upgrading && slot.id > prev.id)
    ) {
      bestByType.set(slot.slotType, slot);
    }
  }
  const keepIds = new Set([...bestByType.values()].map((s) => s.id));
  const dupes = existing.filter((s) => !keepIds.has(s.id));
  for (const slot of dupes) {
    await db.delete(buildingSlotsTable).where(eq(buildingSlotsTable.id, slot.id));
  }
}

/** Clear `upgrading` when the timer has elapsed (runs on slot fetch, not only kingdom tick). */
export async function completeDueUpgrades(townId: number): Promise<void> {
  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const now = new Date();
  for (const slot of slots) {
    if (slot.upgrading && slot.upgradeEndsAt && slot.upgradeEndsAt <= now) {
      await db
        .update(buildingSlotsTable)
        .set({ upgrading: false })
        .where(eq(buildingSlotsTable.id, slot.id));
    }
  }
}

export async function initSlotsForTown(townId: number): Promise<void> {
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
  await completeDueUpgrades(townId);
}
