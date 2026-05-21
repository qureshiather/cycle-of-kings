import { pgTable, serial, text, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const townsTable = pgTable("towns", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  name: text("name").notNull(),
  gold: real("gold").notNull().default(200),
  food: real("food").notNull().default(200),
  wood: real("wood").notNull().default(150),
  stone: real("stone").notNull().default(100),
  defenseRating: real("defense_rating").notNull().default(10),
  peacefulMode: boolean("peaceful_mode").notNull().default(false),
  /** Cycle number when peaceful mode was permanently enabled (null = never opted in). */
  peacefulOptedInCycle: integer("peaceful_opted_in_cycle"),
  population: real("population").notNull().default(10),
  lastTickAt: timestamp("last_tick_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTownSchema = createInsertSchema(townsTable).omit({ id: true, createdAt: true });
export type InsertTown = z.infer<typeof insertTownSchema>;
export type Town = typeof townsTable.$inferSelect;
