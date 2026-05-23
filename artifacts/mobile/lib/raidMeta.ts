import type { ResourceAmounts } from "@/lib/buildingMeta";
import { formatTroopLine } from "@/lib/missionMeta";
import type { Raid } from "@workspace/api-client-react";

export type RaidTroopSide = {
  infantry: number;
  archers: number;
  cavalry: number;
  total: number;
};

export type RaidActivityMetadata = {
  raidTitle: string;
  role: "attacker" | "defender";
  success: boolean;
  opponentTownName: string;
  attackerTroops: RaidTroopSide;
  defenderStrength: number;
  attackPower: number;
  loot?: ResourceAmounts;
  casualties?: number;
};

export function parseRaidActivityMetadata(raw: unknown): RaidActivityMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as RaidActivityMetadata;
  if (
    !m.raidTitle ||
    (m.role !== "attacker" && m.role !== "defender") ||
    typeof m.success !== "boolean" ||
    !m.opponentTownName ||
    !m.attackerTroops ||
    typeof m.defenderStrength !== "number" ||
    typeof m.attackPower !== "number"
  ) {
    return null;
  }
  return m;
}

export function buildRaidSummaryFromRecord(raid: Raid, viewerTownId: number): RaidActivityMetadata | null {
  if (raid.status !== "resolved" || !raid.result) return null;
  const isAttacker = raid.attackerTownId === viewerTownId;
  const attackerWon = raid.result === "victory";
  const success = isAttacker ? attackerWon : !attackerWon;
  const opponentTownName = isAttacker ? raid.defenderTownName : raid.attackerTownName;
  const hasLoot = (raid.lootGold ?? 0) + (raid.lootFood ?? 0) + (raid.lootWood ?? 0) + (raid.lootStone ?? 0) > 0;

  return {
    raidTitle: isAttacker ? `Raid on ${raid.defenderTownName}` : `Defense vs ${raid.attackerTownName}`,
    role: isAttacker ? "attacker" : "defender",
    success,
    opponentTownName,
    attackerTroops: {
      infantry: raid.attackerInfantry,
      archers: raid.attackerArchers,
      cavalry: raid.attackerCavalry,
      total: raid.attackerInfantry + raid.attackerArchers + raid.attackerCavalry,
    },
    defenderStrength: raid.defenderStrength,
    attackPower: estimateAttackPower(raid.attackerInfantry, raid.attackerArchers, raid.attackerCavalry),
    casualties: raid.attackerCasualties,
    loot: hasLoot
      ? {
          gold: raid.lootGold ?? 0,
          food: raid.lootFood ?? 0,
          wood: raid.lootWood ?? 0,
          stone: raid.lootStone ?? 0,
        }
      : undefined,
  };
}

/** Mirrors api-server attack power rules for legacy raid rows without stored attackPower. */
function estimateAttackPower(infantry: number, archers: number, cavalry: number): number {
  let attackPower = infantry * 10 + archers * 15 + cavalry * 12;
  if (infantry > 0 && archers > 0) attackPower += archers * 3;
  if (cavalry > 0) attackPower *= 1.1;
  return Math.round(attackPower);
}

export function formatDefenseLine(strength: number): string {
  return `Walls + garrison · ${Math.round(strength)} defense`;
}

export function playerRaidPower(meta: RaidActivityMetadata): number {
  return meta.role === "attacker" ? meta.attackerTroops.total : Math.round(meta.defenderStrength);
}

export function opponentRaidPower(meta: RaidActivityMetadata): number {
  return meta.role === "attacker" ? Math.round(meta.defenderStrength) : meta.attackerTroops.total;
}

export { formatTroopLine };

export type RaidBattleFlavor = {
  stamp: string;
  tagline: string;
  scoutNote: string;
  playerLabel: string;
  opponentLabel: string;
  doneLabel: string;
};

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function raidBattleFlavor(meta: RaidActivityMetadata): RaidBattleFlavor {
  const yours = playerRaidPower(meta);
  const theirs = opponentRaidPower(meta);
  const diff = yours - theirs;
  const outnumbered = diff < 0;
  const steamroll = diff >= Math.max(3, Math.floor(theirs * 0.15));
  const even = Math.abs(diff) <= Math.max(2, Math.floor((yours + theirs) * 0.05));

  if (meta.success) {
    const tagline =
      meta.role === "defender"
        ? pick([
            "The walls held. The raiders limp home empty-handed.",
            "Your garrison sends them packing. The tavern erupts.",
            "They marched for hours — your defenses ended it in minutes.",
          ])
        : outnumbered
          ? pick([
              "Their walls looked taller on the map. Your dice disagreed.",
              "Outgunned on paper, victorious in the field.",
              "A daring raid that paid for itself twice over.",
            ])
          : steamroll
            ? pick([
                "The siege was brief. The wagons are not.",
                "Their coffers are lighter; your legend is heavier.",
                "A textbook sack. Bards are already rhyming about it.",
              ])
            : even
              ? pick([
                  "Even odds, uneven outcome — in your favor.",
                  "A fair clash that ended unfairly for them.",
                  "Neither side blinked. Only one side profited.",
                ])
              : pick([
                  "Numbers favored you; their granaries did not.",
                  "Discipline, timing, and a forgiving die.",
                  "Your banner flies over their storehouses tonight.",
                ]);

    return {
      stamp: pick(meta.role === "defender" ? ["REPULSED", "DEFENSE HOLDS", "RAID FOILED"] : ["VICTORY", "SACKED", "PLUNDER"]),
      tagline,
      scoutNote: pick([
        `Scout's report: attack power ${Math.round(meta.attackPower)} met ${Math.round(meta.defenderStrength)} defense at the walls.`,
        "The quartermaster is measuring wagon axles for extra loot.",
        "Merchants in town are nervously smiling at you. (They always do after a win.)",
        "A crow delivered no news — your soldiers ate well anyway.",
      ]),
      playerLabel: meta.role === "attacker" ? pick(["Your raiders", "Forces sent forth", "The warband"]) : pick(["Your defenses", "Walls & garrison", "The shield"]),
      opponentLabel:
        meta.role === "attacker"
          ? pick([`${meta.opponentTownName} held`, "Enemy defenses", "Their strength"])
          : pick([`${meta.opponentTownName}'s host`, "Attacking force", "The raiders"]),
      doneLabel: pick(["Claim the glory", "Excellent", "To the treasury!", "Raise a toast"]),
    };
  }

  const tagline =
    meta.role === "defender"
      ? pick([
          "The line broke. Their wagons roll away with your silver.",
          "Walls stood; the dice did not. A costly day.",
          "They had the luck. Your vaults have the bruises.",
        ])
      : outnumbered
        ? pick([
            "Their defenses were stouter than your courage.",
            "You brought heart; they brought stone and numbers.",
            "The march home will be quieter than the march out.",
          ])
        : pick([
            "You should have won. The realm's dice said otherwise.",
            "A raid that will be whispered about — unkindly.",
            "Your captain blames the wind. There was no wind.",
          ]);

  const scoutNote =
    meta.role === "attacker" && (meta.casualties ?? 0) > 0
      ? pick([
          `Scout's report: ${meta.casualties} troops did not return. The surgeon is out of euphemisms.`,
          "Survivors call it a \"learning experience.\" The court is not amused.",
          "Retreat was orderly. Morale was not.",
        ])
      : pick([
          `Scout's report: attack ${Math.round(meta.attackPower)} vs defense ${Math.round(meta.defenderStrength)} — fortune favored the other side.`,
          "Clean retreat, messy reputation. The jester has new material.",
          "Your troops insist the enemy cheated. Historians will call it \"bad luck.\"",
        ]);

  return {
    stamp: pick(meta.role === "defender" ? ["BREACHED", "FALLEN", "RAIDED"] : ["DEFEAT", "ROUTED", "REPULSED"]),
    tagline,
    scoutNote,
    playerLabel: meta.role === "attacker" ? pick(["Your battered band", "Forces withdrawn"]) : pick(["Your kingdom", "What you held"]),
    opponentLabel:
      meta.role === "attacker"
        ? pick([`${meta.opponentTownName} stood firm`, "Enemy held", "Their walls"])
        : pick([`${meta.opponentTownName}'s raiders`, "The attackers", "Enemy host"]),
    doneLabel: pick(["Regroup at camp", "Curse the dice", "Next time...", "Slink home"]),
  };
}
