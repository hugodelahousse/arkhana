import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { userCards } from "../db/schema/user-cards.js";
import { spreads, spreadCards } from "../db/schema/spreads.js";

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
    } else {
      // Conflict: delete the anonymous spread (cascade deletes its spreadCards)
      await db.delete(spreads).where(eq(spreads.id, anonSpread.id));
    }
  }

  // Migrate daily pulls
  const anonPulls = await db
    .select()
    .from(userCards)
    .where(eq(userCards.userId, anonymousUserId));

  for (const anonPull of anonPulls) {
    const [conflict] = await db
      .select()
      .from(userCards)
      .where(
        and(
          eq(userCards.userId, newUserId),
          eq(userCards.pullDate, anonPull.pullDate)
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
}
