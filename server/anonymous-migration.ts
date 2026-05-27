import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { userCards } from "../db/schema/user-cards.js";
import { spreads, spreadCards } from "../db/schema/spreads.js";
import { initStreakFromHistory } from "../app/lib/streak.js";

export async function migrateAnonymousPulls(
  anonymousUserId: string,
  newUserId: string
): Promise<void> {
  // Migrate spreads first (before userCards, since spreadCards references userCards)
  const anonSpreads = await db
    .select()
    .from(spreads)
    .where(eq(spreads.userId, anonymousUserId));

  for (const anonSpread of anonSpreads) {
    const [conflict] = await db
      .select()
      .from(spreads)
      .where(
        and(
          eq(spreads.userId, newUserId),
          eq(spreads.spreadType, anonSpread.spreadType),
          eq(spreads.spreadDate, anonSpread.spreadDate)
        )
      )
      .limit(1);

    if (!conflict) {
      await db
        .update(spreads)
        .set({ userId: newUserId })
        .where(eq(spreads.id, anonSpread.id));

      // Also migrate the associated userCards rows so they belong to the new user.
      // Without this, getAllPulls/getUniqueCardCount would miss these cards, and
      // deleting the anonymous user would fail the FK constraint on spreadCards.userCardId.
      const linkedCards = await db
        .select({ userCardId: spreadCards.userCardId })
        .from(spreadCards)
        .where(eq(spreadCards.spreadId, anonSpread.id));
      if (linkedCards.length > 0) {
        await db
          .update(userCards)
          .set({ userId: newUserId })
          .where(inArray(userCards.id, linkedCards.map((r) => r.userCardId)));
      }
    } else {
      // Conflict: delete the anonymous spread (cascade deletes its spreadCards)
      await db.delete(spreads).where(eq(spreads.id, anonSpread.id));
    }
  }

  // Migrate daily pulls (spread userCards are already handled above with their spreads)
  const anonPulls = await db
    .select()
    .from(userCards)
    .where(and(eq(userCards.userId, anonymousUserId), eq(userCards.pullType, "daily")));

  for (const anonPull of anonPulls) {
    const [conflict] = await db
      .select()
      .from(userCards)
      .where(
        and(
          eq(userCards.userId, newUserId),
          eq(userCards.pullDate, anonPull.pullDate),
          eq(userCards.pullType, "daily")
        )
      )
      .limit(1);

    if (!conflict) {
      await db
        .update(userCards)
        .set({ userId: newUserId })
        .where(eq(userCards.id, anonPull.id));
    } else if (anonPull.pulledAt < conflict.pulledAt) {
      await db.delete(userCards).where(eq(userCards.id, conflict.id));
      await db
        .update(userCards)
        .set({ userId: newUserId })
        .where(eq(userCards.id, anonPull.id));
    } else {
      await db.delete(userCards).where(eq(userCards.id, anonPull.id));
    }
  }

  // Seed the streak record for the new user from their full daily pull history.
  const allPulls = await db
    .select({ pullDate: userCards.pullDate })
    .from(userCards)
    .where(and(eq(userCards.userId, newUserId), inArray(userCards.pullType, ["daily", "spread"])));

  await initStreakFromHistory(newUserId, allPulls.map((r) => r.pullDate), { recompute: true });
}
