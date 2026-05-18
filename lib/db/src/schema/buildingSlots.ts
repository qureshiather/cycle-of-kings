import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const SLOT_TYPES = [
  "townHall",
  "farm", "mine", "quarry", "lumberMill",
  "barracks", "archeryRange", "stables",
  "market", "tavern", "house",
  "wall", "tower",
] as const;

/** Starts at level 1 when a town is created; cannot be demolished. */
export const CORE_SLOT_TYPES = ["townHall"] as const;

export type SlotType = typeof SLOT_TYPES[number];

export const buildingSlotsTable = pgTable("building_slots", {
  id: serial("id").primaryKey(),
  townId: integer("town_id").notNull(),
  slotType: text("slot_type").notNull(),
  level: integer("level").notNull().default(0),
  upgrading: boolean("upgrading").notNull().default(false),
  upgradeEndsAt: timestamp("upgrade_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBuildingSlotSchema = createInsertSchema(buildingSlotsTable).omit({ id: true, createdAt: true });
export type InsertBuildingSlot = z.infer<typeof insertBuildingSlotSchema>;
export type BuildingSlot = typeof buildingSlotsTable.$inferSelect;
