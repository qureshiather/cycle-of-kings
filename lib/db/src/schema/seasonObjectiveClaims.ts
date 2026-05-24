import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const seasonObjectiveClaimsTable = pgTable(
  "season_objective_claims",
  {
    id: serial("id").primaryKey(),
    townId: integer("town_id").notNull(),
    cycleNumber: integer("cycle_number").notNull(),
    seasonIndex: integer("season_index").notNull(),
    objectiveId: text("objective_id").notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("season_objective_claim_unique").on(
      t.townId,
      t.cycleNumber,
      t.seasonIndex,
      t.objectiveId,
    ),
  ],
);

export type SeasonObjectiveClaim = typeof seasonObjectiveClaimsTable.$inferSelect;
