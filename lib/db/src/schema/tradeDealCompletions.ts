import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradeDealCompletionsTable = pgTable(
  "trade_deal_completions",
  {
    id: serial("id").primaryKey(),
    townId: integer("town_id").notNull(),
    dealId: text("deal_id").notNull(),
    hourSeed: integer("hour_seed").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("trade_deal_completions_town_deal_hour").on(t.townId, t.dealId, t.hourSeed)],
);

export const insertTradeDealCompletionSchema = createInsertSchema(tradeDealCompletionsTable).omit({
  id: true,
  completedAt: true,
});
export type InsertTradeDealCompletion = z.infer<typeof insertTradeDealCompletionSchema>;
export type TradeDealCompletion = typeof tradeDealCompletionsTable.$inferSelect;
