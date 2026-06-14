import { and, desc, eq, isNull, like, ne, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { follows } from "../../db/schema/follows.js";
import { user } from "../../db/schema/auth.js";
import { userCards } from "../../db/schema/user-cards.js";
import { spreads, spreadCards } from "../../db/schema/spreads.js";
import { todayForUser } from "./utils.js";

export async function followUser(followerId: string, followingId: string): Promise<void> {
  if (followerId === followingId) {
    throw new Error("Cannot follow yourself");
  }
  await db
    .insert(follows)
    .values({ followerId, followingId })
    .onConflictDoNothing();
}

export type FollowTargetResult =
  | { status: "ok"; targetId: string }
  | { status: "not_found" }
  | { status: "self" };

// Resolve a target username to a follow decision. Used by the follow action to
// validate before mutating. Case-insensitive (usernames are stored lowercased).
export async function resolveFollowTarget(
  viewerId: string,
  targetUsername: string
): Promise<FollowTargetResult> {
  const [target] = await db
    .select({ id: user.id, isAnonymous: user.isAnonymous })
    .from(user)
    .where(eq(user.username, targetUsername.toLowerCase()))
    .limit(1);
  if (!target) return { status: "not_found" };
  // Anonymous (temp-*) accounts are ephemeral and not real, browsable profiles —
  // treat them as not found so they can't be followed.
  if (target.isAnonymous) return { status: "not_found" };
  if (target.id === viewerId) return { status: "self" };
  return { status: "ok", targetId: target.id };
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  await db
    .delete(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: follows.id })
    .from(follows)
    .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
    .limit(1);
  return !!row;
}

export async function getFollowingIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(eq(follows.followerId, userId));
  return rows.map((r) => r.followingId);
}

export async function getFollowCounts(
  userId: string
): Promise<{ followers: number; following: number }> {
  const [followersRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(follows)
    .where(eq(follows.followingId, userId));
  const [followingRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(follows)
    .where(eq(follows.followerId, userId));
  return {
    followers: Number(followersRow?.count ?? 0),
    following: Number(followingRow?.count ?? 0),
  };
}

const profileFields = {
  id: user.id,
  username: user.username,
  displayUsername: user.displayUsername,
  image: user.image,
};

export interface FollowProfile {
  id: string;
  username: string | null;
  displayUsername: string | null;
  image: string | null;
}

// People who follow `userId`, with a flag for whether `userId` follows them back.
export async function getFollowers(
  userId: string
): Promise<(FollowProfile & { isFollowingBack: boolean })[]> {
  const rows = await db
    .select({ ...profileFields, createdAt: follows.createdAt })
    .from(follows)
    .innerJoin(user, eq(user.id, follows.followerId))
    .where(eq(follows.followingId, userId))
    .orderBy(desc(follows.createdAt));

  const myFollowing = new Set(await getFollowingIds(userId));
  return rows.map(({ createdAt: _createdAt, ...p }) => ({
    ...p,
    isFollowingBack: myFollowing.has(p.id),
  }));
}

// People `userId` follows.
export async function getFollowing(userId: string): Promise<FollowProfile[]> {
  const rows = await db
    .select({ ...profileFields, createdAt: follows.createdAt })
    .from(follows)
    .innerJoin(user, eq(user.id, follows.followingId))
    .where(eq(follows.followerId, userId))
    .orderBy(desc(follows.createdAt));
  return rows.map(({ createdAt: _createdAt, ...p }) => p);
}

export async function searchUsers(
  viewerId: string,
  query: string,
  limit = 10
): Promise<(FollowProfile & { isFollowing: boolean })[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const rows = await db
    .select(profileFields)
    .from(user)
    .where(
      and(
        like(user.username, `${q}%`),
        or(eq(user.isAnonymous, false), isNull(user.isAnonymous)),
        ne(user.id, viewerId)
      )
    )
    .limit(limit);

  const followingIds = new Set(await getFollowingIds(viewerId));
  return rows.map((p) => ({ ...p, isFollowing: followingIds.has(p.id) }));
}

export interface CirclePull {
  id: number;
  cardId: number;
  rarityScore: number;
  isRadiant: boolean;
  isReversed: boolean;
  pullDate: string;
}

export interface CircleSpreadCard {
  cardId: number;
  rarityScore: number;
  isRadiant: boolean;
  isReversed: boolean;
  positionKey: string;
}

export interface CircleSpread {
  spreadType: string;
  spreadDate: string;
  cards: CircleSpreadCard[];
}

export interface CircleEntry {
  user: FollowProfile;
  pull: CirclePull | null;
  spread: CircleSpread | null;
}

// The daily-circle feed: for each user the viewer follows, that user's daily
// pull for THEIR own local "today" (timezone-aware), or null if they haven't
// drawn yet. Users who have drawn are ordered first.
export async function getCircleDailyPulls(viewerId: string): Promise<CircleEntry[]> {
  const followed = await db
    .select({ ...profileFields, timezone: user.timezone })
    .from(follows)
    .innerJoin(user, eq(user.id, follows.followingId))
    .where(eq(follows.followerId, viewerId))
    .orderBy(desc(follows.createdAt));

  const entries: CircleEntry[] = [];
  for (const { timezone, ...profile } of followed) {
    const localToday = todayForUser(timezone);

    // Fetch all spread cards for today first — spread takes display priority on spread days.
    const spreadRows = await db
      .select({
        spreadType: spreads.spreadType,
        spreadDate: spreads.spreadDate,
        cardId: userCards.cardId,
        rarityScore: userCards.rarityScore,
        isRadiant: userCards.isRadiant,
        isReversed: userCards.isReversed,
        positionKey: spreadCards.positionKey,
      })
      .from(spreads)
      .innerJoin(spreadCards, eq(spreadCards.spreadId, spreads.id))
      .innerJoin(userCards, eq(userCards.id, spreadCards.userCardId))
      .where(and(eq(spreads.userId, profile.id), eq(spreads.spreadDate, localToday)))
      .orderBy(spreadCards.position);

    const spread: CircleSpread | null = spreadRows.length > 0
      ? {
          spreadType: spreadRows[0].spreadType,
          spreadDate: spreadRows[0].spreadDate,
          cards: spreadRows.map(({ cardId, rarityScore, isRadiant, isReversed, positionKey }) => ({
            cardId, rarityScore, isRadiant, isReversed, positionKey,
          })),
        }
      : null;

    // Only query for the daily pull when no spread was drawn today.
    let pull: CirclePull | null = null;
    if (!spread) {
      const [dailyRow] = await db
        .select({
          id: userCards.id,
          cardId: userCards.cardId,
          rarityScore: userCards.rarityScore,
          isRadiant: userCards.isRadiant,
          isReversed: userCards.isReversed,
          pullDate: userCards.pullDate,
        })
        .from(userCards)
        .where(
          and(
            eq(userCards.userId, profile.id),
            eq(userCards.pullType, "daily"),
            eq(userCards.pullDate, localToday)
          )
        )
        .limit(1);
      pull = dailyRow ?? null;
    }

    entries.push({ user: profile, pull, spread });
  }

  entries.sort((a, b) => {
    const aDrawn = !!(a.pull || a.spread);
    const bDrawn = !!(b.pull || b.spread);
    if (aDrawn !== bDrawn) return aDrawn ? -1 : 1;
    return (a.user.username ?? "").localeCompare(b.user.username ?? "");
  });
  return entries;
}
