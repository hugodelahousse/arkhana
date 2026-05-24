import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { userCards } from "../db/schema/user-cards.js";

export async function migrateAnonymousPulls(
  anonymousUserId: string,
  newUserId: string
): Promise<void> {
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
      // Anonymous pull happened first — replace the new user's pull with it
      await db.delete(userCards).where(eq(userCards.id, conflict.id));
      await db
        .update(userCards)
        .set({ userId: newUserId })
        .where(eq(userCards.id, anonPull.id));
    } else {
      // New user's pull happened first — discard the anonymous pull
      await db.delete(userCards).where(eq(userCards.id, anonPull.id));
    }
  }
}
