import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import playersRouter from "./players.js";
import townsRouter from "./towns.js";
import armyRouter from "./army.js";
import missionsRouter from "./missions.js";
import raidsRouter from "./raids.js";
import tradeRouter from "./trade.js";
import leaderboardRouter from "./leaderboard.js";
import gameRouter from "./game.js";
import activitiesRouter from "./activities.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(playersRouter);
router.use(townsRouter);
router.use(armyRouter);
router.use(missionsRouter);
router.use(raidsRouter);
router.use(tradeRouter);
router.use(leaderboardRouter);
router.use(gameRouter);
router.use(activitiesRouter);

export default router;
