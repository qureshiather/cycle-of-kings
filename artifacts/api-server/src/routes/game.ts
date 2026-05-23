import { Router } from "express";
import { getCurrentSeasonInfo, getSeasonModifiers, getSeasonName } from "../lib/gameEngine.js";
import {
  getActiveRealmEvent,
  getUpcomingRealmEvent,
  getRealmEventModifiers,
  getCycleEventSchedule,
} from "../lib/realmEvents.js";

const router = Router();

router.get("/game/state", (_req, res) => {
  const { season, cycleNumber, cycleStartedAt, nextWipeAt } = getCurrentSeasonInfo();
  const seasonModifiers = getSeasonModifiers(season);
  const active = getActiveRealmEvent();
  const realmEventModifiers = getRealmEventModifiers();
  const now = new Date();

  res.json({
    cycleNumber,
    season,
    seasonName: getSeasonName(season),
    cycleStartedAt,
    nextWipeAt,
    currentHour: now.getUTCHours(),
    realmEvent: active
      ? { id: active.id, title: active.title, flavor: active.flavor, startsAt: active.startsAt, endsAt: active.endsAt }
      : null,
    realmEventActive: active != null,
    realmEventModifiers,
    upcomingRealmEvent: getUpcomingRealmEvent(),
    cycleEventSchedule: getCycleEventSchedule(),
    seasonModifiers,
  });
});

export default router;
