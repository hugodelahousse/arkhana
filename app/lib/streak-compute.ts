import { DateTime } from "luxon";

export interface ComputedStreak {
  currentStreak: number;
  longestStreak: number;
  graceNightsUsed: number;
  lastPullDate: string;
  cycleStartDate: string;
}

/**
 * Pure streak computation from an already-sorted, deduped list of pull dates
 * (ascending "YYYY-MM-DD"). Applies the same grace-night rules as updateStreak:
 * a 1-day gap counts as a grace night (max 2 per 28-day cycle).
 */
export function computeStreakFromSortedDates(sorted: string[]): ComputedStreak {
  let currentStreak = 1;
  let longestStreak = 1;
  let graceUsedInCycle = 0;
  for (let i = sorted.length - 2; i >= 0; i--) {
    const prev = DateTime.fromISO(sorted[i + 1], { zone: "utc" });
    const curr = DateTime.fromISO(sorted[i], { zone: "utc" });
    const diff = prev.diff(curr, "days").days;
    if (diff === 1) {
      currentStreak++;
    } else if (diff === 2 && graceUsedInCycle < 2) {
      currentStreak++;
      graceUsedInCycle++;
    } else {
      break;
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    if (currentStreak % 28 === 1 && currentStreak > 1) graceUsedInCycle = 0;
  }
  return {
    currentStreak,
    longestStreak,
    graceNightsUsed: graceUsedInCycle,
    lastPullDate: sorted[sorted.length - 1],
    cycleStartDate: sorted[sorted.length - currentStreak],
  };
}
