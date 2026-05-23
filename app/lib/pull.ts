import { eq, and } from "drizzle-orm";
import { db } from "../../db/index.js";
import { userCards } from "../../db/schema/user-cards.js";
import { CARD_BY_ID, type CardDefinition } from "./cards.js";
import { rollRarity, rollRadiant, rollReversed } from "./rarity.js";
import { todayUTC } from "./utils.js";

export type PullResult =
  | {
      status: "already_pulled";
      card: CardDefinition;
      rarityScore: number;
      isRadiant: boolean;
      isReversed: boolean;
      pullId: number;
    }
  | {
      status: "success";
      card: CardDefinition;
      rarityScore: number;
      isRadiant: boolean;
      isReversed: boolean;
      pullId: number;
    };

export async function dailyPull(userId: string): Promise<PullResult> {
  const pullDate = todayUTC();

  const existing = await db
    .select()
    .from(userCards)
    .where(and(eq(userCards.userId, userId), eq(userCards.pullDate, pullDate)))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    return {
      status: "already_pulled",
      card: CARD_BY_ID[row.cardId],
      rarityScore: row.rarityScore,
      isRadiant: row.isRadiant,
      isReversed: row.isReversed,
      pullId: row.id,
    };
  }

  const cardId = Math.floor(Math.random() * 78);
  const rarityScore = rollRarity();
  const isRadiant = rollRadiant();
  const isReversed = rollReversed();

  const [inserted] = await db
    .insert(userCards)
    .values({ userId, cardId, rarityScore, isRadiant, isReversed, pullDate })
    .returning();

  return {
    status: "success",
    card: CARD_BY_ID[cardId],
    rarityScore,
    isRadiant,
    isReversed,
    pullId: inserted.id,
  };
}

export async function getUserCards(userId: string) {
  return db
    .select({
      id: userCards.id,
      cardId: userCards.cardId,
      rarityScore: userCards.rarityScore,
      isRadiant: userCards.isRadiant,
      isReversed: userCards.isReversed,
      pullDate: userCards.pullDate,
      pulledAt: userCards.pulledAt,
    })
    .from(userCards)
    .where(eq(userCards.userId, userId))
    .orderBy(userCards.pulledAt);
}

export async function getUserCardHistory(userId: string, cardId: number) {
  return db
    .select()
    .from(userCards)
    .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)))
    .orderBy(userCards.pulledAt);
}

export async function getPulledCardIds(userId: string): Promise<Set<number>> {
  const rows = await db
    .selectDistinct({ cardId: userCards.cardId })
    .from(userCards)
    .where(eq(userCards.userId, userId));
  return new Set(rows.map((r) => r.cardId));
}
