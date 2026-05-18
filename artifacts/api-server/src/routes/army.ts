import { Router } from "express";
import { db } from "@workspace/db";
import { armyTable, buildingSlotsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { calculateArmyComposition, calculateArmyCapacity } from "../lib/gameEngine.js";
import { initSlotsForTown } from "./slots.js";

const router = Router();

router.get("/towns/:townId/army", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  await initSlotsForTown(townId);
  const slots = await db.select().from(buildingSlotsTable).where(eq(buildingSlotsTable.townId, townId));
  const composition = calculateArmyComposition(slots);
  const capacity = calculateArmyCapacity(slots);

  const rows = await db.select().from(armyTable).where(eq(armyTable.townId, townId)).limit(1);
  const onMission = rows[0] ?? { onMissionInfantry: 0, onMissionArchers: 0, onMissionCavalry: 0 };

  res.json({
    townId,
    infantry:  composition.infantry,
    archers:   composition.archers,
    cavalry:   composition.cavalry,
    onMissionInfantry: onMission.onMissionInfantry,
    onMissionArchers:  onMission.onMissionArchers,
    onMissionCavalry:  onMission.onMissionCavalry,
    availableInfantry: Math.max(0, composition.infantry - onMission.onMissionInfantry),
    availableArchers:  Math.max(0, composition.archers  - onMission.onMissionArchers),
    availableCavalry:  Math.max(0, composition.cavalry  - onMission.onMissionCavalry),
    infantryAttackMult: composition.infantryAttackMult,
    archerAttackMult:   composition.archerAttackMult,
    cavalryAttackMult:  composition.cavalryAttackMult,
    totalTroops: composition.totalTroops,
    totalPower:  composition.totalPower,
    capacity,
  });
});

export default router;
