import { Router } from "express";
import { db } from "@workspace/db";
import { armyTable, townsTable, gridCellsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { calculateArmyComposition, calculateArmyCapacity } from "../lib/gameEngine.js";

const router = Router();

router.get("/towns/:townId/army", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const cells = await db.select().from(gridCellsTable).where(eq(gridCellsTable.townId, townId));
  const composition = calculateArmyComposition(cells);
  const capacity = calculateArmyCapacity(cells);

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
