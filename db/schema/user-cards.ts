import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";
import { cards } from "./cards.js";

export const userCards = pgTable(
  "user_cards",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id),
    rarityScore: integer("rarity_score").notNull(), // 1–5
    isRadiant: boolean("is_radiant").notNull().default(false),
    isReversed: boolean("is_reversed").notNull().default(false),
    pullDate: text("pull_date").notNull(), // "YYYY-MM-DD" in user's local timezone
    pullType: text("pull_type").notNull().default("daily"), // "daily" | "spread"
  },
  (t) => [
    uniqueIndex("user_cards_user_day_idx")
      .on(t.userId, t.pullDate)
      .where(sql`${t.pullType} = 'daily'`),
    index("user_cards_user_card_idx").on(t.userId, t.cardId),
  ]
);
