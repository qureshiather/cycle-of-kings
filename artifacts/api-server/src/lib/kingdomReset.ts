import { db } from "@workspace/db";
import {
  townsTable,
  buildingSlotsTable,
  armyTable,
  missionsTable,
  spyOperationsTable,
  activitiesTable,
  raidsTable,
} from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { getCurrentSeasonInfo } from "./gameEngine.js";
import { initSlotsForTown } from "./slotsInit.js";
import { formatCycleRecapBody, type CycleRecap } from "./cycleRecap.js";

export type KingdomResetReason = "manual" | "cycle";

export async function performKingdomReset(
  townId: number,
  reason: KingdomResetReason,
  recap?: CycleRecap,
): Promise<void> {
  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return;

  const { cycleNumber } = getCurrentSeasonInfo();

  await db.delete(raidsTable).where(
    or(eq(raidsTable.attackerTownId, townId), eq(raidsTable.defenderTownId, townId)),
  );

  await db.update(buildingSlotsTable)
    .set({ level: 0, upgrading: false, upgradeEndsAt: null })
    .where(eq(buildingSlotsTable.townId, townId));

  await db.delete(armyTable).where(eq(armyTable.townId, townId));
  await db.insert(armyTable).values({ townId });

  await db.delete(missionsTable).where(eq(missionsTable.townId, townId));
  await db.delete(spyOperationsTable).where(eq(spyOperationsTable.townId, townId));

  await initSlotsForTown(townId);

  const halls = await db
    .select()
    .from(buildingSlotsTable)
    .where(eq(buildingSlotsTable.townId, townId));
  const hall = halls.find((s) => s.slotType === "townHall");
  if (hall) {
    await db.update(buildingSlotsTable).set({ level: 1 }).where(eq(buildingSlotsTable.id, hall.id));
  }

  await db.update(townsTable).set({
    gold: 200,
    food: 200,
    wood: 150,
    stone: 100,
    population: 10,
    defenseRating: 10,
    lastTickAt: new Date(),
    lastPlayedCycleNumber: cycleNumber,
  }).where(eq(townsTable.id, townId));

  const isCycle = reason === "cycle";
  const recapBody = isCycle && recap ? formatCycleRecapBody(recap) : undefined;
  await db.insert(activitiesTable).values({
    townId,
    type: isCycle ? "cycle_reset" : "kingdom_reset",
    title: isCycle ? "New Cycle Begins" : "Kingdom Reset",
    body: isCycle
      ? recapBody ?? `Cycle ${cycleNumber} has begun. Your kingdom was reset for a fresh season of conquest.`
      : "All buildings demolished. Your kingdom starts fresh.",
    icon: isCycle ? "calendar-refresh" : "restore",
    iconColor: isCycle ? "#d4a520" : "#cc4040",
    metadata: isCycle && recap ? JSON.stringify(recap) : null,
  });
}
