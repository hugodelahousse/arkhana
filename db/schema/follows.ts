import {
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

// Asymmetric follow graph. `followerId` follows `followingId`.
// Data is public; following = subscribing to someone's pulls in your daily circle feed.
export const follows = pgTable(
  "follows",
  {
    id: serial("id").primaryKey(),
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("follows_follower_following_idx").on(t.followerId, t.followingId),
    index("follows_following_idx").on(t.followingId),
    index("follows_follower_idx").on(t.followerId),
  ]
);
