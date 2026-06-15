import type { DateTime } from "luxon";

// The daily reminder fires once per user near noon in their local timezone.
// The cron runs every 30 minutes; this window ([12:00, 12:30)) ensures each
// whole-, half-, and quarter-hour UTC offset matches exactly one firing.
export const REMINDER_HOUR = 12;
const WINDOW_MINUTES = 30;

export function isWithinReminderWindow(localNow: DateTime): boolean {
  return localNow.hour === REMINDER_HOUR && localNow.minute < WINDOW_MINUTES;
}
