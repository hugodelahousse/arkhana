import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { todayForUser, nowForUser, parseTzCookie } from "./utils";
import { DateTime, Settings } from "luxon";

describe("todayForUser", () => {
  it("returns UTC date when timezone is null", () => {
    const result = todayForUser(null);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toBe(DateTime.utc().toISODate());
  });

  it("returns local date for a given timezone", () => {
    const now = Settings.now;
    // Fix time to 2026-06-01 03:00 UTC → still May 31 in NYC (UTC-4)
    Settings.now = () => new Date("2026-06-01T03:00:00Z").getTime();
    try {
      expect(todayForUser("America/New_York")).toBe("2026-05-31");
      expect(todayForUser("Asia/Tokyo")).toBe("2026-06-01");
      expect(todayForUser(null)).toBe("2026-06-01");
    } finally {
      Settings.now = now;
    }
  });

  it("falls back to UTC for invalid timezone", () => {
    const result = todayForUser("Not/A/Zone");
    expect(result).toBe(DateTime.utc().toISODate());
  });
});

describe("nowForUser", () => {
  it("returns UTC DateTime when timezone is null", () => {
    const dt = nowForUser(null);
    expect(dt.zoneName).toBe("UTC");
  });

  it("returns timezone-aware DateTime", () => {
    const dt = nowForUser("America/Los_Angeles");
    expect(dt.zoneName).toBe("America/Los_Angeles");
  });

  it("returns UTC for invalid timezone", () => {
    const dt = nowForUser("Fake/Zone");
    expect(dt.zoneName).toBe("UTC");
  });
});

describe("parseTzCookie", () => {
  function makeRequest(cookie: string): Request {
    return new Request("http://localhost/", {
      headers: { cookie },
    });
  }

  it("parses a valid tz cookie", () => {
    expect(parseTzCookie(makeRequest("tz=America%2FNew_York"))).toBe("America/New_York");
  });

  it("parses tz cookie among other cookies", () => {
    expect(parseTzCookie(makeRequest("theme=dark; tz=Europe%2FParis; other=1"))).toBe("Europe/Paris");
  });

  it("returns null when no tz cookie", () => {
    expect(parseTzCookie(makeRequest("theme=dark"))).toBeNull();
  });

  it("returns null for empty cookie header", () => {
    expect(parseTzCookie(new Request("http://localhost/"))).toBeNull();
  });

  it("returns null for invalid timezone value", () => {
    expect(parseTzCookie(makeRequest("tz=Not%2FA%2FTimezone"))).toBeNull();
  });

  it("handles unencoded timezone", () => {
    expect(parseTzCookie(makeRequest("tz=UTC"))).toBe("UTC");
  });
});
