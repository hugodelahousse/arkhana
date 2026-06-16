import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { SpreadPositionKey } from "../../app/lib/spreads.js";
import { user } from "./auth.js";
import { userCards } from "./user-cards.js";

export const spreads = pgTable(
  "spreads",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    spreadType: text("spread_type").notNull(), // registry key, e.g. "sunday-weekly"
    spreadDate: text("spread_date").notNull(), // "YYYY-MM-DD" UTC
    pulledAt: timestamp("pulled_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("spreads_user_type_date_idx").on(t.userId, t.spreadType, t.spreadDate),
    index("spreads_user_type_idx").on(t.userId, t.spreadType),
  ]
);

export const spreadCards = pgTable(
  "spread_cards",
  {
    id: serial("id").primaryKey(),
    spreadId: integer("spread_id")
      .notNull()
      .references(() => spreads.id, { onDelete: "cascade" }),
    userCardId: integer("user_card_id")
      .notNull()
      .references(() => userCards.id),
    position: integer("position").notNull(), // 0-indexed, matches registry definition
    positionKey: text("position_key").notNull().$type<SpreadPositionKey>(),
  },
  (t) => [
    uniqueIndex("spread_cards_spread_position_idx").on(t.spreadId, t.position),
    uniqueIndex("spread_cards_user_card_idx").on(t.userCardId),
  ]
);
