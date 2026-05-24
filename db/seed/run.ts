import { eq, isNull } from "drizzle-orm";
import { CARDS } from "../../app/lib/cards.js";
import { db } from "../index.js";
import { cards } from "../schema/cards.js";
import { user } from "../schema/auth.js";

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

process.exit(0);
