import type { TownAchievementSnapshot } from "@workspace/achievements";

export type Season = "spring" | "summer" | "autumn" | "winter";

export const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];

export type ResourceBundle = { gold: number; food: number; wood: number; stone: number };

export type ObjectiveKind =
  | "population"
  | "economy_score"
  | "army_score"
  | "slot_level"
  | "activity_count";

export type SeasonObjectiveDefinition = {
  id: string;
  season: Season;
  title: string;
  description: string;
  kind: ObjectiveKind;
  target: number;
  slotType?: string;
  activityTypes?: string[];
  reward: ResourceBundle;
};

function slotLevel(slots: TownAchievementSnapshot["slots"], slotType: string): number {
  let max = 0;
  for (const s of slots) {
    if (s.slotType !== slotType) continue;
    const lv = Number(s.level) || 0;
    if (lv > max) max = lv;
  }
  return max;
}

export const SEASON_OBJECTIVES: SeasonObjectiveDefinition[] = [
  {
    id: "spring_pop_25",
    season: "spring",
    title: "Spring Growth",
    description: "Grow your population to 25.",
    kind: "population",
    target: 25,
    reward: { gold: 30, food: 40, wood: 20, stone: 10 },
  },
  {
    id: "spring_missions_3",
    season: "spring",
    title: "Scout the Realm",
    description: "Complete 3 successful missions this season.",
    kind: "activity_count",
    target: 3,
    activityTypes: ["mission_success"],
    reward: { gold: 25, food: 25, wood: 25, stone: 15 },
  },
  {
    id: "spring_farm_2",
    season: "spring",
    title: "Sow the Fields",
    description: "Upgrade your Farm to level 2.",
    kind: "slot_level",
    target: 2,
    slotType: "farm",
    reward: { gold: 15, food: 50, wood: 30, stone: 10 },
  },
  {
    id: "spring_eco_50",
    season: "spring",
    title: "Budding Economy",
    description: "Reach an economy score of 50.",
    kind: "economy_score",
    target: 50,
    reward: { gold: 40, food: 20, wood: 30, stone: 20 },
  },
  {
    id: "summer_pop_35",
    season: "summer",
    title: "Summer Census",
    description: "Grow your population to 35.",
    kind: "population",
    target: 35,
    reward: { gold: 35, food: 45, wood: 25, stone: 15 },
  },
  {
    id: "summer_missions_5",
    season: "summer",
    title: "Campaign Season",
    description: "Complete 5 successful missions this season.",
    kind: "activity_count",
    target: 5,
    activityTypes: ["mission_success"],
    reward: { gold: 40, food: 30, wood: 35, stone: 20 },
  },
  {
    id: "summer_raid_1",
    season: "summer",
    title: "First Conquest",
    description: "Win a raid against another kingdom.",
    kind: "activity_count",
    target: 1,
    activityTypes: ["raid_outgoing_win"],
    reward: { gold: 50, food: 40, wood: 20, stone: 20 },
  },
  {
    id: "summer_army_75",
    season: "summer",
    title: "War Council",
    description: "Reach an army score of 75.",
    kind: "army_score",
    target: 75,
    reward: { gold: 45, food: 35, wood: 25, stone: 25 },
  },
  {
    id: "autumn_pop_45",
    season: "autumn",
    title: "Harvest Hands",
    description: "Grow your population to 45.",
    kind: "population",
    target: 45,
    reward: { gold: 40, food: 50, wood: 35, stone: 25 },
  },
  {
    id: "autumn_eco_100",
    season: "autumn",
    title: "Trade Routes",
    description: "Reach an economy score of 100.",
    kind: "economy_score",
    target: 100,
    reward: { gold: 55, food: 35, wood: 45, stone: 30 },
  },
  {
    id: "autumn_trades_4",
    season: "autumn",
    title: "Merchant Season",
    description: "Complete 4 trade deals this season.",
    kind: "activity_count",
    target: 4,
    activityTypes: ["trade_complete"],
    reward: { gold: 35, food: 30, wood: 50, stone: 35 },
  },
  {
    id: "autumn_th_4",
    season: "autumn",
    title: "Expand the Hall",
    description: "Upgrade Town Hall to level 4.",
    kind: "slot_level",
    target: 4,
    slotType: "townHall",
    reward: { gold: 60, food: 40, wood: 50, stone: 40 },
  },
  {
    id: "winter_pop_50",
    season: "winter",
    title: "Thriving Realm",
    description: "Grow your population to 50.",
    kind: "population",
    target: 50,
    reward: { gold: 50, food: 55, wood: 40, stone: 30 },
  },
  {
    id: "winter_missions_8",
    season: "winter",
    title: "Winter Campaign",
    description: "Complete 8 successful missions this season.",
    kind: "activity_count",
    target: 8,
    activityTypes: ["mission_success"],
    reward: { gold: 55, food: 45, wood: 45, stone: 35 },
  },
  {
    id: "winter_spy_1",
    season: "winter",
    title: "Shadow Network",
    description: "Complete a successful spy operation.",
    kind: "activity_count",
    target: 1,
    activityTypes: ["spy_success"],
    reward: { gold: 45, food: 30, wood: 25, stone: 25 },
  },
  {
    id: "winter_score_150",
    season: "winter",
    title: "Cycle Champion",
    description: "Reach a combined economy + army score of 150.",
    kind: "economy_score",
    target: 150,
    reward: { gold: 70, food: 50, wood: 50, stone: 40 },
  },
];

export const SEASON_OBJECTIVE_BY_ID: Record<string, SeasonObjectiveDefinition> = Object.fromEntries(
  SEASON_OBJECTIVES.map((o) => [o.id, o]),
);

export function getObjectivesForSeason(season: Season): SeasonObjectiveDefinition[] {
  return SEASON_OBJECTIVES.filter((o) => o.season === season);
}

export type ActivityLike = { type: string; createdAt: Date | string };

export function countActivitiesInWindow(
  activities: ActivityLike[],
  types: string[],
  windowStartMs: number,
  windowEndMs: number,
): number {
  let count = 0;
  for (const a of activities) {
    if (!types.includes(a.type)) continue;
    const t = new Date(a.createdAt).getTime();
    if (t >= windowStartMs && t < windowEndMs) count++;
  }
  return count;
}

export function getSeasonWindowMs(cycleStartedAt: string, seasonIndex: number): {
  startMs: number;
  endMs: number;
} {
  const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;
  const cycleStartMs = new Date(cycleStartedAt).getTime();
  const startMs = cycleStartMs + seasonIndex * MS_PER_WEEK;
  return { startMs, endMs: startMs + MS_PER_WEEK };
}

export function evaluateObjectiveProgress(
  def: SeasonObjectiveDefinition,
  snapshot: TownAchievementSnapshot,
  activityCounts: Record<string, number>,
): { current: number; target: number; complete: boolean; percent: number } {
  let current = 0;

  switch (def.kind) {
    case "population":
      current = snapshot.population;
      break;
    case "economy_score":
      if (def.id === "winter_score_150") {
        current = snapshot.economyScore + snapshot.armyScore;
      } else {
        current = snapshot.economyScore;
      }
      break;
    case "army_score":
      current = snapshot.armyScore;
      break;
    case "slot_level":
      current = slotLevel(snapshot.slots, def.slotType ?? "");
      break;
    case "activity_count": {
      const types = def.activityTypes ?? [];
      current = types.reduce((sum, t) => sum + (activityCounts[t] ?? 0), 0);
      break;
    }
  }

  const target = def.target;
  const complete = current >= target;
  const percent = Math.min(100, Math.round((current / target) * 100));
  return { current, target, complete, percent };
}

export type SeasonObjectiveProgress = {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  percent: number;
  complete: boolean;
  claimed: boolean;
  reward: ResourceBundle;
};

export function buildSeasonObjectiveList(
  season: Season,
  snapshot: TownAchievementSnapshot,
  activities: ActivityLike[],
  cycleStartedAt: string,
  seasonIndex: number,
  claimedIds: Set<string>,
): SeasonObjectiveProgress[] {
  const { startMs, endMs } = getSeasonWindowMs(cycleStartedAt, seasonIndex);
  const inWindow = activities.filter((a) => {
    const t = new Date(a.createdAt).getTime();
    return t >= startMs && t < endMs;
  });

  const activityCounts: Record<string, number> = {};
  for (const a of inWindow) {
    activityCounts[a.type] = (activityCounts[a.type] ?? 0) + 1;
  }

  return getObjectivesForSeason(season).map((def) => {
    const progress = evaluateObjectiveProgress(def, snapshot, activityCounts);
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      current: progress.current,
      target: progress.target,
      percent: progress.percent,
      complete: progress.complete,
      claimed: claimedIds.has(def.id),
      reward: def.reward,
    };
  });
}

export function hasUnclaimedCompleteObjectives(objectives: SeasonObjectiveProgress[]): boolean {
  return objectives.some((o) => o.complete && !o.claimed);
}
