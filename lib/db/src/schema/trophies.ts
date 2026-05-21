import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trophiesTable = pgTable(
  "trophies",
  {
    id: serial("id").primaryKey(),
    playerId: integer("player_id").notNull(),
    type: text("type").notNull(),
    cycleNumber: integer("cycle_number").notNull(),
    description: text("description").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("trophies_player_type_cycle_unique").on(t.playerId, t.type, t.cycleNumber)],
);

export const insertTrophySchema = createInsertSchema(trophiesTable).omit({ id: true, earnedAt: true });
export type InsertTrophy = z.infer<typeof insertTrophySchema>;
export type Trophy = typeof trophiesTable.$inferSelect;
