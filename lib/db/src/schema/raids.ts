import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const raidsTable = pgTable("raids", {
  id: serial("id").primaryKey(),
  attackerTownId: integer("attacker_town_id").notNull(),
  defenderTownId: integer("defender_town_id").notNull(),
  result: text("result").notNull(),
  attackerInfantry: integer("attacker_infantry").notNull().default(0),
  attackerArchers: integer("attacker_archers").notNull().default(0),
  attackerCavalry: integer("attacker_cavalry").notNull().default(0),
  attackerCatapults: integer("attacker_catapults").notNull().default(0),
  defenderStrength: real("defender_strength").notNull(),
  lootGold: real("loot_gold").notNull().default(0),
  lootFood: real("loot_food").notNull().default(0),
  lootWood: real("loot_wood").notNull().default(0),
  lootStone: real("loot_stone").notNull().default(0),
  attackerCasualties: integer("attacker_casualties").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRaidSchema = createInsertSchema(raidsTable).omit({ id: true, createdAt: true });
export type InsertRaid = z.infer<typeof insertRaidSchema>;
export type Raid = typeof raidsTable.$inferSelect;
