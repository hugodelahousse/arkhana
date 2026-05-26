import { and, eq, inArray, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { CARDS } from "../../app/lib/cards.js";
import { cards } from "../schema/cards.js";
import { user } from "../schema/auth.js";
import { userCards } from "../schema/user-cards.js";
import { streaks } from "../schema/streaks.js";
import * as schema from "../schema/index.js";
import { computeStreakFromSortedDates } from "../../app/lib/streak-compute.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

await db
  .insert(cards)
  .values(CARDS.map((c) => ({ id: c.id, name: c.name })))
  .onConflictDoNothing();

console.log(`Seeded ${CARDS.length} cards.`);

// Backfill usernames for users that don't have one yet
try {
  const usersWithoutUsername = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(isNull(user.username));

  for (const u of usersWithoutUsername) {
    const base = u.email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 28) || "user";

    let candidate = base;
    let suffix = 1;
    while (true) {
      const existing = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.username, candidate))
        .limit(1);
      if (existing.length === 0) break;
      suffix++;
      candidate = `${base.slice(0, 25)}-${suffix}`;
    }

    await db
      .update(user)
      .set({ username: candidate, displayUsername: candidate })
      .where(eq(user.id, u.id));
  }

  if (usersWithoutUsername.length > 0) {
    console.log(`Assigned usernames to ${usersWithoutUsername.length} user(s).`);
  }
} catch {
  console.log("Skipping username backfill (column may not exist yet).");
}

// Backfill streak records for users with pull history but no streak row.
try {
  const usersWithPulls = await db
    .selectDistinct({ userId: userCards.userId })
    .from(userCards)
    .where(eq(userCards.pullType, "daily"));

  for (const { userId } of usersWithPulls) {
    const pulls = await db
      .select({ pullDate: userCards.pullDate })
      .from(userCards)
      .where(and(eq(userCards.userId, userId), inArray(userCards.pullType, ["daily", "spread"])));

    const pullDates = pulls.map((p) => p.pullDate);
    if (pullDates.length === 0) continue;

    const sorted = [...new Set(pullDates)].sort();
    const computed = computeStreakFromSortedDates(sorted);

    const existing = await db
      .select({ id: streaks.id })
      .from(streaks)
      .where(eq(streaks.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(streaks)
        .set({
          currentStreak: computed.currentStreak,
          longestStreak: computed.longestStreak,
          lastPullDate: computed.lastPullDate,
          cycleStartDate: computed.cycleStartDate,
          graceNightsUsed: computed.graceNightsUsed,
        })
        .where(eq(streaks.userId, userId));
    } else {
      await db.insert(streaks).values({
        userId,
        currentStreak: computed.currentStreak,
        longestStreak: computed.longestStreak,
        lastPullDate: computed.lastPullDate,
        cycleStartDate: computed.cycleStartDate,
        graceNightsUsed: computed.graceNightsUsed,
      });
    }
  }

  if (usersWithPulls.length > 0) {
    console.log(`Streak backfill: processed ${usersWithPulls.length} user(s).`);
  }
} catch (e) {
  console.log("Skipping streak backfill:", e);
}

await client.end();
process.exit(0);
