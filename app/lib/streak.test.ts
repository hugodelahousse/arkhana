import { describe, it, expect } from "vitest";
import { computeStreakFromSortedDates } from "./streak-compute";

// Helper: build a list of ascending ISO dates starting from `start`, skipping
// the given zero-based `skip` indices.
function dates(start: string, count: number, skip: number[] = []): string[] {
  const skipSet = new Set(skip);
  const result: string[] = [];
  let day = new Date(start + "T12:00:00Z");
  for (let i = 0; result.length < count; i++) {
    if (!skipSet.has(i)) {
      result.push(day.toISOString().slice(0, 10));
    }
    day = new Date(day.getTime() + 86_400_000);
  }
  return result;
}

describe("computeStreakFromSortedDates", () => {
  it("single pull → streak 1", () => {
    const r = computeStreakFromSortedDates(["2026-05-26"]);
    expect(r.currentStreak).toBe(1);
    expect(r.graceNightsUsed).toBe(0);
  });

  it("four consecutive days → streak 4", () => {
    const r = computeStreakFromSortedDates(dates("2026-05-23", 4));
    expect(r.currentStreak).toBe(4);
    expect(r.graceNightsUsed).toBe(0);
  });

  it("gap covered by one grace night → full streak", () => {
    // Pulled May 22, 23, 25, 26 — skipped May 24
    const d = ["2026-05-22", "2026-05-23", "2026-05-25", "2026-05-26"];
    const r = computeStreakFromSortedDates(d);
    expect(r.currentStreak).toBe(4);
    expect(r.graceNightsUsed).toBe(1);
    expect(r.cycleStartDate).toBe("2026-05-22");
    expect(r.lastPullDate).toBe("2026-05-26");
  });

  it("two grace nights in one cycle → full streak", () => {
    // May 20, 22 (grace), 24 (grace), 25
    const d = ["2026-05-20", "2026-05-22", "2026-05-24", "2026-05-25"];
    const r = computeStreakFromSortedDates(d);
    expect(r.currentStreak).toBe(4);
    expect(r.graceNightsUsed).toBe(2);
  });

  it("third gap in one cycle breaks the walk after both grace nights are consumed", () => {
    // Pulls: May 20, 22 (grace 1), 24 (grace 2), 26
    // Walking backward: 24→26 (grace 1), 22→24 (grace 2), 20→22 (no grace left → break).
    // Streak covers May 22, 24, 26 = 3.
    const d = ["2026-05-20", "2026-05-22", "2026-05-24", "2026-05-26"];
    const r = computeStreakFromSortedDates(d);
    expect(r.currentStreak).toBe(3);
    expect(r.graceNightsUsed).toBe(2);
    expect(r.cycleStartDate).toBe("2026-05-22");
  });

  it("a gap larger than one day with grace already exhausted breaks streak immediately", () => {
    // May 22, 23 (no gap), then 24 (grace used), then 27 (3-day gap → breaks)
    const d = ["2026-05-22", "2026-05-23", "2026-05-24", "2026-05-27"];
    const r = computeStreakFromSortedDates(d);
    // 24→27 diff=3, breaks immediately; streak is 1 (only May 27)
    expect(r.currentStreak).toBe(1);
    expect(r.graceNightsUsed).toBe(0);
  });

  it("two-day gap larger than grace breaks streak", () => {
    // May 22, 23, then 3-day gap → May 26
    const d = ["2026-05-22", "2026-05-23", "2026-05-26"];
    const r = computeStreakFromSortedDates(d);
    expect(r.currentStreak).toBe(1); // only May 26 survives
  });

  it("earlier history before a break does not inflate streak", () => {
    // Old pulls: May 10–14, then a long gap, then May 23–26
    const old = dates("2026-05-10", 5);
    const recent = dates("2026-05-23", 4);
    const r = computeStreakFromSortedDates([...old, ...recent]);
    expect(r.currentStreak).toBe(4);
    expect(r.lastPullDate).toBe("2026-05-26");
  });

  it("cycleStartDate is the first day of the current streak", () => {
    const d = ["2026-05-22", "2026-05-23", "2026-05-24", "2026-05-26"]; // grace on 25
    const r = computeStreakFromSortedDates(d);
    expect(r.cycleStartDate).toBe("2026-05-22");
  });

  it("deduplication does not affect result (caller dedupes, but illustrative)", () => {
    // Sorted, already deduped
    const d = ["2026-05-24", "2026-05-25", "2026-05-26"];
    const r = computeStreakFromSortedDates(d);
    expect(r.currentStreak).toBe(3);
  });
});
