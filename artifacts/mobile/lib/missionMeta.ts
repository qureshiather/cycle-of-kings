import type { ResourceAmounts } from "@/lib/buildingMeta";
import type { ResourceKey } from "@/lib/resourceMeta";

const REWARD_TIER: Record<string, string> = {
  easy: "Low",
  medium: "Medium",
  hard: "High",
};

export function missionRewardTierLabel(difficulty: string): string {
  return REWARD_TIER[difficulty] ?? "Medium";
}

/** Top loot types for this card (bases are hidden; amounts roll on return). */
export function missionPossibleLootResources(
  card: { lootGold: number; lootFood: number; lootWood: number; lootStone: number },
  max = 2,
): ResourceKey[] {
  const ranked: { key: ResourceKey; base: number }[] = [
    { key: "gold", base: card.lootGold ?? 0 },
    { key: "food", base: card.lootFood ?? 0 },
    { key: "wood", base: card.lootWood ?? 0 },
    { key: "stone", base: card.lootStone ?? 0 },
  ];
  return ranked
    .filter((e) => e.base > 0)
    .sort((a, b) => b.base - a.base)
    .slice(0, max)
    .map((e) => e.key);
}

export type MissionActivityMetadata = {
  missionTitle: string;
  success: boolean;
  playerTroops: { infantry: number; archers: number; cavalry: number; mercenaries?: number; total: number };
  enemyTroops: { infantry: number; archers: number; cavalry: number; mercenaries?: number; total: number };
  loot?: ResourceAmounts;
  casualties?: number;
};

/** Mirrors api-server `seededRandom` + `generateEnemyForce` for legacy rows with 0 enemy troops. */
function synthesizeEnemyForce(
  seed: number,
  playerTotal: number,
  difficulty: "easy" | "medium" | "hard" = "medium",
): { infantry: number; archers: number; cavalry: number; total: number } {
  let s = seed;
  const rng = () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0xffffffff;
  };
  const diffScale = { easy: 0.55, medium: 0.8, hard: 1.05 }[difficulty];
  const enemyTotal = Math.max(1, Math.round(playerTotal * diffScale * (0.7 + rng() * 0.55)));
  let inf = Math.floor(rng() * (enemyTotal + 1));
  let arch = Math.floor(rng() * (enemyTotal - inf + 1));
  let cav = enemyTotal - inf - arch;
  if (cav < 0) {
    arch = Math.max(0, arch + cav);
    cav = 0;
  }
  if (inf + arch + cav === 0) inf = 1;
  return { infantry: inf, archers: arch, cavalry: cav, total: inf + arch + cav };
}

function titleSeed(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function withEnemyTroops(meta: MissionActivityMetadata): MissionActivityMetadata {
  if ((meta.enemyTroops?.total ?? 0) > 0) return meta;
  const playerTotal = meta.playerTroops.total || 1;
  const enemy = synthesizeEnemyForce(titleSeed(meta.missionTitle), playerTotal);
  return {
    ...meta,
    enemyTroops: {
      infantry: enemy.infantry,
      archers: enemy.archers,
      cavalry: enemy.cavalry,
      total: enemy.total,
    },
  };
}

export function parseMissionActivityMetadata(raw: unknown): MissionActivityMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as MissionActivityMetadata;
  if (!m.missionTitle || typeof m.success !== "boolean" || !m.playerTroops || !m.enemyTroops) return null;
  return withEnemyTroops(m);
}

export function formatTroopLine(side: {
  infantry: number;
  archers: number;
  cavalry: number;
  mercenaries?: number;
  total: number;
}): string {
  const parts: string[] = [];
  if (side.infantry) parts.push(`${side.infantry} inf`);
  if (side.archers) parts.push(`${side.archers} arch`);
  if (side.cavalry) parts.push(`${side.cavalry} cav`);
  if (side.mercenaries) parts.push(`${side.mercenaries} merc`);
  return parts.length ? `${parts.join(", ")} (${side.total})` : `${side.total} troops`;
}

export type MissionBattleFlavor = {
  stamp: string;
  tagline: string;
  scoutNote: string;
  playerLabel: string;
  enemyLabel: string;
  doneLabel: string;
};

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

/** Playful copy for the mission result sheet — RNG theater, not simulation truth. */
export function missionBattleFlavor(meta: MissionActivityMetadata): MissionBattleFlavor {
  const yours = meta.playerTroops.total;
  const theirs = meta.enemyTroops.total;
  const diff = yours - theirs;
  const outnumbered = diff < 0;
  const steamroll = diff >= 2;
  const even = Math.abs(diff) <= 1;

  if (meta.success) {
    const tagline = outnumbered
      ? pick([
          "The dice gods smiled. Your captain swears it was skill.",
          "Outnumbered on paper — victorious in the scrolls.",
          "They had more boots; you had better luck.",
        ])
      : steamroll
        ? pick([
            "A textbook stomping. The bard already has a verse.",
            "The enemy line folded like wet parchment.",
            "Your troops returned before the stew went cold.",
          ])
        : even
          ? pick([
              "Even numbers, uneven outcome. Fortune favors the bold.",
              "A fair fight that ended unfairly — for them.",
              "Neither side blinked. Only one side won.",
            ])
          : pick([
              "Numbers favored you; the realm reaps the reward.",
              "Discipline and dice — a winning combination.",
              "Your banner flies over their camp tonight.",
            ]);

    return {
      stamp: pick(["VICTORY", "GLORIOUS WIN", "SPOILS SECURED", "TRIUMPH"]),
      tagline,
      scoutNote: pick([
        "Scout's report: cheering heard three leagues away. Merchants are already raising prices on victory wine.",
        "The quartermaster claims the loot wagons are \"within acceptable squeaking limits.\"",
        "Local peasants insist they always believed in you. (They did not.)",
        "A crow delivered no news — because your soldiers ate it. Metaphorically. Probably.",
      ]),
      playerLabel: pick(["Your warband", "Forces sent forth", "Heroes of the realm"]),
      enemyLabel: pick(["Foe crushed", "Enemy routed", "Unlucky opposition"]),
      doneLabel: pick(["Claim the glory", "Excellent", "To the treasury!", "Raise a toast"]),
    };
  }

  const tagline = outnumbered
    ? pick([
        "They brought more swords. Mathematics remains undefeated.",
        "Outnumbered and out-lucked. Regroup and try the dice again.",
        "The enemy had numbers; you had hope. Hope lost.",
      ])
    : steamroll
      ? pick([
          "You had the bigger host and still lost. The court will whisper.",
          "Statistically embarrassing. Blame the wind, the moon, anything.",
          "Your soldiers are \"tactically repositioning\" toward the tavern.",
        ])
      : even
        ? pick([
            "A coin-flip battle that landed tails. Hard.",
            "Perfectly matched forces. Imperfectly matched luck.",
            "Neither side deserved this — yours got it anyway.",
          ])
        : pick([
            "You should have won. The RNG scroll says otherwise.",
            "Advantage wasted. The enemy won't stop talking about this.",
            "Your captain blames \"unseasonable fog.\" There was no fog.",
          ]);

  const scoutNote =
    (meta.casualties ?? 0) > 0
      ? pick([
          `Scout's report: ${meta.casualties} souls limped home. The surgeon has run out of polite euphemisms.`,
          "The survivors are calling it a \"learning experience.\" The king is not amused.",
          "Retreat was orderly. Morale was not. Someone started a rumor about a cursed die.",
          "Your troops insist the enemy cheated. Historians will call it \"bad luck.\"",
        ])
      : pick([
          "Scout's report: everyone returned intact, if not dignified. Pride took the casualties.",
          "No bodies lost — only egos. The tavern keeper has already renamed your tab \"Defeat Special.\"",
          "Clean retreat, messy reputation. The court jester has new material.",
          "Your captain recommends blaming the weather. It was sunny.",
        ]);

  return {
    stamp: pick(["DEFEAT", "ROUTED", "FORTUNE FROWNS", "HARD LUCK"]),
    tagline,
    scoutNote,
    playerLabel: pick(["Your battered band", "Forces withdrawn", "What we sent"]),
    enemyLabel: pick(["Foe triumphant", "Enemy still standing", "Luckier rabble"]),
    doneLabel: pick(["Regroup at camp", "Curse the dice", "Next time...", "Slink home"]),
  };
}
