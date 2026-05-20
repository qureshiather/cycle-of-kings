import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const missionsTable = pgTable("missions", {
  id: serial("id").primaryKey(),
  townId: integer("town_id").notNull(),
  missionCardId: text("mission_card_id").notNull(),
  missionTitle: text("mission_title").notNull(),
  missionType: text("mission_type").notNull(),
  missionDifficulty: text("mission_difficulty").notNull().default("medium"),
  infantry: integer("infantry").notNull().default(0),
  archers: integer("archers").notNull().default(0),
  cavalry: integer("cavalry").notNull().default(0),
  mercenaries: integer("mercenaries").notNull().default(0),
  enemyInfantry: integer("enemy_infantry").notNull().default(0),
  enemyArchers: integer("enemy_archers").notNull().default(0),
  enemyCavalry: integer("enemy_cavalry").notNull().default(0),
  successRate: real("success_rate").notNull(),
  status: text("status").notNull().default("active"),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }).notNull().defaultNow(),
  returnsAt: timestamp("returns_at", { withTimezone: true }).notNull(),
  result: text("result"),
  lootGold: real("loot_gold"),
  lootFood: real("loot_food"),
  lootWood: real("loot_wood"),
  lootStone: real("loot_stone"),
  casualties: integer("casualties"),
});

export const insertMissionSchema = createInsertSchema(missionsTable).omit({ id: true });
export type InsertMission = z.infer<typeof insertMissionSchema>;
export type Mission = typeof missionsTable.$inferSelect;
