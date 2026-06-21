import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "../../db/index.js";
import { pushSubscriptions } from "../../db/schema/push-subscriptions.js";
import { user } from "../../db/schema/auth.js";
import { isWithinReminderWindow } from "./reminder.js";
import { hasPulledToday } from "./pull.js";

// Subscribed users who are within their local noon reminder window and have not
// yet drawn their daily card. `nowUtc` is injectable for testing. Deliberately
// free of any `config` import so this (and its test) don't require auth env vars
// — `config` parses BETTER_AUTH_* at module load and isn't present in CI/tests.
export async function getReminderTargets(
  nowUtc: DateTime = DateTime.utc()
): Promise<string[]> {
  const subscribers = await db
    .selectDistinct({ userId: pushSubscriptions.userId, timezone: user.timezone })
    .from(pushSubscriptions)
    .innerJoin(user, eq(user.id, pushSubscriptions.userId));

  const targets: string[] = [];
  for (const s of subscribers) {
    const localNow = nowUtc.setZone(s.timezone ?? "UTC");
    if (!localNow.isValid || !isWithinReminderWindow(localNow)) continue;
    const localToday = localNow.toISODate()!;
    if (await hasPulledToday(s.userId, localToday)) continue;
    targets.push(s.userId);
  }
  return targets;
}
