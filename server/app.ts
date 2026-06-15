import { createRequestHandler } from "@react-router/express";
import express from "express";
import cron from "node-cron";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { db } from "../db/index.js";
import { pushSubscriptions } from "../db/schema/push-subscriptions.js";
import { eq } from "drizzle-orm";
import { getVapidPublicKey, testPushToUser, sendDailyReminders, sendCelestialNotification } from "../app/lib/push.js";
import { getUpcomingCelestialEvents } from "../app/lib/moonphase.js";
import { DateTime } from "luxon";
import { parseTzCookie } from "../app/lib/utils.js";
import { user as userTable } from "../db/schema/auth.js";

export const app = express();

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

// VAPID public key for client-side push subscription setup
app.get("/api/push/vapid-public-key", (_req, res) => {
  const key = getVapidPublicKey();
  if (!key) return res.status(404).json({ error: "Push not configured" });
  res.json({ publicKey: key });
});

// Save a new push subscription
app.post("/api/push/subscribe", async (req, res) => {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });
  if (!session?.user) return res.status(401).json({ error: "Unauthorized" });

  const { endpoint, keys } = req.body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription" });
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    .onConflictDoNothing();

  res.json({ ok: true });
});

// Remove a push subscription
app.delete("/api/push/subscribe", async (req, res) => {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });
  if (!session?.user) return res.status(401).json({ error: "Unauthorized" });

  const { endpoint } = req.body ?? {};
  if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  res.json({ ok: true });
});

// Test push notification (dev only)
app.post("/api/push/test", async (req, res) => {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });
  if (!session?.user) return res.status(401).json({ error: "Unauthorized" });

  const { type = "daily-reminder" } = req.body ?? {};
  const payloads: Record<string, { title: string; body: string; tag: string }> = {
    "daily-reminder": {
      title: "Arkhana",
      body: "A card is waiting.",
      tag: "daily-reminder",
    },
    milestone: {
      title: "Arkhana",
      body: "Seven days. You've established a practice.",
      tag: "milestone-7",
    },
    celestial: {
      title: "Arkhana",
      body: "Full moon. Draw your card under its light.",
      tag: "celestial-full-moon",
    },
  };

  const payload = payloads[type] ?? payloads["daily-reminder"];
  const result = await testPushToUser(session.user.id, { type: type as "daily-reminder", ...payload, url: "/" });
  res.json(result);
});

app.use(
  createRequestHandler({
    build: () => import("virtual:react-router/server-build"),
    async getLoadContext(req) {
      const session = await auth.api.getSession({
        headers: new Headers(req.headers as Record<string, string>),
      });
      if (!session?.user) return { user: null };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = session.user as any;
      const storedTz: string | null = u.timezone ?? null;
      const webReq = new Request(`http://localhost${req.url}`, {
        headers: new Headers(req.headers as Record<string, string>),
      });
      const cookieTz = parseTzCookie(webReq);

      if (cookieTz && cookieTz !== storedTz) {
        await db
          .update(userTable)
          .set({ timezone: cookieTz })
          .where(eq(userTable.id, u.id));
      }

      return {
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          username: u.username ?? null,
          isAnonymous: u.isAnonymous ?? false,
          timezone: cookieTz ?? storedTz,
        },
      };
    },
  })
);

if (process.env.NODE_ENV !== "test") {
  // Daily reminder — runs every 30 min and notifies each user near noon in
  // their own local timezone (getReminderTargets does the per-user windowing).
  cron.schedule("0,30 * * * *", async () => {
    await sendDailyReminders();
  });

  // Celestial event check at midnight UTC
  cron.schedule("0 0 * * *", async () => {
    const events = getUpcomingCelestialEvents(DateTime.utc(), 1);
    for (const event of events) {
      await sendCelestialNotification(event.event);
    }
  });
}
