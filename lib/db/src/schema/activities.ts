import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  townId: integer("town_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  icon: text("icon").notNull().default("information"),
  iconColor: text("icon_color").notNull().default("#d4a520"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Activity = typeof activitiesTable.$inferSelect;
