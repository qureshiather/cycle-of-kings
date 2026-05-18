import { Router } from "express";
import { db } from "@workspace/db";
import { tradeDealCompletionsTable, townsTable, activitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  generateTradeDeals,
  getCurrentHourSeed,
  getNextHourRefreshAt,
  type ResourceType,
} from "../lib/gameEngine.js";

const router = Router();

const RES_LABEL: Record<ResourceType, string> = {
  gold: "Gold",
  food: "Food",
  wood: "Wood",
  stone: "Stone",
};

function fmtRes(r: ResourceType, n: number): string {
  const suffix = r === "gold" ? "G" : r === "food" ? "F" : r === "wood" ? "W" : "St";
  return `${Math.floor(n)}${suffix}`;
}

router.get("/towns/:townId/trades", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const hourSeed = getCurrentHourSeed();
  const deals = generateTradeDeals(hourSeed, townId);

  const completions = await db
    .select()
    .from(tradeDealCompletionsTable)
    .where(and(eq(tradeDealCompletionsTable.townId, townId), eq(tradeDealCompletionsTable.hourSeed, hourSeed)));

  const completedIds = new Set(completions.map((c) => c.dealId));

  res.json({
    hourSeed,
    refreshesAt: getNextHourRefreshAt(),
    deals: deals.map((d) => ({ ...d, completed: completedIds.has(d.id) })),
  });
});

router.post("/towns/:townId/trades", async (req, res) => {
  const townId = parseInt(req.params["townId"] ?? "");
  const { dealId } = req.body as { dealId?: string };
  if (!dealId) return void res.status(400).json({ error: "dealId required" });

  const hourSeed = getCurrentHourSeed();
  const deals = generateTradeDeals(hourSeed, townId);
  const deal = deals.find((d) => d.id === dealId);
  if (!deal) return void res.status(400).json({ error: "Invalid trade deal" });

  const existing = await db
    .select()
    .from(tradeDealCompletionsTable)
    .where(
      and(
        eq(tradeDealCompletionsTable.townId, townId),
        eq(tradeDealCompletionsTable.dealId, dealId),
        eq(tradeDealCompletionsTable.hourSeed, hourSeed),
      ),
    )
    .limit(1);
  if (existing.length) return void res.status(400).json({ error: "Trade already completed" });

  const [town] = await db.select().from(townsTable).where(eq(townsTable.id, townId)).limit(1);
  if (!town) return void res.status(404).json({ error: "Town not found" });

  const balance = town[deal.payResource];
  if (balance < deal.payAmount) {
    return void res.status(400).json({
      error: `Not enough ${RES_LABEL[deal.payResource]} (need ${deal.payAmount}, have ${Math.floor(balance)})`,
    });
  }

  const updated = {
    gold: town.gold,
    food: town.food,
    wood: town.wood,
    stone: town.stone,
  };
  updated[deal.payResource] -= deal.payAmount;
  updated[deal.receiveResource] += deal.receiveAmount;

  await db.update(townsTable).set(updated).where(eq(townsTable.id, townId));
  await db.insert(tradeDealCompletionsTable).values({ townId, dealId, hourSeed });

  await db.insert(activitiesTable).values({
    townId,
    type: "trade_complete",
    title: "Trade Complete",
    body: `${deal.title}: traded ${fmtRes(deal.payResource, deal.payAmount)} for ${fmtRes(deal.receiveResource, deal.receiveAmount)}`,
    icon: "swap-horizontal",
    iconColor: "#d4a520",
  });

  res.json({
    deal: { ...deal, completed: true },
    ...updated,
  });
});

export default router;
