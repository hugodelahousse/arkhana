import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { DateTime } from "luxon";
import { db } from "../db/index.js";
import { user } from "../db/schema/auth.js";
import { cards } from "../db/schema/cards.js";
import { userCards } from "../db/schema/user-cards.js";
import { follows } from "../db/schema/follows.js";
import { getCircleRace, getRaceForUsernames } from "../app/lib/race.js";

const CARD_A = 0;
const CARD_B = 1;

beforeAll(async () => {
  await db
    .insert(cards)
    .values([
      { id: CARD_A, name: "The Fool" },
      { id: CARD_B, name: "The Magician" },
    ])
    .onConflictDoNothing();
});

async function createTestUser(
  id: string,
  opts: { isAnonymous?: boolean } = {}
): Promise<string> {
  const handle = `u_${id.slice(0, 13).replace(/-/g, "")}`;
  await db.insert(user).values({
    id,
    name: `User ${id.slice(0, 8)}`,
    email: `${id}@test.invalid`,
    emailVerified: false,
    username: handle,
    displayUsername: handle,
    isAnonymous: opts.isAnonymous ?? false,
    timezone: "UTC",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return handle;
}

async function createPull(userId: string, pullDate: string, cardId = CARD_A) {
  await db.insert(userCards).values({
    userId,
    cardId,
    rarityScore: 2,
    isRadiant: false,
    isReversed: false,
    pullDate,
  });
}

function daysAgo(n: number): string {
  return DateTime.utc().minus({ days: n }).toISODate()!;
}

async function cleanup(...ids: string[]) {
  for (const id of ids) {
    await db.delete(follows).where(eq(follows.followerId, id));
    await db.delete(follows).where(eq(follows.followingId, id));
    await db.delete(userCards).where(eq(userCards.userId, id));
    await db.delete(user).where(eq(user.id, id));
  }
}

describe("getRaceForUsernames", () => {
  let viewer: string;
  let alpha: string;
  let beta: string;
  let anon: string;
  let viewerHandle: string;
  let alphaHandle: string;
  let betaHandle: string;
  let anonHandle: string;

  beforeEach(async () => {
    viewer = `test-v-${randomUUID()}`;
    alpha = `test-a-${randomUUID()}`;
    beta = `test-b-${randomUUID()}`;
    anon = `test-n-${randomUUID()}`;
    viewerHandle = await createTestUser(viewer);
    alphaHandle = await createTestUser(alpha);
    betaHandle = await createTestUser(beta);
    anonHandle = await createTestUser(anon, { isAnonymous: true });
  });

  afterEach(async () => {
    await cleanup(viewer, alpha, beta, anon);
  });

  it("returns exactly the listed users, not the viewer's circle", async () => {
    await db.insert(follows).values({ followerId: viewer, followingId: beta });
    await createPull(alpha, daysAgo(1));

    const race = await getRaceForUsernames(viewer, [alphaHandle]);
    expect(race.runners.map((r) => r.id)).toEqual([alpha]);
    expect(race.runners[0].isViewer).toBe(false);
  });

  it("matches usernames case-insensitively and drops unknown names", async () => {
    const race = await getRaceForUsernames(viewer, [
      alphaHandle.toUpperCase(),
      "does-not-exist",
    ]);
    expect(race.runners.map((r) => r.id)).toEqual([alpha]);
  });

  it("excludes anonymous accounts", async () => {
    const race = await getRaceForUsernames(viewer, [anonHandle, alphaHandle]);
    expect(race.runners.map((r) => r.id)).toEqual([alpha]);
  });

  it("puts the viewer first (flagged) when their own username is listed", async () => {
    const race = await getRaceForUsernames(viewer, [betaHandle, viewerHandle]);
    expect(race.runners.map((r) => r.id)).toEqual([viewer, beta]);
    expect(race.runners[0].isViewer).toBe(true);
    expect(race.runners[1].isViewer).toBe(false);
  });

  it("returns an empty race when nothing resolves", async () => {
    const race = await getRaceForUsernames(viewer, ["does-not-exist", " ", ""]);
    expect(race.runners).toEqual([]);
    expect(race.days).toBe(1);
  });

  it("counts distinct cards cumulatively across daily and duplicate pulls", async () => {
    await createPull(alpha, daysAgo(2), CARD_A);
    await createPull(alpha, daysAgo(1), CARD_A); // duplicate — no rise
    await createPull(alpha, daysAgo(0), CARD_B);

    const race = await getRaceForUsernames(viewer, [alphaHandle]);
    const runner = race.runners[0];
    expect(runner.total).toBe(2);
    expect(runner.pullDays).toBe(3);
    expect(runner.pulls.map((p) => p.count)).toEqual([1, 1, 2]);
    expect(runner.pulls.map((p) => p.gained)).toEqual([1, 0, 1]);
  });
});

describe("getCircleRace (focus-refactor regression)", () => {
  let viewer: string;
  let friend: string;

  beforeEach(async () => {
    viewer = `test-v-${randomUUID()}`;
    friend = `test-f-${randomUUID()}`;
    await createTestUser(viewer);
    await createTestUser(friend);
    await db.insert(follows).values({ followerId: viewer, followingId: friend });
  });

  afterEach(async () => {
    await cleanup(viewer, friend);
  });

  it("still returns viewer first plus followed users", async () => {
    await createPull(friend, daysAgo(1));
    const race = await getCircleRace(viewer);
    expect(race.runners.map((r) => r.id)).toEqual([viewer, friend]);
    expect(race.runners[0].isViewer).toBe(true);
    expect(race.runners[1].total).toBe(1);
  });
});
