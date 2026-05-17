import { pgTable, serial, integer, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradeRoutesTable = pgTable("trade_routes", {
  id: serial("id").primaryKey(),
  fromTownId: integer("from_town_id").notNull(),
  toTownId: integer("to_town_id").notNull(),
  resourceType: text("resource_type").notNull(),
  amountPerHour: real("amount_per_hour").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTradeRouteSchema = createInsertSchema(tradeRoutesTable).omit({ id: true, createdAt: true });
export type InsertTradeRoute = z.infer<typeof insertTradeRouteSchema>;
export type TradeRoute = typeof tradeRoutesTable.$inferSelect;
