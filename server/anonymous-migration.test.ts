import { describe, it, expect, beforeEach, afterEach, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import { user } from "../db/schema/auth.js";
import { cards } from "../db/schema/cards.js";
import { userCards } from "../db/schema/user-cards.js";
import { migrateAnonymousPulls } from "./anonymous-migration.js";

const TEST_CARD_ID = 0;
const DATE_A = "2026-05-22";
const DATE_B = "2026-05-23";
const DATE_C = "2026-05-24";

beforeAll(async () => {
  await db
    .insert(cards)
    .values({ id: TEST_CARD_ID, name: "The Fool" })
    .onConflictDoNothing();
});

async function createTestUser(id: string, isAnonymous = false) {
  await db.insert(user).values({
    id,
    name: isAnonymous ? "Anonymous" : `User ${id.slice(0, 8)}`,
    email: `${id}@test.invalid`,
    emailVerified: false,
    isAnonymous,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function createPull(userId: string, pullDate: string, pulledAt: Date) {
  const [row] = await db
    .insert(userCards)
    .values({
      userId,
      cardId: TEST_CARD_ID,
      rarityScore: 1,
      isRadiant: false,
      isReversed: false,
      pullDate,
      pulledAt,
    })
    .returning();
  return row;
}

async function getPullsFor(userId: string) {
  return db.select().from(userCards).where(eq(userCards.userId, userId));
}

async function cleanup(...ids: string[]) {
  for (const id of ids) {
    await db.delete(userCards).where(eq(userCards.userId, id));
    await db.delete(user).where(eq(user.id, id));
  }
}

describe("migrateAnonymousPulls", () => {
  let anonId: string;
  let userId: string;

  beforeEach(async () => {
    anonId = `test-anon-${randomUUID()}`;
    userId = `test-user-${randomUUID()}`;
    await createTestUser(anonId, true);
    await createTestUser(userId, false);
  });

  afterEach(async () => {
    await cleanup(anonId, userId);
  });

  it("transfers anonymous pull to new user when new user has no prior pulls", async () => {
    const anonPull = await createPull(anonId, DATE_C, new Date("2026-05-24T10:00:00Z"));

    await migrateAnonymousPulls(anonId, userId);

    const userPulls = await getPullsFor(userId);
    const anonPulls = await getPullsFor(anonId);

    expect(userPulls).toHaveLength(1);
    expect(userPulls[0].id).toBe(anonPull.id);
    expect(anonPulls).toHaveLength(0);
  });

  it("transfers anonymous pull to existing user when existing user has no pull for that day", async () => {
    // Existing user has a pull on a different day
    const existingPull = await createPull(userId, DATE_B, new Date("2026-05-23T09:00:00Z"));
    const anonPull = await createPull(anonId, DATE_C, new Date("2026-05-24T10:00:00Z"));

    await migrateAnonymousPulls(anonId, userId);

    const userPulls = await getPullsFor(userId);
    const anonPulls = await getPullsFor(anonId);

    expect(userPulls).toHaveLength(2);
    const pulledIds = userPulls.map((p) => p.id);
    expect(pulledIds).toContain(existingPull.id);
    expect(pulledIds).toContain(anonPull.id);
    expect(anonPulls).toHaveLength(0);
  });

  it("keeps the anonymous pull when there is a same-day conflict and the anonymous pull was earlier", async () => {
    const anonPull = await createPull(anonId, DATE_C, new Date("2026-05-24T08:00:00Z"));
    await createPull(userId, DATE_C, new Date("2026-05-24T14:00:00Z"));

    await migrateAnonymousPulls(anonId, userId);

    const userPulls = await getPullsFor(userId);
    const anonPulls = await getPullsFor(anonId);

    expect(userPulls).toHaveLength(1);
    expect(userPulls[0].id).toBe(anonPull.id);
    expect(anonPulls).toHaveLength(0);
  });

  it("keeps the existing user pull when there is a same-day conflict and the existing user pull was earlier", async () => {
    const existingPull = await createPull(userId, DATE_C, new Date("2026-05-24T08:00:00Z"));
    await createPull(anonId, DATE_C, new Date("2026-05-24T14:00:00Z"));

    await migrateAnonymousPulls(anonId, userId);

    const userPulls = await getPullsFor(userId);
    const anonPulls = await getPullsFor(anonId);

    expect(userPulls).toHaveLength(1);
    expect(userPulls[0].id).toBe(existingPull.id);
    expect(anonPulls).toHaveLength(0);
  });

  it("handles multiple anonymous pulls across different dates, all transferred when no conflicts", async () => {
    await createPull(anonId, DATE_A, new Date("2026-05-22T10:00:00Z"));
    await createPull(anonId, DATE_B, new Date("2026-05-23T10:00:00Z"));
    await createPull(anonId, DATE_C, new Date("2026-05-24T10:00:00Z"));

    await migrateAnonymousPulls(anonId, userId);

    const userPulls = await getPullsFor(userId);
    const anonPulls = await getPullsFor(anonId);

    expect(userPulls).toHaveLength(3);
    expect(anonPulls).toHaveLength(0);
  });

  it("handles mixed conflicts: transfers non-conflicting pulls and applies earliest-wins to conflicting ones", async () => {
    // Date A: anon is earlier → anon pull wins
    const anonEarlier = await createPull(anonId, DATE_A, new Date("2026-05-22T06:00:00Z"));
    await createPull(userId, DATE_A, new Date("2026-05-22T18:00:00Z"));
    // Date B: existing user is earlier → existing pull wins
    const existingEarlier = await createPull(userId, DATE_B, new Date("2026-05-23T06:00:00Z"));
    await createPull(anonId, DATE_B, new Date("2026-05-23T18:00:00Z"));
    // Date C: no conflict on user side → anon pull transferred
    const anonOnly = await createPull(anonId, DATE_C, new Date("2026-05-24T10:00:00Z"));

    await migrateAnonymousPulls(anonId, userId);

    const userPulls = await getPullsFor(userId);
    const anonPulls = await getPullsFor(anonId);

    expect(anonPulls).toHaveLength(0);
    expect(userPulls).toHaveLength(3);
    const pulledIds = userPulls.map((p) => p.id);
    expect(pulledIds).toContain(anonEarlier.id);
    expect(pulledIds).toContain(existingEarlier.id);
    expect(pulledIds).toContain(anonOnly.id);
  });
});
