import { and, eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "../../db/index.js";
import { spreads, spreadCards } from "../../db/schema/spreads.js";
import { userCards } from "../../db/schema/user-cards.js";
import { CARD_BY_ID, type CardDefinition, type Rarity } from "./cards.js";
import { rollRarity, rollRadiant, rollReversed } from "./rarity.js";
import { getSpreadType } from "./spreads.js";
import { updateStreak } from "./streak.js";

export type SpreadCardResult = {
  position: number;
  positionKey: string;
  userCardId: number;
  cardId: number;
  card: CardDefinition;
  rarityScore: Rarity;
  isRadiant: boolean;
  isReversed: boolean;
};

export type SpreadPullResult =
  | {
      status: "success" | "already_pulled";
      spreadId: number;
      cards: SpreadCardResult[];
    }
  | { status: "unavailable"; nextAvailable: DateTime };

export async function drawSpread(
  userId: string,
  spreadTypeId: string,
  now: DateTime
): Promise<SpreadPullResult> {
  const spreadDef = getSpreadType(spreadTypeId);
  if (!spreadDef || !spreadDef.isAvailable(now)) {
    return {
      status: "unavailable",
      nextAvailable: spreadDef
        ? spreadDef.nextAvailable(now)
        : now.setZone("utc").plus({ weeks: 1 }).startOf("day"),
    };
  }

  const spreadDate = now.setZone("utc").toISODate()!;

  const existing = await getTodaySpread(userId, spreadTypeId, spreadDate);
  if (existing) {
    const [spreadRow] = await db
      .select({ id: spreads.id })
      .from(spreads)
      .where(
        and(
          eq(spreads.userId, userId),
          eq(spreads.spreadType, spreadTypeId),
          eq(spreads.spreadDate, spreadDate)
        )
      )
      .limit(1);
    return { status: "already_pulled", spreadId: spreadRow.id, cards: existing };
  }

  // Roll all cards upfront — each card must be unique within the spread
  const usedCardIds = new Set<number>();
  const rolls = spreadDef.positions.map((pos) => {
    let cardId: number;
    do { cardId = Math.floor(Math.random() * 78); } while (usedCardIds.has(cardId));
    usedCardIds.add(cardId);
    return {
      position: pos.index,
      positionKey: pos.label.toLowerCase(),
      cardId,
      rarityScore: rollRarity(),
      isRadiant: rollRadiant(),
      isReversed: rollReversed("spread"),
    };
  });

  const result = await db.transaction(async (tx) => {
    const [spreadRow] = await tx
      .insert(spreads)
      .values({ userId, spreadType: spreadTypeId, spreadDate })
      .onConflictDoNothing()
      .returning();

    if (!spreadRow) {
      // Race: another request won, fall through to re-fetch below
      return null;
    }

    const insertedCards = await tx
      .insert(userCards)
      .values(
        rolls.map((r) => ({
          userId,
          cardId: r.cardId,
          rarityScore: r.rarityScore,
          isRadiant: r.isRadiant,
          isReversed: r.isReversed,
          pullDate: spreadDate,
          pullType: "spread",
        }))
      )
      .returning();

    await tx.insert(spreadCards).values(
      insertedCards.map((uc, i) => ({
        spreadId: spreadRow.id,
        userCardId: uc.id,
        position: rolls[i].position,
        positionKey: rolls[i].positionKey,
      }))
    );

    return { spreadId: spreadRow.id, insertedCards, rolls };
  });

  if (!result) {
    // Race lost — re-fetch the winner's spread
    const fetched = await getTodaySpread(userId, spreadTypeId, spreadDate);
    const [spreadRow] = await db
      .select({ id: spreads.id })
      .from(spreads)
      .where(
        and(
          eq(spreads.userId, userId),
          eq(spreads.spreadType, spreadTypeId),
          eq(spreads.spreadDate, spreadDate)
        )
      )
      .limit(1);
    return {
      status: "already_pulled",
      spreadId: spreadRow.id,
      cards: fetched ?? [],
    };
  }

  const cards: SpreadCardResult[] = result.insertedCards.map((uc, i) => ({
    position: rolls[i].position,
    positionKey: rolls[i].positionKey,
    userCardId: uc.id,
    cardId: uc.cardId,
    card: CARD_BY_ID[uc.cardId],
    rarityScore: uc.rarityScore as Rarity,
    isRadiant: uc.isRadiant,
    isReversed: uc.isReversed,
  }));

  await updateStreak(userId, spreadDate);

  return { status: "success", spreadId: result.spreadId, cards };
}

export async function getSpreadHistory(userId: string): Promise<
  Array<{
    spreadId: number;
    spreadType: string;
    spreadDate: string;
    cards: SpreadCardResult[];
  }>
> {
  const rows = await db
    .select({
      spreadId: spreads.id,
      spreadType: spreads.spreadType,
      spreadDate: spreads.spreadDate,
      position: spreadCards.position,
      positionKey: spreadCards.positionKey,
      userCardId: userCards.id,
      cardId: userCards.cardId,
      rarityScore: userCards.rarityScore,
      isRadiant: userCards.isRadiant,
      isReversed: userCards.isReversed,
    })
    .from(spreads)
    .innerJoin(spreadCards, eq(spreadCards.spreadId, spreads.id))
    .innerJoin(userCards, eq(userCards.id, spreadCards.userCardId))
    .where(eq(spreads.userId, userId))
    .orderBy(spreads.spreadDate, spreadCards.position);

  const grouped = new Map<
    number,
    { spreadId: number; spreadType: string; spreadDate: string; cards: SpreadCardResult[] }
  >();
  for (const row of rows) {
    if (!grouped.has(row.spreadId)) {
      grouped.set(row.spreadId, {
        spreadId: row.spreadId,
        spreadType: row.spreadType,
        spreadDate: row.spreadDate,
        cards: [],
      });
    }
    grouped.get(row.spreadId)!.cards.push({
      position: row.position,
      positionKey: row.positionKey,
      userCardId: row.userCardId,
      cardId: row.cardId,
      card: CARD_BY_ID[row.cardId],
      rarityScore: row.rarityScore as Rarity,
      isRadiant: row.isRadiant,
      isReversed: row.isReversed,
    });
  }

  return [...grouped.values()].reverse();
}

export async function getSpreadById(spreadId: number): Promise<{
  userId: string;
  spreadType: string;
  spreadDate: string;
  cards: SpreadCardResult[];
} | null> {
  const rows = await db
    .select({
      userId: spreads.userId,
      spreadType: spreads.spreadType,
      spreadDate: spreads.spreadDate,
      position: spreadCards.position,
      positionKey: spreadCards.positionKey,
      userCardId: userCards.id,
      cardId: userCards.cardId,
      rarityScore: userCards.rarityScore,
      isRadiant: userCards.isRadiant,
      isReversed: userCards.isReversed,
    })
    .from(spreads)
    .innerJoin(spreadCards, eq(spreadCards.spreadId, spreads.id))
    .innerJoin(userCards, eq(userCards.id, spreadCards.userCardId))
    .where(eq(spreads.id, spreadId))
    .orderBy(spreadCards.position);

  if (rows.length === 0) return null;

  return {
    userId: rows[0].userId,
    spreadType: rows[0].spreadType,
    spreadDate: rows[0].spreadDate,
    cards: rows.map((row) => ({
      ...row,
      rarityScore: row.rarityScore as Rarity,
      card: CARD_BY_ID[row.cardId],
    })),
  };
}

export async function getSpreadId(
  userId: string,
  spreadTypeId: string,
  spreadDate: string
): Promise<number | null> {
  const [row] = await db
    .select({ id: spreads.id })
    .from(spreads)
    .where(
      and(
        eq(spreads.userId, userId),
        eq(spreads.spreadType, spreadTypeId),
        eq(spreads.spreadDate, spreadDate)
      )
    )
    .limit(1);
  return row?.id ?? null;
}

export async function getTodaySpread(
  userId: string,
  spreadTypeId: string,
  spreadDate: string
): Promise<SpreadCardResult[] | null> {
  const rows = await db
    .select({
      position: spreadCards.position,
      positionKey: spreadCards.positionKey,
      userCardId: userCards.id,
      cardId: userCards.cardId,
      rarityScore: userCards.rarityScore,
      isRadiant: userCards.isRadiant,
      isReversed: userCards.isReversed,
    })
    .from(spreads)
    .innerJoin(spreadCards, eq(spreadCards.spreadId, spreads.id))
    .innerJoin(userCards, eq(userCards.id, spreadCards.userCardId))
    .where(
      and(
        eq(spreads.userId, userId),
        eq(spreads.spreadType, spreadTypeId),
        eq(spreads.spreadDate, spreadDate)
      )
    )
    .orderBy(spreadCards.position);

  if (rows.length === 0) return null;

  return rows.map((row) => ({
    ...row,
    rarityScore: row.rarityScore as Rarity,
    card: CARD_BY_ID[row.cardId],
  }));
}
