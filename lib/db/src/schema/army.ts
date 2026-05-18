import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const armyTable = pgTable("army", {
  id: serial("id").primaryKey(),
  townId: integer("town_id").notNull().unique(),
  onMissionInfantry: integer("on_mission_infantry").notNull().default(0),
  onMissionArchers: integer("on_mission_archers").notNull().default(0),
  onMissionCavalry: integer("on_mission_cavalry").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertArmySchema = createInsertSchema(armyTable).omit({ id: true, updatedAt: true });
export type InsertArmy = z.infer<typeof insertArmySchema>;
export type Army = typeof armyTable.$inferSelect;
