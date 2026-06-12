import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { DateTime } from "luxon";
import { db } from "../db/index.js";
import { user } from "../db/schema/auth.js";
import { cards } from "../db/schema/cards.js";
import { userCards } from "../db/schema/user-cards.js";
import { follows } from "../db/schema/follows.js";
import { followUser } from "../app/lib/follows.js";
import { getCircleDailyPulls } from "../app/lib/follows.js";

const CARD_ID = 0;

beforeAll(async () => {
  await db.insert(cards).values({ id: CARD_ID, name: "The Fool" }).onConflictDoNothing();
});

async function createTestUser(id: string, timezone: string | null = null) {
  const handle = `u_${id.slice(0, 8)}`;
  await db.insert(user).values({
    id,
    name: `User ${id.slice(0, 8)}`,
    email: `${id}@test.invalid`,
    emailVerified: false,
    username: handle,
    displayUsername: handle,
    timezone,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function createPull(userId: string, pullDate: string, rarityScore = 3) {
  const [row] = await db
    .insert(userCards)
    .values({ userId, cardId: CARD_ID, rarityScore, isRadiant: false, isReversed: false, pullDate })
    .returning();
  return row;
}

function localToday(tz: string): string {
  return DateTime.now().setZone(tz).toISODate()!;
}
function localYesterday(tz: string): string {
  return DateTime.now().setZone(tz).minus({ days: 1 }).toISODate()!;
}

async function cleanup(...ids: string[]) {
  for (const id of ids) {
    await db.delete(follows).where(eq(follows.followerId, id));
    await db.delete(follows).where(eq(follows.followingId, id));
    await db.delete(userCards).where(eq(userCards.userId, id));
    await db.delete(user).where(eq(user.id, id));
  }
}

describe("getCircleDailyPulls", () => {
  let viewer: string;
  let east: string; // far-east timezone
  let west: string; // far-west timezone
  let stranger: string;

  beforeEach(async () => {
    viewer = `test-v-${randomUUID()}`;
    east = `test-e-${randomUUID()}`;
    west = `test-w-${randomUUID()}`;
    stranger = `test-s-${randomUUID()}`;
    await createTestUser(viewer, "America/New_York");
    await createTestUser(east, "Pacific/Kiritimati"); // UTC+14
    await createTestUser(west, "Pacific/Pago_Pago"); // UTC-11
    await createTestUser(stranger, "UTC");
  });

  afterEach(async () => {
    await cleanup(viewer, east, west, stranger);
  });

  it("returns an empty array when the viewer follows nobody", async () => {
    expect(await getCircleDailyPulls(viewer)).toEqual([]);
  });

  it("includes a followed user's pull dated their local today", async () => {
    await followUser(viewer, east);
    const pull = await createPull(east, localToday("Pacific/Kiritimati"), 4);

    const feed = await getCircleDailyPulls(viewer);
    expect(feed).toHaveLength(1);
    expect(feed[0].user.id).toBe(east);
    expect(feed[0].pull?.id).toBe(pull.id);
    expect(feed[0].pull?.cardId).toBe(CARD_ID);
    expect(feed[0].pull?.rarityScore).toBe(4);
  });

  it("returns a null pull (placeholder) when the followed user has not drawn their local today", async () => {
    await followUser(viewer, east);
    // only an older pull exists
    await createPull(east, localYesterday("Pacific/Kiritimati"));

    const feed = await getCircleDailyPulls(viewer);
    expect(feed).toHaveLength(1);
    expect(feed[0].user.id).toBe(east);
    expect(feed[0].pull).toBeNull();
  });

  it("uses each followed user's own timezone to determine 'today'", async () => {
    await followUser(viewer, east);
    await followUser(viewer, west);
    const eastPull = await createPull(east, localToday("Pacific/Kiritimati"));
    const westPull = await createPull(west, localToday("Pacific/Pago_Pago"));

    const feed = await getCircleDailyPulls(viewer);
    const byId = Object.fromEntries(feed.map((e) => [e.user.id, e]));
    expect(byId[east].pull?.id).toBe(eastPull.id);
    expect(byId[west].pull?.id).toBe(westPull.id);
  });

  it("excludes users the viewer does not follow", async () => {
    await followUser(viewer, east);
    await createPull(stranger, localToday("UTC"));
    const feed = await getCircleDailyPulls(viewer);
    expect(feed.map((e) => e.user.id)).not.toContain(stranger);
  });

  it("orders users who have drawn before users who have not", async () => {
    await followUser(viewer, east);
    await followUser(viewer, west);
    // only west has drawn today
    await createPull(west, localToday("Pacific/Pago_Pago"));

    const feed = await getCircleDailyPulls(viewer);
    expect(feed).toHaveLength(2);
    expect(feed[0].user.id).toBe(west);
    expect(feed[0].pull).not.toBeNull();
    expect(feed[1].pull).toBeNull();
  });
});
