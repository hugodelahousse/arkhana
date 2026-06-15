import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import { user } from "../db/schema/auth.js";
import { follows } from "../db/schema/follows.js";
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowingIds,
  getFollowCounts,
  getFollowers,
  getFollowing,
  resolveFollowTarget,
} from "../app/lib/follows.js";

async function createTestUser(id: string) {
  const handle = `u_${id.slice(0, 8)}`;
  await db.insert(user).values({
    id,
    name: `User ${id.slice(0, 8)}`,
    email: `${id}@test.invalid`,
    emailVerified: false,
    username: handle,
    displayUsername: handle,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

async function cleanup(...ids: string[]) {
  for (const id of ids) {
    await db.delete(follows).where(eq(follows.followerId, id));
    await db.delete(follows).where(eq(follows.followingId, id));
    await db.delete(user).where(eq(user.id, id));
  }
}

describe("follows graph ops", () => {
  let alice: string;
  let bob: string;
  let carol: string;

  beforeEach(async () => {
    alice = `test-a-${randomUUID()}`;
    bob = `test-b-${randomUUID()}`;
    carol = `test-c-${randomUUID()}`;
    await createTestUser(alice);
    await createTestUser(bob);
    await createTestUser(carol);
  });

  afterEach(async () => {
    await cleanup(alice, bob, carol);
  });

  it("followUser creates a follow that isFollowing reports", async () => {
    expect(await isFollowing(alice, bob)).toBe(false);
    await followUser(alice, bob);
    expect(await isFollowing(alice, bob)).toBe(true);
    // asymmetric: bob does not follow alice
    expect(await isFollowing(bob, alice)).toBe(false);
  });

  it("followUser is idempotent (no error, single row)", async () => {
    await followUser(alice, bob);
    await followUser(alice, bob);
    const rows = await db
      .select()
      .from(follows)
      .where(eq(follows.followerId, alice));
    expect(rows).toHaveLength(1);
  });

  it("followUser rejects self-follow", async () => {
    await expect(followUser(alice, alice)).rejects.toThrow();
    const rows = await db
      .select()
      .from(follows)
      .where(eq(follows.followerId, alice));
    expect(rows).toHaveLength(0);
  });

  it("unfollowUser removes the follow", async () => {
    await followUser(alice, bob);
    await unfollowUser(alice, bob);
    expect(await isFollowing(alice, bob)).toBe(false);
  });

  it("getFollowingIds returns the ids the user follows", async () => {
    await followUser(alice, bob);
    await followUser(alice, carol);
    const ids = await getFollowingIds(alice);
    expect(ids.sort()).toEqual([bob, carol].sort());
  });

  it("getFollowCounts counts followers and following", async () => {
    await followUser(alice, bob); // alice→bob
    await followUser(carol, bob); // carol→bob
    await followUser(bob, alice); // bob→alice
    const bobCounts = await getFollowCounts(bob);
    expect(bobCounts).toEqual({ followers: 2, following: 1 });
  });

  it("getFollowers lists followers and flags follow-back", async () => {
    await followUser(bob, alice); // bob follows alice
    await followUser(carol, alice); // carol follows alice
    await followUser(alice, bob); // alice follows bob back (but not carol)

    const followers = await getFollowers(alice);
    const byId = Object.fromEntries(followers.map((f) => [f.id, f]));
    expect(Object.keys(byId).sort()).toEqual([bob, carol].sort());
    expect(byId[bob].isFollowingBack).toBe(true);
    expect(byId[carol].isFollowingBack).toBe(false);
    expect(byId[bob].username).toBe(`u_${bob.slice(0, 8)}`);
  });

  it("getFollowing lists the users a user follows", async () => {
    await followUser(alice, bob);
    await followUser(alice, carol);
    const following = await getFollowing(alice);
    expect(following.map((f) => f.id).sort()).toEqual([bob, carol].sort());
  });

  it("resolveFollowTarget resolves an existing other user by username", async () => {
    const res = await resolveFollowTarget(alice, `u_${bob.slice(0, 8)}`);
    expect(res).toEqual({ status: "ok", targetId: bob });
  });

  it("resolveFollowTarget is case-insensitive on username", async () => {
    const res = await resolveFollowTarget(alice, `U_${bob.slice(0, 8)}`.toUpperCase());
    expect(res).toEqual({ status: "ok", targetId: bob });
  });

  it("resolveFollowTarget returns not_found for an unknown username", async () => {
    const res = await resolveFollowTarget(alice, "definitely-not-a-real-handle-xyz");
    expect(res).toEqual({ status: "not_found" });
  });

  it("resolveFollowTarget returns self when targeting your own username", async () => {
    const res = await resolveFollowTarget(alice, `u_${alice.slice(0, 8)}`);
    expect(res).toEqual({ status: "self" });
  });

  it("resolveFollowTarget rejects an anonymous target (temp-* users are not followable)", async () => {
    const anonId = `test-anon-${randomUUID()}`;
    const anonHandle = `temp-${anonId.slice(5, 13)}`;
    await db.insert(user).values({
      id: anonId,
      name: "Anonymous",
      email: `${anonId}@test.invalid`,
      emailVerified: false,
      isAnonymous: true,
      username: anonHandle,
      displayUsername: anonHandle,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    try {
      const res = await resolveFollowTarget(alice, anonHandle);
      expect(res).toEqual({ status: "not_found" });
    } finally {
      await db.delete(user).where(eq(user.id, anonId));
    }
  });

  it("cascades: deleting a user removes their follow rows", async () => {
    await followUser(alice, bob); // alice as follower
    await followUser(carol, alice); // alice as following
    await db.delete(user).where(eq(user.id, alice));
    const asFollower = await db
      .select()
      .from(follows)
      .where(eq(follows.followerId, alice));
    const asFollowing = await db
      .select()
      .from(follows)
      .where(eq(follows.followingId, alice));
    expect(asFollower).toHaveLength(0);
    expect(asFollowing).toHaveLength(0);
  });
});
