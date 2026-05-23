import { Router } from "express";
import { db } from "@workspace/db";
import { raidsTable, townsTable, armyTable, buildingSlotsTable, activitiesTable } from "@workspace/db";
import type { Raid } from "@workspace/db";
import { eq, or, and } from "drizzle-orm";
import {
  simulateCombat,
  calculateArmyComposition,
  calculateTotalDefense,
  RAID_MARCH_DURATION_MS,
} from "../lib/gameEngine.js";
import { checkAchievementsForTown } from "../lib/awardAchievements.js";
import { initSlotsForTown } from "./slots.js";

const router = Router();

function attackerTroopSide(infantry: number, archers: number, cavalry: number) {
  return { infantry, archers, cavalry, total: infantry + archers + cavalry };
}

function buildRaidActivityMetadata(opts: {
  role: "attacker" | "defender";
  success: boolean;
  raidTitle: string;
  opponentTownName: string;
  attackerTroops: ReturnType<typeof attackerTroopSide>;
  defenderStrength: number;
  attackPower: number;
  casualties: number;
  loot?: { gold: number; food: number; wood: number; stone: number };
}) {
  return opts;
}

function fmtLoot(gold: number, food: number, wood: number, stone: number): string {
  const parts: string[] = [];
  if (gold > 0) parts.push(`${Math.floor(gold)}G`);
  if (food > 0) parts.push(`${Math.floor(food)}F`);
  if (wood > 0) parts.push(`${Math.floor(wood)}W`);
  if (stone > 0) parts.push(`${Math.floor(stone)}St`);
  return parts.join(" · ") || "nothing";
}

function serializeRaid(
  r: Raid,
  townMap: Map<number, string>,
) {
  return {
    ...r,
    attackerTownName: townMap.get(r.attackerTownId) ?? "Unknown",
    defenderTownName: townMap.get(r.defenderTownId) ?? "Unknown",
    createdAt: r.createdAt.toISOString(),
    arrivesAt: r.arrivesAt.toISOString(),
  };
}

async function resolveRaid(raid: Raid) {
  const infantry = raid.attackerInfantry;
  const archers = raid.attackerArchers;
  const cavalry = raid.attackerCavalry;
  const { victory, casualties, attackPower } = simulateCombat(
    { infantry, archers, cavalry },
    raid.defenderStrength,
  );
  const attackerTroops = attackerTroopSide(infantry, archers, cavalry);

  const [defTown] = await db.select().from(townsTable).where(eq(townsTable.id, raid.defenderTownId)).limit(1);
  if (!defTown) return;

  let lootGold = 0, lootFood = 0, lootWood = 0, lootStone = 0;
  if (victory) {
    lootGold = defTown.gold * 0.3;
    lootFood = defTown.food * 0.3;
    lootWood = defTown.wood * 0.3;
    lootStone = defTown.stone * 0.3;

    await db.update(townsTable)
      .set({ gold: defTown.gold - lootGold, food: defTown.food - lootFood, wood: defTown.wood - lootWood, stone: defTown.stone - lootStone })
      .where(eq(townsTable.id, raid.defenderTownId));

    const [attTown] = await db.select().from(townsTable).where(eq(townsTable.id, raid.attackerTownId)).limit(1);
    if (attTown) {
      await db.update(townsTable)
        .set({ gold: attTown.gold + lootGold, food: attTown.food + lootFood, wood: attTown.wood + lootWood, stone: attTown.stone + lootStone })
        .where(eq(townsTable.id, raid.attackerTownId));
    }
  }

  await db.update(raidsTable).set({
    status: "resolved",
    result: victory ? "victory" : "defeat",
    lootGold,
    lootFood,
    lootWood,
    lootStone,
    attackerCasualties: casualties,
  }).where(eq(raidsTable.id, raid.id));

  const armyRows = await db.select().from(armyTable).where(eq(armyTable.townId, raid.attackerTownId)).limit(1);
  if (armyRows.length) {
    const army = armyRows[0];
    await db.update(armyTable).set({
      onMissionInfantry: Math.max(0, army.onMissionInfantry - infantry),
      onMissionArchers: Math.max(0, army.onMissionArchers - archers),
      onMissionCavalry: Math.max(0, army.onMissionCavalry - cavalry),
      updatedAt: new Date(),
    }).where(eq(armyTable.townId, raid.attackerTownId));
  }

  const [attackerTown] = await db.select().from(townsTable).where(eq(townsTable.id, raid.attackerTownId)).limit(1);
  const attackerName = attackerTown?.name ?? "An enemy";
  const loot = victory
    ? { gold: lootGold, food: lootFood, wood: lootWood, stone: lootStone }
    : undefined;

  const outgoingMeta = buildRaidActivityMetadata({
    role: "attacker",
    success: victory,
    raidTitle: `Raid on ${defTown.name}`,
    opponentTownName: defTown.name,
    attackerTroops,
    defenderStrength: raid.defenderStrength,
    attackPower,
    casualties,
    loot,
  });
  const incomingMeta = buildRaidActivityMetadata({
    role: "defender",
    success: !victory,
    raidTitle: `Defense vs ${attackerName}`,
    opponentTownName: attackerName,
    attackerTroops,
    defenderStrength: raid.defenderStrength,
    attackPower,
    casualties,
    loot,
  });

  if (victory) {
    await checkAchievementsForTown(raid.attackerTownId, { raid_conqueror: true });
  }

  await db.insert(activitiesTable).values({
    townId: raid.attackerTownId,
    type: victory ? "raid_outgoing_win" : "raid_outgoing_loss",
    title: victory ? "Raid Victory!" : "Raid Defeated",
    body: victory
      ? `Raided ${defTown.name} — plundered ${fmtLoot(lootGold, lootFood, lootWood, lootStone)}. Lost ${casualties} troops.`
      : `Attacked ${defTown.name} but were repelled. Lost ${casualties} troops.`,
    icon: victory ? "sword" : "shield-off",
    iconColor: victory ? "#d4a520" : "#cc4040",
    metadata: JSON.stringify(outgoingMeta),
  });

  await db.insert(activitiesTable).values({
    townId: raid.defenderTownId,
    type: victory ? "raid_incoming_loss" : "raid_incoming_win",
    title: victory ? "Your Kingdom Was Raided!" : "Raid Repelled!",
    body: victory
      ? `${attackerName} raided your kingdom and took ${fmtLoot(lootGold, lootFood, lootWood, lootStone)}.`
      : `${attackerName} attacked your kingdom but your defenses held!`,
    icon: victory ? "shield-alert" : "shield-check",
    iconColor: victory ? "#cc4040" : "#3d7a35",
    metadata: JSON.stringify(incomingMeta),
  });
}

export async function resolvePendingRaidsForTown(townId: number) {
  const now = new Date();
  const marching = await db.select().from(raidsTable).where(
    and(
      eq(raidsTable.status, "marching"),
      or(eq(raidsTable.attackerTownId, townId), eq(raidsTable.defenderTownId, townId)),
    ),
  );

  for (const raid of marching) {
    if (raid.arrivesAt <= now) {
      await resolveRaid(raid);
    }
  }
}

router.get("/towns/:townId/raids", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  await resolvePendingRaidsForTown(townId);

  const raids = await db.select().from(raidsTable)
    .where(or(eq(raidsTable.attackerTownId, townId), eq(raidsTable.defenderTownId, townId)));

  const townIds = [...new Set([...raids.map(r => r.attackerTownId), ...raids.map(r => r.defenderTownId)])];
  const towns = townIds.length ? await db.select().from(townsTable) : [];
  const townMap = new Map(towns.map(t => [t.id, t.name]));

  res.json(raids.map(r => serializeRaid(r, townMap)));
});

router.post("/raids", async (req, res) => {
  const { attackerTownId, defenderTownId, infantry = 0, archers = 0, cavalry = 0 } = req.body as {
    attackerTownId?: number; defenderTownId?: number;
    infantry?: number; archers?: number; cavalry?: number;
  };

  if (!attackerTownId || !defenderTownId) return void res.status(400).json({ error: "attackerTownId and defenderTownId required" });
  if (attackerTownId === defenderTownId) return void res.status(400).json({ error: "Cannot raid yourself" });

  await resolvePendingRaidsForTown(attackerTownId);

  const [attTownCheck] = await db.select({ peacefulMode: townsTable.peacefulMode }).from(townsTable).where(eq(townsTable.id, attackerTownId)).limit(1);
  if (attTownCheck?.peacefulMode) return void res.status(403).json({ error: "Peaceful Mode is enabled — disable it in Settings to raid." });

  const [defTownCheck] = await db.select({ peacefulMode: townsTable.peacefulMode }).from(townsTable).where(eq(townsTable.id, defenderTownId)).limit(1);
  if (defTownCheck?.peacefulMode) return void res.status(403).json({ error: "That kingdom has Peaceful Mode enabled and cannot be raided." });

  await initSlotsForTown(attackerTownId);
  const attSlots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, attackerTownId));
  const attComposition = calculateArmyComposition(attSlots);
  const armyRows = await db.select().from(armyTable).where(eq(armyTable.townId, attackerTownId)).limit(1);
  const onMission = armyRows[0] ?? { onMissionInfantry: 0, onMissionArchers: 0, onMissionCavalry: 0 };

  const availInfantry = Math.max(0, attComposition.infantry - onMission.onMissionInfantry);
  const availArchers  = Math.max(0, attComposition.archers  - onMission.onMissionArchers);
  const availCavalry  = Math.max(0, attComposition.cavalry  - onMission.onMissionCavalry);

  if (infantry > availInfantry || archers > availArchers || cavalry > availCavalry) {
    return void res.status(400).json({ error: "Not enough available troops" });
  }
  if (infantry + archers + cavalry === 0) {
    return void res.status(400).json({ error: "Must send at least 1 troop" });
  }

  const [defTown] = await db.select().from(townsTable).where(eq(townsTable.id, defenderTownId)).limit(1);
  if (!defTown) return void res.status(400).json({ error: "Defender not found" });

  await initSlotsForTown(defenderTownId);
  const defSlots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, defenderTownId));
  const defArmyRows = await db.select().from(armyTable).where(eq(armyTable.townId, defenderTownId)).limit(1);
  const defOnMission = defArmyRows[0] ?? { onMissionInfantry: 0, onMissionArchers: 0, onMissionCavalry: 0 };

  const defenderStrength = calculateTotalDefense(defSlots, defOnMission);
  const arrivesAt = new Date(Date.now() + RAID_MARCH_DURATION_MS);

  if (armyRows.length) {
    await db.update(armyTable).set({
      onMissionInfantry: onMission.onMissionInfantry + infantry,
      onMissionArchers: onMission.onMissionArchers + archers,
      onMissionCavalry: onMission.onMissionCavalry + cavalry,
      updatedAt: new Date(),
    }).where(eq(armyTable.townId, attackerTownId));
  } else {
    await db.insert(armyTable).values({
      townId: attackerTownId,
      onMissionInfantry: infantry,
      onMissionArchers: archers,
      onMissionCavalry: cavalry,
    });
  }

  const [raid] = await db.insert(raidsTable).values({
    attackerTownId,
    defenderTownId,
    status: "marching",
    result: null,
    attackerInfantry: infantry,
    attackerArchers: archers,
    attackerCavalry: cavalry,
    attackerCatapults: 0,
    defenderStrength,
    arrivesAt,
  }).returning();

  const [attackerTown] = await db.select().from(townsTable).where(eq(townsTable.id, attackerTownId)).limit(1);

  await db.insert(activitiesTable).values({
    townId: attackerTownId,
    type: "raid_outgoing_march",
    title: "Army on the March",
    body: `Your forces are marching on ${defTown.name}. Battle in 2 hours.`,
    icon: "map-marker-path",
    iconColor: "#d4a520",
  });

  res.status(201).json({
    ...serializeRaid(raid, new Map([
      [attackerTownId, attackerTown?.name ?? "Unknown"],
      [defenderTownId, defTown.name],
    ])),
  });
});

export default router;
