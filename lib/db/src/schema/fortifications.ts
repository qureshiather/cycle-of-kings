import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fortificationsTable = pgTable("fortifications", {
  id: serial("id").primaryKey(),
  townId: integer("town_id").notNull(),
  row: integer("row").notNull(),
  col: integer("col").notNull(),
  type: text("type").notNull(),
  level: integer("level").notNull().default(1),
  borderBonus: boolean("border_bonus").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFortificationSchema = createInsertSchema(fortificationsTable).omit({ id: true, createdAt: true });
export type InsertFortification = z.infer<typeof insertFortificationSchema>;
export type Fortification = typeof fortificationsTable.$inferSelect;
