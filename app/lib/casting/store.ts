// Lab: casting vote. Data access for the /lab/casting routes (server only).
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "../../../db/index.js";
import {
  labCastingDecks,
  labCastingProposals,
  labCastingRankings,
} from "../../../db/schema/lab-casting.js";
import { CASTING_LIMITS } from "./tally";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const newDeckId = customAlphabet(alphabet, 24); // the URL is the access key
const newProposalId = customAlphabet(alphabet, 16);

export const isDeckId = (id: string | undefined): id is string => !!id && /^[a-z0-9]{24}$/.test(id);

/** Who may propose and rank: a real account, not an anonymous pull session. */
export function voter(u: { id: string; isAnonymous: boolean } | null) {
  return u && !u.isAnonymous ? u : null;
}

export async function createCastingDeck(ownerId: string, title: string, theme: string) {
  const id = newDeckId();
  await db.insert(labCastingDecks).values({ id, ownerId, title, theme });
  return id;
}

export async function getCastingDeck(id: string) {
  const [deck] = await db.select().from(labCastingDecks).where(eq(labCastingDecks.id, id));
  return deck ?? null;
}

export async function updateCastingDeck(id: string, patch: { title: string; theme: string }) {
  await db.update(labCastingDecks).set(patch).where(eq(labCastingDecks.id, id));
}

export async function deleteCastingDeck(id: string) {
  await db.delete(labCastingDecks).where(eq(labCastingDecks.id, id));
}

/** Decks the user owns, has proposed in or has ranked in, newest first. */
export async function listCastingDecksFor(userId: string) {
  const [owned, proposed, ranked] = await Promise.all([
    db
      .select({ id: labCastingDecks.id })
      .from(labCastingDecks)
      .where(eq(labCastingDecks.ownerId, userId)),
    db
      .selectDistinct({ id: labCastingProposals.deckId })
      .from(labCastingProposals)
      .where(eq(labCastingProposals.proposerId, userId)),
    db
      .selectDistinct({ id: labCastingRankings.deckId })
      .from(labCastingRankings)
      .where(eq(labCastingRankings.userId, userId)),
  ]);
  const ids = [...new Set([...owned, ...proposed, ...ranked].map((r) => r.id))];
  if (ids.length === 0) return [];
  const decks = await db
    .select()
    .from(labCastingDecks)
    .where(inArray(labCastingDecks.id, ids))
    .orderBy(desc(labCastingDecks.createdAt));
  return decks.map((d) => ({
    id: d.id,
    title: d.title,
    theme: d.theme,
    mine: d.ownerId === userId,
  }));
}

/** Every proposal and ballot in a deck (22 cards at most, lab scale). */
export async function getDeckVotes(deckId: string) {
  const [proposals, rankings] = await Promise.all([
    db
      .select({
        id: labCastingProposals.id,
        cardId: labCastingProposals.cardId,
        name: labCastingProposals.name,
      })
      .from(labCastingProposals)
      .where(eq(labCastingProposals.deckId, deckId))
      .orderBy(asc(labCastingProposals.createdAt), asc(labCastingProposals.id)),
    db
      .select({
        cardId: labCastingRankings.cardId,
        userId: labCastingRankings.userId,
        order: labCastingRankings.order,
      })
      .from(labCastingRankings)
      .where(eq(labCastingRankings.deckId, deckId)),
  ]);
  return { proposals, rankings };
}

export async function getCardVotes(deckId: string, cardId: number) {
  const [proposals, rankings] = await Promise.all([
    db
      .select({
        id: labCastingProposals.id,
        name: labCastingProposals.name,
        pitch: labCastingProposals.pitch,
        proposerId: labCastingProposals.proposerId,
      })
      .from(labCastingProposals)
      .where(and(eq(labCastingProposals.deckId, deckId), eq(labCastingProposals.cardId, cardId)))
      .orderBy(asc(labCastingProposals.createdAt), asc(labCastingProposals.id)),
    db
      .select({ userId: labCastingRankings.userId, order: labCastingRankings.order })
      .from(labCastingRankings)
      .where(and(eq(labCastingRankings.deckId, deckId), eq(labCastingRankings.cardId, cardId))),
  ]);
  return { proposals, rankings };
}

export type ProposalResult = { ok: true } | { ok: false; error: string };

export async function addProposal(input: {
  deckId: string;
  cardId: number;
  proposerId: string;
  name: string;
  pitch: string;
}): Promise<ProposalResult> {
  const existing = await db
    .select({ name: labCastingProposals.name })
    .from(labCastingProposals)
    .where(
      and(
        eq(labCastingProposals.deckId, input.deckId),
        eq(labCastingProposals.cardId, input.cardId)
      )
    );
  if (existing.length >= CASTING_LIMITS.proposalsPerCard)
    return { ok: false, error: "This card has as many proposals as it can take." };
  const wanted = input.name.toLocaleLowerCase();
  if (existing.some((p) => p.name.toLocaleLowerCase() === wanted))
    return { ok: false, error: `${input.name} is already proposed for this card.` };
  await db.insert(labCastingProposals).values({ id: newProposalId(), ...input });
  return { ok: true };
}

/** Renames a proposal or rewrites its pitch, if the user proposed it or owns the deck. */
export async function editProposal(input: {
  deckId: string;
  cardId: number;
  proposalId: string;
  userId: string;
  isOwner: boolean;
  name: string;
  pitch: string;
}): Promise<ProposalResult> {
  const onCard = and(
    eq(labCastingProposals.deckId, input.deckId),
    eq(labCastingProposals.cardId, input.cardId)
  );
  const existing = await db
    .select({ id: labCastingProposals.id, name: labCastingProposals.name })
    .from(labCastingProposals)
    .where(onCard);
  const wanted = input.name.toLocaleLowerCase();
  if (existing.some((p) => p.id !== input.proposalId && p.name.toLocaleLowerCase() === wanted))
    return { ok: false, error: `${input.name} is already proposed for this card.` };
  const mine = input.isOwner ? [] : [eq(labCastingProposals.proposerId, input.userId)];
  const updated = await db
    .update(labCastingProposals)
    .set({ name: input.name, pitch: input.pitch })
    .where(and(eq(labCastingProposals.id, input.proposalId), onCard, ...mine))
    .returning({ id: labCastingProposals.id });
  return updated.length > 0
    ? { ok: true }
    : { ok: false, error: "You can only edit your own proposals." };
}

/** Removes a proposal if the user proposed it or owns the deck. */
export async function deleteProposal(input: {
  deckId: string;
  cardId: number;
  proposalId: string;
  userId: string;
  isOwner: boolean;
}): Promise<boolean> {
  const mine = input.isOwner ? [] : [eq(labCastingProposals.proposerId, input.userId)];
  const removed = await db
    .delete(labCastingProposals)
    .where(
      and(
        eq(labCastingProposals.id, input.proposalId),
        eq(labCastingProposals.deckId, input.deckId),
        eq(labCastingProposals.cardId, input.cardId),
        ...mine
      )
    )
    .returning({ id: labCastingProposals.id });
  return removed.length > 0;
}

/** Saves a voter's stack rank for a card, keeping only ids that are proposals on it. */
export async function saveRanking(input: {
  deckId: string;
  cardId: number;
  userId: string;
  order: string[];
}) {
  const rows = await db
    .select({ id: labCastingProposals.id })
    .from(labCastingProposals)
    .where(
      and(
        eq(labCastingProposals.deckId, input.deckId),
        eq(labCastingProposals.cardId, input.cardId)
      )
    );
  const known = new Set(rows.map((r) => r.id));
  const order = [...new Set(input.order)].filter((id) => known.has(id));
  const { deckId, cardId, userId } = input;
  await db
    .insert(labCastingRankings)
    .values({ deckId, cardId, userId, order })
    .onConflictDoUpdate({
      target: [labCastingRankings.deckId, labCastingRankings.cardId, labCastingRankings.userId],
      set: { order, updatedAt: new Date() },
    });
}
