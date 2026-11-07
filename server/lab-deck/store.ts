// Data access + local file storage + budget for the lab deck builder.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { db } from "../../db/index.js";
import {
  labDeckCards,
  labDeckCast,
  labDeckImages,
  labDeckLedger,
  labDecks,
} from "../../db/schema/lab-deck.js";
import { config } from "../../config/index.js";
import { PRESET_BY_ID } from "../../app/lib/deck/presets.js";
import { MAJOR_IDS, traditionalName } from "../../app/lib/deck/prompts.js";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
export const newDeckId = customAlphabet(alphabet, 24); // the URL is the access key
export const newId = customAlphabet(alphabet, 16);

// ── Files ────────────────────────────────────────────────────────────────

const DATA_DIR = path.resolve(config.labDeckDataDir);
const PUBLIC_DIR = path.resolve("public");

export function deckDir(deckId: string) {
  if (!/^[a-z0-9]+$/.test(deckId)) throw new Error("bad deck id");
  return path.join(DATA_DIR, deckId);
}

export async function saveFile(deckId: string, file: string, data: Buffer) {
  const dir = deckDir(deckId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, file), data);
}

export function filePath(deckId: string, file: string) {
  if (!/^[a-z0-9]+\.(jpg|jpeg|png|webp)$/.test(file)) throw new Error("bad file name");
  return path.join(deckDir(deckId), file);
}

/** A reference id is either an image row id, or "preset:<presetId>" for a shipped anchor. */
export async function readRef(deckId: string, refId: string): Promise<{ data: Buffer; name: string; mime: string }> {
  if (refId.startsWith("preset:")) {
    const preset = PRESET_BY_ID[refId.slice(7)];
    if (!preset) throw new Error(`unknown preset ${refId}`);
    const p = path.join(PUBLIC_DIR, preset.anchorUrl);
    return { data: await readFile(p), name: path.basename(p), mime: "image/jpeg" };
  }
  const [img] = await db
    .select()
    .from(labDeckImages)
    .where(and(eq(labDeckImages.id, refId), eq(labDeckImages.deckId, deckId)));
  if (!img?.file) throw new Error(`reference ${refId} not available`);
  const mime = img.file.endsWith(".png") ? "image/png" : img.file.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return { data: await readFile(filePath(deckId, img.file)), name: img.file, mime };
}

export function imageUrl(deckId: string, file: string | null) {
  // ?v= busts browser caches that stored an earlier failed response.
  return file ? `/api/lab-deck/files/${deckId}/${file}?v=2` : null;
}

// ── Decks ────────────────────────────────────────────────────────────────

export async function createDeck(ownerId: string) {
  const id = newDeckId();
  await db.insert(labDecks).values({ id, ownerId });
  await db.insert(labDeckCards).values(MAJOR_IDS.map((cardId) => ({ deckId: id, cardId, name: traditionalName(cardId) })));
  return id;
}

export async function getDeck(deckId: string) {
  const [deck] = await db.select().from(labDecks).where(eq(labDecks.id, deckId));
  return deck ?? null;
}

export async function touchDeck(deckId: string, patch: Partial<typeof labDecks.$inferInsert>) {
  await db
    .update(labDecks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(labDecks.id, deckId));
}

export async function getDeckState(deckId: string) {
  const deck = await getDeck(deckId);
  if (!deck) return null;
  const [cards, cast, images, spent] = await Promise.all([
    db.select().from(labDeckCards).where(eq(labDeckCards.deckId, deckId)).orderBy(asc(labDeckCards.cardId)),
    db.select().from(labDeckCast).where(eq(labDeckCast.deckId, deckId)).orderBy(asc(labDeckCast.createdAt)),
    db.select().from(labDeckImages).where(eq(labDeckImages.deckId, deckId)).orderBy(desc(labDeckImages.createdAt)),
    spentMicros(deckId),
  ]);
  return {
    deck: { ...deck, messages: undefined },
    messages: deck.messages,
    cards,
    cast,
    images: images.map((i) => ({ ...i, url: imageUrl(deckId, i.file) })),
    budget: { spentMicros: spent, reservedMicros: reservedMicros(deckId), budgetMicros: deck.budgetMicros },
  };
}
export type DeckState = NonNullable<Awaited<ReturnType<typeof getDeckState>>>;

// ── Budget & ledger ──────────────────────────────────────────────────────
// Reservations are held in memory while calls are in flight, so concurrent
// jobs can't jointly overshoot the hard cap.

const reservations = new Map<string, number>();
export const reservedMicros = (deckId: string) => reservations.get(deckId) ?? 0;

export async function spentMicros(deckId: string) {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${labDeckLedger.costMicros}), 0)::int` })
    .from(labDeckLedger)
    .where(eq(labDeckLedger.deckId, deckId));
  return Number(row?.total ?? 0);
}

export class BudgetError extends Error {
  constructor(public needMicros: number, public availableMicros: number) {
    super("Deck budget exceeded");
  }
}

/** Reserve `micros` against the deck budget or throw BudgetError. Returns a release fn. */
export async function reserve(deckId: string, micros: number): Promise<() => void> {
  const deck = await getDeck(deckId);
  if (!deck) throw new Error("deck not found");
  const available = deck.budgetMicros - (await spentMicros(deckId)) - reservedMicros(deckId);
  if (micros > available) throw new BudgetError(micros, Math.max(0, available));
  reservations.set(deckId, reservedMicros(deckId) + micros);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    reservations.set(deckId, Math.max(0, reservedMicros(deckId) - micros));
  };
}

export async function recordLedger(entry: typeof labDeckLedger.$inferInsert) {
  await db.insert(labDeckLedger).values(entry);
}

/** Max output tokens seen for (model, quality) — used to self-calibrate estimates. */
export async function observedOutputTokens(model: string, quality: string): Promise<number | undefined> {
  const [row] = await db
    .select({
      max: sql<number | null>`max((${labDeckLedger.usage}->>'output_tokens')::int)`,
    })
    .from(labDeckLedger)
    .innerJoin(labDeckImages, eq(labDeckImages.id, labDeckLedger.imageId))
    .where(and(eq(labDeckLedger.model, model), eq(labDeckImages.quality, quality)));
  return row?.max ?? undefined;
}

export async function ledgerFor(deckId: string) {
  return db.select().from(labDeckLedger).where(eq(labDeckLedger.deckId, deckId)).orderBy(desc(labDeckLedger.createdAt));
}
