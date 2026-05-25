import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { streaks } from "../../db/schema/streaks.js";
import { DateTime } from "luxon";

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastPullDate: string | null;
  cycleStartDate: string | null;
  graceNightsUsed: number;
}

export type Milestone = 7 | 28 | 100;
const MILESTONES: Milestone[] = [7, 28, 100];

export async function getStreak(userId: string): Promise<StreakState | null> {
  const [row] = await db
    .select()
    .from(streaks)
    .where(eq(streaks.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function updateStreak(
  userId: string,
  pullDate: string
): Promise<{ newStreak: number; milestone: Milestone | null }> {
  const [existing] = await db
    .select()
    .from(streaks)
    .where(eq(streaks.userId, userId))
    .limit(1);

  if (!existing) {
    await db.insert(streaks).values({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastPullDate: pullDate,
      cycleStartDate: pullDate,
      graceNightsUsed: 0,
    });
    return { newStreak: 1, milestone: null };
  }

  if (existing.lastPullDate === pullDate) {
    return { newStreak: existing.currentStreak, milestone: null };
  }

  const today = DateTime.fromISO(pullDate, { zone: "utc" });
  const yesterday = today.minus({ days: 1 }).toISODate()!;
  const twoDaysAgo = today.minus({ days: 2 }).toISODate()!;

  let newStreak: number;
  let newCycleStart: string;
  let newGraceNightsUsed: number;

  if (existing.lastPullDate === yesterday) {
    newStreak = existing.currentStreak + 1;
    newGraceNightsUsed = existing.graceNightsUsed;
    newCycleStart = existing.cycleStartDate ?? pullDate;
  } else if (existing.lastPullDate === twoDaysAgo && existing.graceNightsUsed < 2) {
    // Grace night applied silently
    newStreak = existing.currentStreak + 1;
    newGraceNightsUsed = existing.graceNightsUsed + 1;
    newCycleStart = existing.cycleStartDate ?? pullDate;
  } else {
    // Streak broken — new cycle
    newStreak = 1;
    newGraceNightsUsed = 0;
    newCycleStart = pullDate;
  }

  // Grace nights reset at the start of each 28-day cycle
  if (newStreak % 28 === 1 && newStreak > 1) {
    newGraceNightsUsed = 0;
    newCycleStart = pullDate;
  }

  const newLongest = Math.max(existing.longestStreak, newStreak);

  const prevStreak = existing.currentStreak;
  await db
    .update(streaks)
    .set({
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastPullDate: pullDate,
      cycleStartDate: newCycleStart,
      graceNightsUsed: newGraceNightsUsed,
    })
    .where(eq(streaks.userId, userId));

  // Only surface milestone if we just crossed it for the first time this streak
  const milestone = MILESTONES.find(m => newStreak === m && prevStreak < m) ?? null;

  return { newStreak, milestone };
}
