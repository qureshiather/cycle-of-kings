import { Router } from "express";
import { getCurrentSeasonInfo, getSeasonModifiers, getSeasonName, getCurrentWeatherEvent } from "../lib/gameEngine.js";

const router = Router();

router.get("/game/state", (_req, res) => {
  const { season, cycleNumber, cycleStartedAt, nextWipeAt } = getCurrentSeasonInfo();
  const seasonModifiers = getSeasonModifiers(season);
  const { event, active } = getCurrentWeatherEvent();
  const now = new Date();

  res.json({
    cycleNumber,
    season,
    seasonName: getSeasonName(season),
    cycleStartedAt,
    nextWipeAt,
    currentHour: now.getUTCHours(),
    weatherEvent: event,
    weatherActive: active,
    seasonModifiers,
  });
});

export default router;
