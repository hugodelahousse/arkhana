import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  SPREAD_REGISTRY,
  getSpreadType,
  getTodaySpreadType,
} from "./spreads";
import { getUpcomingCelestialEvents } from "./moonphase";

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

// Compute real moon event dates from the formula used by the app
const upcomingEvents = getUpcomingCelestialEvents(DateTime.fromISO("2026-01-01", { zone: "utc" }), 120);
const newMoonEvent = upcomingEvents.find((e) => e.event === "new-moon")!;
const fullMoonEvent = upcomingEvents.find((e) => e.event === "full-moon")!;
const newMoonDate = DateTime.fromISO(newMoonEvent.date.toISODate()!, { zone: "utc" });
const fullMoonDate = DateTime.fromISO(fullMoonEvent.date.toISODate()!, { zone: "utc" });
// A date safely between new and full moon (waxing quarter — neither event)
const waxingDate = newMoonDate.plus({ days: 7 });

describe("new-moon spread", () => {
  const spread = SPREAD_REGISTRY["new-moon"];

  it("exists in registry", () => {
    expect(spread).toBeDefined();
    expect(spread.id).toBe("new-moon");
  });

  it("has 5 positions", () => {
    expect(spread.positions).toHaveLength(5);
  });

  it("position labels are correct", () => {
    const labels = spread.positions.map((p) => p.label);
    expect(labels).toEqual(["The Gift", "What to Release", "The Seed", "The Obstacle", "First Steps"]);
  });

  it("each position has a contemplationPrompt", () => {
    for (const pos of spread.positions) {
      expect(pos.contemplationPrompt.length).toBeGreaterThan(10);
    }
  });

  it("is available on a new moon date", () => {
    expect(spread.isAvailable(newMoonDate)).toBe(true);
  });

  it("is not available on a waxing quarter date", () => {
    expect(spread.isAvailable(waxingDate)).toBe(false);
  });

  it("is not available on a full moon date", () => {
    expect(spread.isAvailable(fullMoonDate)).toBe(false);
  });

  it("nextAvailable returns a future new moon date", () => {
    const next = spread.nextAvailable(newMoonDate);
    expect(next.toMillis()).toBeGreaterThan(newMoonDate.toMillis());
    expect(spread.isAvailable(next)).toBe(true);
  });

  it("nextAvailable is at start of day", () => {
    const next = spread.nextAvailable(waxingDate);
    expect(next.hour).toBe(0);
    expect(next.minute).toBe(0);
    expect(next.second).toBe(0);
  });
});

describe("full-moon spread", () => {
  const spread = SPREAD_REGISTRY["full-moon"];

  it("exists in registry", () => {
    expect(spread).toBeDefined();
    expect(spread.id).toBe("full-moon");
  });

  it("has 6 positions", () => {
    expect(spread.positions).toHaveLength(6);
  });

  it("position labels are correct", () => {
    const labels = spread.positions.map((p) => p.label);
    expect(labels).toEqual([
      "What Has Grown",
      "What Is Illuminated",
      "What Hides in the Light",
      "What Must Be Released",
      "How to Let Go",
      "What Emerges",
    ]);
  });

  it("each position has a contemplationPrompt", () => {
    for (const pos of spread.positions) {
      expect(pos.contemplationPrompt.length).toBeGreaterThan(10);
    }
  });

  it("is available on a full moon date", () => {
    expect(spread.isAvailable(fullMoonDate)).toBe(true);
  });

  it("is not available on a waxing quarter date", () => {
    expect(spread.isAvailable(waxingDate)).toBe(false);
  });

  it("is not available on a new moon date", () => {
    expect(spread.isAvailable(newMoonDate)).toBe(false);
  });

  it("nextAvailable returns a future full moon date", () => {
    const next = spread.nextAvailable(fullMoonDate);
    expect(next.toMillis()).toBeGreaterThan(fullMoonDate.toMillis());
    expect(spread.isAvailable(next)).toBe(true);
  });

  it("nextAvailable is at start of day", () => {
    const next = spread.nextAvailable(waxingDate);
    expect(next.hour).toBe(0);
    expect(next.minute).toBe(0);
    expect(next.second).toBe(0);
  });
});
