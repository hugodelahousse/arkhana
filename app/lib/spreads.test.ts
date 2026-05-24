import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  SPREAD_REGISTRY,
  getSpreadType,
  getTodaySpreadType,
} from "./spreads";

const monday = DateTime.fromISO("2026-05-18", { zone: "utc" }); // weekday 1
const friday = DateTime.fromISO("2026-05-22", { zone: "utc" }); // weekday 5
const saturday = DateTime.fromISO("2026-05-23", { zone: "utc" }); // weekday 6
const sunday = DateTime.fromISO("2026-05-24", { zone: "utc" }); // weekday 7

describe("SPREAD_REGISTRY", () => {
  it("contains sunday-weekly", () => {
    expect(SPREAD_REGISTRY["sunday-weekly"]).toBeDefined();
  });

  it("sunday-weekly has 4 positions", () => {
    expect(SPREAD_REGISTRY["sunday-weekly"].positions).toHaveLength(4);
  });

  it("positions are Mind, Body, Spirit, Action", () => {
    const labels = SPREAD_REGISTRY["sunday-weekly"].positions.map((p) => p.label);
    expect(labels).toEqual(["Mind", "Body", "Spirit", "Action"]);
  });

  it("each position has a contemplationPrompt", () => {
    for (const pos of SPREAD_REGISTRY["sunday-weekly"].positions) {
      expect(pos.contemplationPrompt.length).toBeGreaterThan(10);
    }
  });
});

describe("sunday-weekly isAvailable", () => {
  const spread = SPREAD_REGISTRY["sunday-weekly"];

  it("is available on Sunday", () => {
    expect(spread.isAvailable(sunday)).toBe(true);
  });

  it("is not available on Monday", () => {
    expect(spread.isAvailable(monday)).toBe(false);
  });

  it("is not available on Friday", () => {
    expect(spread.isAvailable(friday)).toBe(false);
  });

  it("is not available on Saturday", () => {
    expect(spread.isAvailable(saturday)).toBe(false);
  });
});

describe("sunday-weekly nextAvailable", () => {
  const spread = SPREAD_REGISTRY["sunday-weekly"];

  it("from Sunday returns next Sunday (7 days later)", () => {
    const next = spread.nextAvailable(sunday);
    expect(next.weekday).toBe(7);
    expect(next.toISODate()).toBe("2026-05-31");
  });

  it("from Monday returns this coming Sunday", () => {
    const next = spread.nextAvailable(monday);
    expect(next.weekday).toBe(7);
    expect(next.toISODate()).toBe("2026-05-24");
  });

  it("from Saturday returns next day (Sunday)", () => {
    const next = spread.nextAvailable(saturday);
    expect(next.weekday).toBe(7);
    expect(next.toISODate()).toBe("2026-05-24");
  });

  it("nextAvailable is always at start of day", () => {
    const next = spread.nextAvailable(monday);
    expect(next.hour).toBe(0);
    expect(next.minute).toBe(0);
    expect(next.second).toBe(0);
  });
});

describe("getSpreadType", () => {
  it("returns the spread for a known id", () => {
    const s = getSpreadType("sunday-weekly");
    expect(s).not.toBeNull();
    expect(s!.id).toBe("sunday-weekly");
  });

  it("returns null for unknown id", () => {
    expect(getSpreadType("nonexistent")).toBeNull();
  });
});

describe("getTodaySpreadType", () => {
  it("returns sunday-weekly on Sunday", () => {
    const s = getTodaySpreadType(sunday);
    expect(s).not.toBeNull();
    expect(s!.id).toBe("sunday-weekly");
  });

  it("returns null on weekdays", () => {
    expect(getTodaySpreadType(monday)).toBeNull();
    expect(getTodaySpreadType(friday)).toBeNull();
    expect(getTodaySpreadType(saturday)).toBeNull();
  });
});
