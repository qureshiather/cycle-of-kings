import { pgTable, serial, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  /** Supabase Auth user id (sub claim). Primary account identity. */
  authUserId: uuid("auth_user_id").unique(),
  /** Legacy device binding; null for Supabase-only accounts. */
  deviceId: text("device_id").unique(),
  name: text("name").notNull(),
  trophyPoints: integer("trophy_points").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true, createdAt: true, trophyPoints: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
