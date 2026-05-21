import {
  ACHIEVEMENT_BY_ID,
  evaluateAchievements,
  type AchievementId,
  type TownAchievementSnapshot,
} from "@workspace/achievements";
import { db } from "@workspace/db";
import {
  activitiesTable,
  buildingSlotsTable,
  playersTable,
  trophiesTable,
  townsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  calculateArmyComposition,
  calculateEconomyScore,
  getCurrentSeasonInfo,
} from "./gameEngine.js";

export async function getUnlockedAchievementTypes(
  playerId: number,
  cycleNumber: number,
): Promise<Set<string>> {
  const rows = await db
    .select({ type: trophiesTable.type })
    .from(trophiesTable)
    .where(
      and(eq(trophiesTable.playerId, playerId), eq(trophiesTable.cycleNumber, cycleNumber)),
    );
  return new Set(rows.map((r) => r.type));
}

async function awardAchievement(
  playerId: number,
  townId: number,
  achievementId: AchievementId,
  cycleNumber: number,
): Promise<boolean> {
  const def = ACHIEVEMENT_BY_ID[achievementId];
  if (!def) return false;

  const unlocked = await getUnlockedAchievementTypes(playerId, cycleNumber);
  if (unlocked.has(achievementId)) return false;

  await db.insert(trophiesTable).values({
    playerId,
    type: achievementId,
    cycleNumber,
    description: def.title,
  });

  const [player] = await db
    .select({ trophyPoints: playersTable.trophyPoints })
    .from(playersTable)
    .where(eq(playersTable.id, playerId))
    .limit(1);
  if (player) {
    await db
      .update(playersTable)
      .set({ trophyPoints: player.trophyPoints + def.points })
      .where(eq(playersTable.id, playerId));
  }

  await db.insert(activitiesTable).values({
    townId,
    type: "achievement_unlocked",
    title: "Achievement Unlocked",
    body: `${def.title} — ${def.description} (Cycle ${cycleNumber}, +${def.points} pts)`,
    icon: def.icon,
    iconColor: "#d4a520",
  });

  return true;
}

export async function checkAndAwardAchievements(
  townId: number,
  snapshot: TownAchievementSnapshot,
  triggers?: Partial<Record<AchievementId, boolean>>,
): Promise<AchievementId[]> {
  const [town] = await db
    .select({ playerId: townsTable.playerId })
    .from(townsTable)
    .where(eq(townsTable.id, townId))
    .limit(1);
  if (!town) return [];

  const { cycleNumber } = getCurrentSeasonInfo();
  const unlocked = await getUnlockedAchievementTypes(town.playerId, cycleNumber);
  const pending = evaluateAchievements(snapshot, unlocked, triggers);
  const awarded: AchievementId[] = [];

  for (const id of pending) {
    const ok = await awardAchievement(town.playerId, townId, id, cycleNumber);
    if (ok) {
      unlocked.add(id);
      awarded.push(id);
    }
  }

  return awarded;
}

export async function checkAchievementsForTown(
  townId: number,
  triggers?: Partial<Record<AchievementId, boolean>>,
): Promise<AchievementId[]> {
  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return [];

  const slots = await db
    .select({ slotType: buildingSlotsTable.slotType, level: buildingSlotsTable.level })
    .from(buildingSlotsTable)
    .where(eq(buildingSlotsTable.townId, townId));

  const snapshot: TownAchievementSnapshot = {
    gold: town.gold,
    food: town.food,
    wood: town.wood,
    stone: town.stone,
    peacefulMode: town.peacefulMode,
    economyScore: calculateEconomyScore(slots),
    armyScore: calculateArmyComposition(slots).totalPower,
    population: town.population,
    slots,
  };

  return checkAndAwardAchievements(townId, snapshot, triggers);
}
