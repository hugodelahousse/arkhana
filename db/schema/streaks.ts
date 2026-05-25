import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const streaks = pgTable("streaks", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastPullDate: text("last_pull_date"), // "YYYY-MM-DD"
  cycleStartDate: text("cycle_start_date"), // "YYYY-MM-DD" — start of current 28-day cycle
  graceNightsUsed: integer("grace_nights_used").notNull().default(0),
});
