/** All kingdom building slot types (matches lib/db SLOT_TYPES). */
export const BUILDING_SLOT_TYPES = [
  "townHall",
  "farm",
  "house",
  "lumberMill",
  "quarry",
  "mine",
  "wall",
  "market",
  "tavern",
  "museum",
  "monument",
  "tower",
  "barracks",
  "archeryRange",
  "stables",
  "spyGuild",
  "shipyard",
] as const;

export type AchievementId =
  | "master_builder"
  | "skyline"
  | "grand_treasury"
  | "economic_power"
  | "military_might"
  | "mission_victory"
  | "raid_conqueror"
  | "peaceful_realm"
  | "shadow_network"
  | "treasure_hoard"
  | "admiral"
  | "thriving_realm"
  | "cultural_capital";

export type AchievementDefinition = {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  points: number;
};

/** Achievement catalog — re-earned each cycle; trophy rows record which cycles you cleared them. */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: "master_builder",
    title: "Master Builder",
    description: "Raise every building type in your kingdom at least once in a cycle.",
    icon: "hammer-wrench",
    points: 50,
  },
  {
    id: "skyline",
    title: "Skyline",
    description: "Upgrade any building to level 10.",
    icon: "office-building",
    points: 40,
  },
  {
    id: "grand_treasury",
    title: "Grand Treasury",
    description: "Hold at least 1,000 gold, food, wood, and stone at once.",
    icon: "treasure-chest",
    points: 35,
  },
  {
    id: "economic_power",
    title: "Economic Power",
    description: "Reach an economy score of 150 in a single cycle.",
    icon: "chart-line",
    points: 25,
  },
  {
    id: "military_might",
    title: "Military Might",
    description: "Reach an army score of 150 in a single cycle.",
    icon: "sword-cross",
    points: 25,
  },
  {
    id: "mission_victory",
    title: "Mission Victor",
    description: "Complete a mission successfully.",
    icon: "flag-checkered",
    points: 15,
  },
  {
    id: "raid_conqueror",
    title: "Raid Conqueror",
    description: "Win a raid against another kingdom.",
    icon: "sword",
    points: 20,
  },
  {
    id: "peaceful_realm",
    title: "Peaceful Realm",
    description: "Opt into permanent peaceful mode.",
    icon: "shield-check",
    points: 10,
  },
  {
    id: "shadow_network",
    title: "Shadow Network",
    description: "Complete a successful spy operation.",
    icon: "incognito",
    points: 20,
  },
  {
    id: "treasure_hoard",
    title: "Treasure Hoard",
    description: "Loot over 200 total resources from a single spy operation.",
    icon: "gold",
    points: 30,
  },
  {
    id: "admiral",
    title: "Admiral",
    description: "Complete a successful naval mission.",
    icon: "ferry",
    points: 20,
  },
  {
    id: "thriving_realm",
    title: "Thriving Realm",
    description: "Grow your population to at least 50.",
    icon: "account-group",
    points: 25,
  },
  {
    id: "cultural_capital",
    title: "Cultural Capital",
    description: "Build both a Museum and a Monument in one cycle.",
    icon: "bank",
    points: 30,
  },
];

export const ACHIEVEMENT_BY_ID: Record<AchievementId, AchievementDefinition> = Object.fromEntries(
  ACHIEVEMENT_DEFINITIONS.map((a) => [a.id, a]),
) as Record<AchievementId, AchievementDefinition>;

export const BUILDING_SLOT_COUNT = BUILDING_SLOT_TYPES.length;

export const RESOURCE_WEALTH_MIN = 1000;
export const SCORE_MILESTONE = 150;
export const THRIVING_REALM_POP = 50;
export const SPY_HOARD_LOOT_THRESHOLD = 200;

export type SlotSnapshot = { slotType: string; level: number };

export type TownAchievementSnapshot = {
  gold: number;
  food: number;
  wood: number;
  stone: number;
  peacefulMode: boolean;
  economyScore: number;
  armyScore: number;
  population: number;
  slots: SlotSnapshot[];
};

export type AchievementProgress = {
  id: AchievementId;
  percent: number;
  unlocked: boolean;
  missingSlotTypes?: string[];
  hint?: string;
};

function slotLevel(slots: SlotSnapshot[], slotType: string): number {
  let max = 0;
  for (const s of slots) {
    if (s.slotType !== slotType) continue;
    const lv = Number(s.level) || 0;
    if (lv > max) max = lv;
  }
  return max;
}

/** Returns achievement ids newly earned (not yet unlocked). */
export function evaluateAchievements(
  snapshot: TownAchievementSnapshot,
  alreadyUnlocked: Set<string>,
  triggers?: Partial<Record<AchievementId, boolean>>,
): AchievementId[] {
  const earned: AchievementId[] = [];

  const tryAdd = (id: AchievementId, condition: boolean) => {
    if (!condition || alreadyUnlocked.has(id)) return;
    earned.push(id);
  };

  const allBuilt = BUILDING_SLOT_TYPES.every((t) => slotLevel(snapshot.slots, t) >= 1);
  const anyMaxLevel = BUILDING_SLOT_TYPES.some((t) => slotLevel(snapshot.slots, t) >= 10);
  const wealthy =
    snapshot.gold >= RESOURCE_WEALTH_MIN &&
    snapshot.food >= RESOURCE_WEALTH_MIN &&
    snapshot.wood >= RESOURCE_WEALTH_MIN &&
    snapshot.stone >= RESOURCE_WEALTH_MIN;

  tryAdd("master_builder", allBuilt);
  tryAdd("skyline", anyMaxLevel);
  tryAdd("grand_treasury", wealthy);
  tryAdd("economic_power", snapshot.economyScore >= SCORE_MILESTONE);
  tryAdd("military_might", snapshot.armyScore >= SCORE_MILESTONE);
  tryAdd("peaceful_realm", snapshot.peacefulMode);
  tryAdd("thriving_realm", snapshot.population >= THRIVING_REALM_POP);
  tryAdd(
    "cultural_capital",
    slotLevel(snapshot.slots, "museum") >= 1 && slotLevel(snapshot.slots, "monument") >= 1,
  );
  tryAdd("mission_victory", triggers?.mission_victory === true);
  tryAdd("raid_conqueror", triggers?.raid_conqueror === true);
  tryAdd("shadow_network", triggers?.shadow_network === true);
  tryAdd("treasure_hoard", triggers?.treasure_hoard === true);
  tryAdd("admiral", triggers?.admiral === true);

  return earned;
}

export function getAchievementProgress(
  snapshot: TownAchievementSnapshot,
  unlockedIds: Set<string>,
): AchievementProgress[] {
  const builtCount = BUILDING_SLOT_TYPES.filter((t) => slotLevel(snapshot.slots, t) >= 1).length;
  const missingSlots = BUILDING_SLOT_TYPES.filter((t) => slotLevel(snapshot.slots, t) < 1);
  const maxLevel = Math.max(0, ...BUILDING_SLOT_TYPES.map((t) => slotLevel(snapshot.slots, t)));

  const entries: { id: AchievementId; percent: number; hint?: string; missingSlotTypes?: string[] }[] = [
    {
      id: "master_builder",
      percent: Math.round((builtCount / BUILDING_SLOT_COUNT) * 100),
      missingSlotTypes: missingSlots,
      hint: `${builtCount}/${BUILDING_SLOT_COUNT} building types raised`,
    },
    {
      id: "skyline",
      percent: Math.round((maxLevel / 10) * 100),
      hint: maxLevel >= 10 ? "Complete" : `Highest building: level ${maxLevel}/10`,
    },
    {
      id: "grand_treasury",
      percent: Math.round(
        (Math.min(snapshot.gold, RESOURCE_WEALTH_MIN) / RESOURCE_WEALTH_MIN +
          Math.min(snapshot.food, RESOURCE_WEALTH_MIN) / RESOURCE_WEALTH_MIN +
          Math.min(snapshot.wood, RESOURCE_WEALTH_MIN) / RESOURCE_WEALTH_MIN +
          Math.min(snapshot.stone, RESOURCE_WEALTH_MIN) / RESOURCE_WEALTH_MIN) /
          4 *
          100,
      ),
    },
    {
      id: "economic_power",
      percent: Math.min(100, Math.round((snapshot.economyScore / SCORE_MILESTONE) * 100)),
      hint: `Economy ${Math.round(snapshot.economyScore)}/${SCORE_MILESTONE}`,
    },
    {
      id: "military_might",
      percent: Math.min(100, Math.round((snapshot.armyScore / SCORE_MILESTONE) * 100)),
      hint: `Army ${Math.round(snapshot.armyScore)}/${SCORE_MILESTONE}`,
    },
    {
      id: "thriving_realm",
      percent: Math.min(100, Math.round((snapshot.population / THRIVING_REALM_POP) * 100)),
      hint: `Population ${Math.round(snapshot.population)}/${THRIVING_REALM_POP}`,
    },
    {
      id: "cultural_capital",
      percent:
        (slotLevel(snapshot.slots, "museum") >= 1 ? 50 : 0) +
        (slotLevel(snapshot.slots, "monument") >= 1 ? 50 : 0),
      hint: "Build Museum and Monument",
    },
  ];

  return entries.map((e) => ({
    id: e.id,
    percent: Math.min(100, e.percent),
    unlocked: unlockedIds.has(e.id),
    missingSlotTypes: e.missingSlotTypes,
    hint: e.hint,
  }));
}
