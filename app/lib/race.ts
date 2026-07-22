import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "../../db/index.js";
import { user } from "../../db/schema/auth.js";
import { follows } from "../../db/schema/follows.js";
import { userCards } from "../../db/schema/user-cards.js";
import { todayForUser } from "./utils.js";
import type { Rarity } from "./cards.js";

// One pulled day on a runner's line. Days without an entry between
// startIndex and endIndex are missed days (rendered greyed on the chart).
export interface RacePull {
  i: number; // day index from the shared domain start
  count: number; // cumulative unique cards at end of this day
  rarity: Rarity; // best rarity pulled this day
  radiant: boolean; // any radiant card this day
  spread: boolean; // this was a Sunday-spread day
  gained: number; // unique cards added this day (0 = duplicate day)
}

export interface RaceRunner {
  id: string;
  username: string | null;
  handle: string;
  image: string | null;
  isViewer: boolean;
  startIndex: number; // day index of first pull; -1 if never pulled
  endIndex: number; // the runner's own local "today" as a day index
  total: number; // current unique-card count
  pullDays: number; // days with at least one pull
  pulls: RacePull[];
}

export interface RaceData {
  start: string; // "YYYY-MM-DD" — earliest first pull across all runners
  end: string; // "YYYY-MM-DD" — latest local today across all runners
  days: number; // inclusive day count of the domain
  runners: RaceRunner[];
}

interface MemberRow {
  id: string;
  username: string | null;
  displayUsername: string | null;
  image: string | null;
  timezone: string | null;
}

const memberFields = {
  id: user.id,
  username: user.username,
  displayUsername: user.displayUsername,
  image: user.image,
  timezone: user.timezone,
};

// Cap for the ?users= focus list — bounds the query and the chart's series count.
export const MAX_FOCUS_USERS = 16;

// Collection progression for the viewer + everyone they follow: for each
// runner, the cumulative count of DISTINCT cards over calendar days since
// their first pull. Counts every user_cards row regardless of pullType so
// Sunday spreads are covered (see CLAUDE.md "recurring pitfall").
export async function getCircleRace(viewerId: string): Promise<RaceData> {
  const [viewerRow] = await db
    .select(memberFields)
    .from(user)
    .where(eq(user.id, viewerId))
    .limit(1);

  const followedRows = await db
    .select(memberFields)
    .from(follows)
    .innerJoin(user, eq(user.id, follows.followingId))
    .where(eq(follows.followerId, viewerId))
    .orderBy(desc(follows.createdAt));

  // Alphabetical order keeps color-slot assignment stable across visits.
  followedRows.sort((a, b) => (a.username ?? "").localeCompare(b.username ?? ""));
  const members: MemberRow[] = viewerRow ? [viewerRow, ...followedRows] : followedRows;
  return assembleRace(viewerId, members);
}

// Progression for an explicit set of usernames (the ?users= focus view) —
// independent of the viewer's circle. Unknown and anonymous (temp-*) accounts
// are silently dropped; usernames are stored lowercased so matching is
// case-insensitive. The viewer only appears if their own username is listed.
export async function getRaceForUsernames(
  viewerId: string,
  usernames: string[]
): Promise<RaceData> {
  const wanted = [
    ...new Set(usernames.map((u) => u.trim().toLowerCase()).filter(Boolean)),
  ].slice(0, MAX_FOCUS_USERS);
  if (wanted.length === 0) return assembleRace(viewerId, []);

  const members = await db
    .select(memberFields)
    .from(user)
    .where(
      and(
        inArray(user.username, wanted),
        // Anonymous accounts are ephemeral, not browsable profiles — same rule
        // as resolveFollowTarget in follows.ts.
        or(eq(user.isAnonymous, false), isNull(user.isAnonymous))
      )
    );

  members.sort((a, b) => {
    if ((a.id === viewerId) !== (b.id === viewerId)) return a.id === viewerId ? -1 : 1;
    return (a.username ?? "").localeCompare(b.username ?? "");
  });
  return assembleRace(viewerId, members);
}

async function assembleRace(viewerId: string, members: MemberRow[]): Promise<RaceData> {
  if (members.length === 0) {
    const today = todayForUser(null);
    return { start: today, end: today, days: 1, runners: [] };
  }

  const rows = await db
    .select({
      userId: userCards.userId,
      cardId: userCards.cardId,
      pullDate: userCards.pullDate,
      pullType: userCards.pullType,
      rarityScore: userCards.rarityScore,
      isRadiant: userCards.isRadiant,
    })
    .from(userCards)
    .where(inArray(userCards.userId, members.map((m) => m.id)))
    .orderBy(asc(userCards.pullDate), asc(userCards.id));

  const rowsByUser = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = rowsByUser.get(row.userId);
    if (list) list.push(row);
    else rowsByUser.set(row.userId, [row]);
  }

  // Domain start = earliest first pull; end = latest local "today".
  let start: string | null = null;
  let end: string | null = null;
  const localTodayById = new Map<string, string>();
  for (const m of members) {
    const localToday = todayForUser(m.timezone);
    localTodayById.set(m.id, localToday);
    if (!end || localToday > end) end = localToday;
    const first = rowsByUser.get(m.id)?.[0]?.pullDate;
    if (first && (!start || first < start)) start = first;
  }
  // end is always set here (members is non-empty); it doubles as the domain
  // fallback when nobody has pulled yet.
  start ??= end!;
  end = end && end > start ? end : start;

  const startDt = DateTime.fromISO(start, { zone: "utc" });
  const dayIndex = (date: string) =>
    Math.round(DateTime.fromISO(date, { zone: "utc" }).diff(startDt, "days").days);
  const days = dayIndex(end) + 1;

  const runners: RaceRunner[] = members.map((m) => {
    const memberRows = rowsByUser.get(m.id) ?? [];
    const owned = new Set<number>();
    const pulls: RacePull[] = [];

    // Rows arrive date-sorted; fold each date's rows into one RacePull.
    let current: RacePull | null = null;
    for (const row of memberRows) {
      const i = dayIndex(row.pullDate);
      if (!current || current.i !== i) {
        if (current) pulls.push(current);
        current = { i, count: owned.size, rarity: 1, radiant: false, spread: false, gained: 0 };
      }
      if (!owned.has(row.cardId)) {
        owned.add(row.cardId);
        current.gained += 1;
      }
      current.count = owned.size;
      current.rarity = Math.max(current.rarity, row.rarityScore) as Rarity;
      current.radiant ||= row.isRadiant;
      current.spread ||= row.pullType === "spread";
    }
    if (current) pulls.push(current);

    const startIndex = pulls.length > 0 ? pulls[0].i : -1;
    const lastPullIndex = pulls.length > 0 ? pulls[pulls.length - 1].i : 0;
    const localTodayIndex = dayIndex(localTodayById.get(m.id) ?? end);
    const endIndex = Math.min(days - 1, Math.max(localTodayIndex, lastPullIndex));

    return {
      id: m.id,
      username: m.username,
      handle: m.displayUsername ?? m.username ?? "reader",
      image: m.image,
      isViewer: m.id === viewerId,
      startIndex,
      endIndex,
      total: owned.size,
      pullDays: pulls.length,
      pulls,
    };
  });

  return { start, end, days, runners };
}
