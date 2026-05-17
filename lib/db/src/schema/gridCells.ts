import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gridCellsTable = pgTable("grid_cells", {
  id: serial("id").primaryKey(),
  townId: integer("town_id").notNull(),
  row: integer("row").notNull(),
  col: integer("col").notNull(),
  buildingType: text("building_type").notNull().default("empty"),
  level: integer("level").notNull().default(1),
  upgrading: boolean("upgrading").notNull().default(false),
  upgradeEndsAt: timestamp("upgrade_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGridCellSchema = createInsertSchema(gridCellsTable).omit({ id: true, createdAt: true });
export type InsertGridCell = z.infer<typeof insertGridCellSchema>;
export type GridCell = typeof gridCellsTable.$inferSelect;
