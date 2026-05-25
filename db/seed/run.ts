import { and, eq, inArray, isNull } from "drizzle-orm";
import { CARDS } from "../../app/lib/cards.js";
import { db } from "../index.js";
import { cards } from "../schema/cards.js";
import { user } from "../schema/auth.js";
import { userCards } from "../schema/user-cards.js";
import { initStreakFromHistory } from "../../app/lib/streak.js";

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
// initStreakFromHistory no-ops if a record already exists, so safe to run repeatedly.
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
    await initStreakFromHistory(userId, pulls.map((p) => p.pullDate));
  }

  if (usersWithPulls.length > 0) {
    console.log(`Streak backfill: processed ${usersWithPulls.length} user(s).`);
  }
} catch (e) {
  console.log("Skipping streak backfill:", e);
}

process.exit(0);
