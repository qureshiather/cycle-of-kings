import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const armyTable = pgTable("army", {
  id: serial("id").primaryKey(),
  townId: integer("town_id").notNull().unique(),
  infantry: integer("infantry").notNull().default(0),
  archers: integer("archers").notNull().default(0),
  cavalry: integer("cavalry").notNull().default(0),
  trainingUnit: text("training_unit"),
  trainingCount: integer("training_count").notNull().default(0),
  trainingEndsAt: timestamp("training_ends_at", { withTimezone: true }),
  /** One-time backfill of recruited counts from building caps for pre-migration rows. */
  legacyBackfilled: boolean("legacy_backfilled").notNull().default(false),
  onMissionInfantry: integer("on_mission_infantry").notNull().default(0),
  onMissionArchers: integer("on_mission_archers").notNull().default(0),
  onMissionCavalry: integer("on_mission_cavalry").notNull().default(0),
  onMissionSpies: integer("on_mission_spies").notNull().default(0),
  onMissionShips: integer("on_mission_ships").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertArmySchema = createInsertSchema(armyTable).omit({ id: true, updatedAt: true });
export type InsertArmy = z.infer<typeof insertArmySchema>;
export type Army = typeof armyTable.$inferSelect;
