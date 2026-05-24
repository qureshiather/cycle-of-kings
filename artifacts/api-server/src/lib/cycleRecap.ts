import { db } from "@workspace/db";
import {
  townsTable,
  buildingSlotsTable,
  armyTable,
  activitiesTable,
  trophiesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ACHIEVEMENT_BY_ID,
  type AchievementId,
} from "@workspace/achievements";
import {
  calculateEconomyScore,
  calculateArmyComposition,
  getCurrentSeasonInfo,
} from "./gameEngine.js";
import { recruitedFromRow } from "./armyService.js";

export type CycleRecap = {
  endingCycleNumber: number;
  trophiesEarned: string[];
  trophyPointsEarned: number;
  leaderboardRank?: number;
};

async function computeLeaderboardRank(townId: number): Promise<number | undefined> {
  const towns = await db.select().from(townsTable);
  const allSlots = await db.select().from(buildingSlotsTable);
  const allArmy = await db.select().from(armyTable);

  const slotsByTown = new Map<number, typeof allSlots>();
  for (const slot of allSlots) {
    if (!slotsByTown.has(slot.townId)) slotsByTown.set(slot.townId, []);
    slotsByTown.get(slot.townId)!.push(slot);
  }
  const armyByTown = new Map(allArmy.map((a) => [a.townId, a]));

  const competitive = towns.filter((t) => !t.peacefulMode);
  const entries = competitive.map((town) => {
    const slots = slotsByTown.get(town.id) ?? [];
    const economyScore = calculateEconomyScore(slots);
    const army = armyByTown.get(town.id);
    const recruited = army
      ? recruitedFromRow(army)
      : { infantry: 0, archers: 0, cavalry: 0 };
    const composition = calculateArmyComposition(slots, recruited);
    return { townId: town.id, score: economyScore + composition.totalPower };
  });

  entries.sort((a, b) => b.score - a.score);
  const idx = entries.findIndex((e) => e.townId === townId);
  return idx >= 0 ? idx + 1 : undefined;
}

export async function buildCycleRecap(
  townId: number,
  playerId: number,
  endingCycleNumber: number,
  peacefulMode: boolean,
): Promise<CycleRecap> {
  const trophies = await db
    .select()
    .from(trophiesTable)
    .where(
      and(
        eq(trophiesTable.playerId, playerId),
        eq(trophiesTable.cycleNumber, endingCycleNumber),
      ),
    );

  let trophyPointsEarned = 0;
  const trophiesEarned: string[] = [];
  for (const t of trophies) {
    trophiesEarned.push(t.type);
    const def = ACHIEVEMENT_BY_ID[t.type as AchievementId];
    if (def) trophyPointsEarned += def.points;
  }

  let leaderboardRank: number | undefined;
  if (!peacefulMode) {
    leaderboardRank = await computeLeaderboardRank(townId);
  }

  return {
    endingCycleNumber,
    trophiesEarned,
    trophyPointsEarned,
    leaderboardRank,
  };
}

export function formatCycleRecapBody(recap: CycleRecap): string {
  const parts = [
    `Cycle ${recap.endingCycleNumber} complete — ${recap.trophiesEarned.length} trophy${recap.trophiesEarned.length === 1 ? "" : "ies"} (${recap.trophyPointsEarned} pts).`,
  ];
  if (recap.leaderboardRank != null) {
    parts.push(`Leaderboard rank: #${recap.leaderboardRank}.`);
  }
  parts.push("Your kingdom has been reset. Trophies are saved; everything else starts anew.");
  return parts.join(" ");
}
