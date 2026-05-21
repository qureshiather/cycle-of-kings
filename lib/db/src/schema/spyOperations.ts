import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const spyOperationsTable = pgTable("spy_operations", {
  id: serial("id").primaryKey(),
  townId: integer("town_id").notNull(),
  cardId: text("card_id").notNull(),
  title: text("title").notNull(),
  operationType: text("operation_type").notNull(),
  difficulty: text("difficulty").notNull().default("medium"),
  spiesDeployed: integer("spies_deployed").notNull(),
  successRate: real("success_rate").notNull(),
  status: text("status").notNull().default("active"),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }).notNull().defaultNow(),
  returnsAt: timestamp("returns_at", { withTimezone: true }).notNull(),
  result: text("result"),
  lootGold: real("loot_gold"),
  lootFood: real("loot_food"),
  lootWood: real("loot_wood"),
  lootStone: real("loot_stone"),
  spiesLost: integer("spies_lost"),
});

export const insertSpyOperationSchema = createInsertSchema(spyOperationsTable).omit({ id: true });
export type InsertSpyOperation = z.infer<typeof insertSpyOperationSchema>;
export type SpyOperation = typeof spyOperationsTable.$inferSelect;
