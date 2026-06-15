import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { isWithinReminderWindow } from "./reminder.js";

function at(zone: string, hour: number, minute: number): DateTime {
  return DateTime.fromObject({ hour, minute }, { zone });
}

describe("isWithinReminderWindow", () => {
  it("is true at exactly noon", () => {
    expect(isWithinReminderWindow(at("UTC", 12, 0))).toBe(true);
  });

  it("is true through 12:29 (the half-hour window)", () => {
    expect(isWithinReminderWindow(at("UTC", 12, 29))).toBe(true);
  });

  it("is false at 12:30 (window closed)", () => {
    expect(isWithinReminderWindow(at("UTC", 12, 30))).toBe(false);
  });

  it("is false before noon", () => {
    expect(isWithinReminderWindow(at("UTC", 11, 59))).toBe(false);
  });

  it("is false after the window", () => {
    expect(isWithinReminderWindow(at("UTC", 13, 0))).toBe(false);
  });

  it("reads the LOCAL hour of a zoned time (half-hour-offset zone)", () => {
    // 12:15 local in a +5:45 zone is still inside the window
    expect(isWithinReminderWindow(at("Asia/Kathmandu", 12, 15))).toBe(true);
    expect(isWithinReminderWindow(at("Asia/Kathmandu", 11, 0))).toBe(false);
  });
});
