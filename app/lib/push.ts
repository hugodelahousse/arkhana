import webpush from "web-push";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { db } from "../../db/index.js";
import { pushSubscriptions } from "../../db/schema/push-subscriptions.js";
import { config } from "../../config/index.js";
import { getReminderTargets } from "./reminder-targets.js";
import type { Milestone } from "./streak.js";

let initialized = false;

function initWebPush(): boolean {
  if (initialized) return true;
  if (!config.vapidPublicKey || !config.vapidPrivateKey) return false;
  webpush.setVapidDetails(
    config.vapidSubject,
    config.vapidPublicKey,
    config.vapidPrivateKey
  );
  initialized = true;
  return true;
}

export interface PushPayload {
  type: "daily-reminder" | "milestone" | "celestial" | "new-follower";
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

async function sendToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) {
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, sub.endpoint));
    }
    throw err;
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!initWebPush()) return;
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  await Promise.allSettled(subs.map((s) => sendToSubscription(s, payload)));
}

export async function sendMilestoneNotification(userId: string, milestone: Milestone) {
  const messages: Record<Milestone, string> = {
    7: "Seven days. You've established a practice.",
    28: "A full lunar cycle. The cards have marked you.",
    100: "One hundred days. The arkhive remembers.",
  };
  await sendPushToUser(userId, {
    type: "milestone",
    title: "Arkhana",
    body: messages[milestone],
    url: "/",
    tag: `milestone-${milestone}`,
  });
}

export async function sendDailyReminders(nowUtc: DateTime = DateTime.utc()) {
  if (!initWebPush()) return;

  const targets = await getReminderTargets(nowUtc);

  const REMINDER_BODIES = [
    "Your circle is drawing. Pull your card to reveal today's board.",
    "A card waits — draw it to see what your circle drew today.",
    "The arkhive stirs. Draw to unveil your circle's pulls.",
  ];
  const body = REMINDER_BODIES[Math.floor(Math.random() * REMINDER_BODIES.length)];

  await Promise.allSettled(
    targets.map((userId) =>
      sendPushToUser(userId, {
        type: "daily-reminder",
        title: "Arkhana",
        body,
        url: "/",
        tag: "daily-reminder",
      })
    )
  );
}

export async function sendCelestialNotification(event: "new-moon" | "full-moon") {
  if (!initWebPush()) return;

  const messages = {
    "new-moon": "The new moon arrives. A good night to listen.",
    "full-moon": "Full moon. Draw your card under its light.",
  };

  const targets = await db
    .selectDistinct({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);

  await Promise.allSettled(
    targets.map((t) =>
      sendPushToUser(t.userId, {
        type: "celestial",
        title: "Arkhana",
        body: messages[event],
        url: "/",
        tag: `celestial-${event}`,
      })
    )
  );
}

export interface TestPushResult {
  vapidConfigured: boolean;
  subscriptionCount: number;
  results: { endpoint: string; ok: boolean; error?: string }[];
}

export async function testPushToUser(userId: string, payload: PushPayload): Promise<TestPushResult> {
  const vapidConfigured = initWebPush();
  if (!vapidConfigured) return { vapidConfigured, subscriptionCount: 0, results: [] };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  const results = await Promise.all(
    subs.map(async (s) => {
      try {
        await sendToSubscription(s, payload);
        return { endpoint: s.endpoint, ok: true };
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        return { endpoint: s.endpoint, ok: false, error: `${status ?? ""} ${err}`.trim() };
      }
    })
  );

  return { vapidConfigured, subscriptionCount: subs.length, results };
}

export function getVapidPublicKey(): string | null {
  return config.vapidPublicKey ?? null;
}
