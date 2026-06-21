import { eq, and, desc, ne, sql, inArray, unionAll } from "drizzle-orm";
import { db } from "../../db/index.js";
import { userCards } from "../../db/schema/user-cards.js";
import { spreads } from "../../db/schema/spreads.js";
import { CARD_BY_ID, type CardDefinition, type Rarity } from "./cards.js";
import { rollRarity, rollRadiant, rollReversed } from "./rarity.js";
import { todayForUser } from "./utils.js";
import { updateStreak } from "./streak.js";
import type { Milestone } from "./streak.js";

export type PullResult =
  | {
      status: "already_pulled";
      card: CardDefinition;
      rarityScore: Rarity;
      isRadiant: boolean;
      isReversed: boolean;
      pullId: number;
      previousPullDate: string | null;
    }
  | {
      status: "success";
      card: CardDefinition;
      rarityScore: Rarity;
      isRadiant: boolean;
      isReversed: boolean;
      pullId: number;
      previousPullDate: string | null;
      streakDay: number;
      milestone: Milestone | null;
    };

export async function dailyPull(userId: string, timezone: string | null = null): Promise<PullResult> {
  const pullDate = todayForUser(timezone);

  const existing = await db
    .select()
    .from(userCards)
    .where(and(eq(userCards.userId, userId), eq(userCards.pullDate, pullDate), eq(userCards.pullType, "daily")))
    .limit(1);

  if (existing.length > 0) {
    const row = existing[0];
    const previousPullDate = await getPreviousPullDate(userId, row.cardId, pullDate);
    return {
      status: "already_pulled",
      card: CARD_BY_ID[row.cardId],
      rarityScore: row.rarityScore as Rarity,
      isRadiant: row.isRadiant,
      isReversed: row.isReversed,
      pullId: row.id,
      previousPullDate,
    };
  }

  const cardId = Math.floor(Math.random() * 78);
  const rarityScore = rollRarity();
  const isRadiant = rollRadiant();
  const isReversed = rollReversed("daily");

  // Check for previous draws of this card before inserting
  const previousPullDate = await getPreviousPullDate(userId, cardId, pullDate);

  const [inserted] = await db
    .insert(userCards)
    .values({ userId, cardId, rarityScore, isRadiant, isReversed, pullDate })
    .onConflictDoNothing()
    .returning();

  if (!inserted) {
    const [row] = await db
      .select()
      .from(userCards)
      .where(and(eq(userCards.userId, userId), eq(userCards.pullDate, pullDate), eq(userCards.pullType, "daily")))
      .limit(1);
    const prevDate = await getPreviousPullDate(userId, row.cardId, pullDate);
    return {
      status: "already_pulled",
      card: CARD_BY_ID[row.cardId],
      rarityScore: row.rarityScore as Rarity,
      isRadiant: row.isRadiant,
      isReversed: row.isReversed,
      pullId: row.id,
      previousPullDate: prevDate,
    };
  }

  const { newStreak, milestone } = await updateStreak(userId, pullDate);

  return {
    status: "success",
    card: CARD_BY_ID[cardId],
    rarityScore,
    isRadiant,
    isReversed,
    pullId: inserted.id,
    previousPullDate,
    streakDay: newStreak,
    milestone,
  };
}

async function getPreviousPullDate(
  userId: string,
  cardId: number,
  excludeDate: string
): Promise<string | null> {
  const [row] = await db
    .select({ pullDate: userCards.pullDate })
    .from(userCards)
    .where(
      and(
        eq(userCards.userId, userId),
        eq(userCards.cardId, cardId),
        eq(userCards.pullType, "daily"),
        ne(userCards.pullDate, excludeDate)
      )
    )
    .orderBy(desc(userCards.pullDate))
    .limit(1);
  return row?.pullDate ?? null;
}

const pullFields = {
  id: userCards.id,
  cardId: userCards.cardId,
  rarityScore: sql<Rarity>`${userCards.rarityScore}`,
  isRadiant: userCards.isRadiant,
  isReversed: userCards.isReversed,
  pullDate: userCards.pullDate,
};

export async function getTodayPull(userId: string, pullDate: string) {
  const [row] = await db
    .select(pullFields)
    .from(userCards)
    .where(and(eq(userCards.userId, userId), eq(userCards.pullDate, pullDate), eq(userCards.pullType, "daily")))
    .limit(1);
  return row ?? null;
}

export async function hasPulledToday(userId: string, pullDate: string): Promise<boolean> {
  const [row] = await unionAll(
    db.select({ _: sql<1>`1` }).from(userCards)
      .where(and(eq(userCards.userId, userId), eq(userCards.pullDate, pullDate), eq(userCards.pullType, "daily")))
      .limit(1),
    db.select({ _: sql<1>`1` }).from(spreads)
      .where(and(eq(spreads.userId, userId), eq(spreads.spreadDate, pullDate)))
      .limit(1)
  ).limit(1);
  return !!row;
}

export async function getRecentPulls(userId: string, limit = 5) {
  return db
    .select(pullFields)
    .from(userCards)
    .where(and(eq(userCards.userId, userId), eq(userCards.pullType, "daily")))
    .orderBy(desc(userCards.pullDate))
    .limit(limit);
}

export async function getUniqueCardCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(distinct ${userCards.cardId})` })
    .from(userCards)
    .where(eq(userCards.userId, userId));
  return row?.count ?? 0;
}

export async function getAllPulls(userId: string) {
  return db
    .select({
      id: userCards.id,
      cardId: userCards.cardId,
      rarityScore: userCards.rarityScore,
      isRadiant: userCards.isRadiant,
      isReversed: userCards.isReversed,
      pullDate: userCards.pullDate,
    })
    .from(userCards)
    .where(eq(userCards.userId, userId));
}

export async function getDailyPullHistory(userId: string) {
  return db
    .select({
      id: userCards.id,
      cardId: userCards.cardId,
      rarityScore: sql<number>`${userCards.rarityScore}`,
      isRadiant: userCards.isRadiant,
      isReversed: userCards.isReversed,
      pullDate: userCards.pullDate,
    })
    .from(userCards)
    .where(and(eq(userCards.userId, userId), eq(userCards.pullType, "daily")))
    .orderBy(desc(userCards.pullDate));
}

export async function getPullDates(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ pullDate: userCards.pullDate })
    .from(userCards)
    .where(and(eq(userCards.userId, userId), inArray(userCards.pullType, ["daily", "spread"])));
  return rows.map((r) => r.pullDate);
}

export async function getUserCardHistory(userId: string, cardId: number) {
  return db
    .select()
    .from(userCards)
    .where(and(eq(userCards.userId, userId), eq(userCards.cardId, cardId)))
    .orderBy(userCards.pullDate);
}

export async function getPullById(pullId: number) {
  const [row] = await db
    .select({
      id: userCards.id,
      cardId: userCards.cardId,
      rarityScore: sql<Rarity>`${userCards.rarityScore}`,
      isRadiant: userCards.isRadiant,
      isReversed: userCards.isReversed,
      pullDate: userCards.pullDate,
      userId: userCards.userId,
      pullType: userCards.pullType,
    })
    .from(userCards)
    .where(eq(userCards.id, pullId))
    .limit(1);
  return row ?? null;
}

export async function getUserPublicStats(userId: string) {
  const [uniqueRow] = await db
    .select({ count: sql<number>`count(distinct ${userCards.cardId})` })
    .from(userCards)
    .where(and(eq(userCards.userId, userId), eq(userCards.pullType, "daily")));

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userCards)
    .where(and(eq(userCards.userId, userId), eq(userCards.pullType, "daily")));

  const recentCards = await db
    .select({
      cardId: userCards.cardId,
      pullDate: userCards.pullDate,
      rarityScore: sql<Rarity>`${userCards.rarityScore}`,
    })
    .from(userCards)
    .where(and(eq(userCards.userId, userId), eq(userCards.pullType, "daily")))
    .orderBy(desc(userCards.pullDate))
    .limit(6);

  return {
    uniqueCards: uniqueRow?.count ?? 0,
    totalPulls: totalRow?.count ?? 0,
    recentCards,
  };
}
