import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { DateTime } from "luxon";
import { db } from "../db/index.js";
import { user } from "../db/schema/auth.js";
import { cards } from "../db/schema/cards.js";
import { userCards } from "../db/schema/user-cards.js";
import { pushSubscriptions } from "../db/schema/push-subscriptions.js";
import { getReminderTargets } from "../app/lib/reminder-targets.js";

const CARD_ID = 0;
// 16:00 UTC. In June this is 12:00 in America/New_York (EDT, UTC-4).
const NOW = DateTime.fromISO("2026-06-12T16:00:00", { zone: "utc" });
const NY = "America/New_York";

beforeAll(async () => {
  await db.insert(cards).values({ id: CARD_ID, name: "The Fool" }).onConflictDoNothing();
});

async function createTestUser(id: string, timezone: string | null) {
  await db.insert(user).values({
    id,
    name: `User ${id.slice(0, 8)}`,
    email: `${id}@test.invalid`,
    emailVerified: false,
    timezone,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function createSub(userId: string) {
  await db.insert(pushSubscriptions).values({
    userId,
    endpoint: `https://push.test/${userId}`,
    p256dh: "key",
    auth: "auth",
  });
}

async function createPull(userId: string, pullDate: string) {
  await db
    .insert(userCards)
    .values({ userId, cardId: CARD_ID, rarityScore: 1, isRadiant: false, isReversed: false, pullDate });
}

async function cleanup(...ids: string[]) {
  for (const id of ids) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, id));
    await db.delete(userCards).where(eq(userCards.userId, id));
    await db.delete(user).where(eq(user.id, id));
  }
}

describe("getReminderTargets", () => {
  let inWindow: string;
  let outWindow: string;
  let pulled: string;
  let noSub: string;

  beforeEach(async () => {
    inWindow = `test-in-${randomUUID()}`;
    outWindow = `test-out-${randomUUID()}`;
    pulled = `test-pulled-${randomUUID()}`;
    noSub = `test-nosub-${randomUUID()}`;
    await createTestUser(inWindow, NY);
    await createTestUser(outWindow, "UTC"); // 16:00 local → not noon
    await createTestUser(pulled, NY);
    await createTestUser(noSub, NY);
    await createSub(inWindow);
    await createSub(outWindow);
    await createSub(pulled);
    await createPull(pulled, "2026-06-12"); // NY local today at NOW
  });

  afterEach(async () => {
    await cleanup(inWindow, outWindow, pulled, noSub);
  });

  it("targets a subscribed user whose local time is in the noon window and hasn't pulled", async () => {
    const targets = await getReminderTargets(NOW);
    expect(targets).toContain(inWindow);
  });

  it("excludes a user whose local time is outside the noon window", async () => {
    const targets = await getReminderTargets(NOW);
    expect(targets).not.toContain(outWindow);
  });

  it("excludes a user who has already pulled their local today", async () => {
    const targets = await getReminderTargets(NOW);
    expect(targets).not.toContain(pulled);
  });

  it("excludes a user with no push subscription", async () => {
    const targets = await getReminderTargets(NOW);
    expect(targets).not.toContain(noSub);
  });
});
