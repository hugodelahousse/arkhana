// Deck bundles: one zip with every row of a deck and its image files, so a deck
// can move between environments (e.g. from a local machine to production).
// Import keeps the deck's ids, so its links work unchanged on the new host.
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { db } from "../../db/index.js";
import {
  labDeckCards,
  labDeckCast,
  labDeckImages,
  labDeckLedger,
  labDecks,
} from "../../db/schema/lab-deck.js";
import { filePath, saveFile } from "./store.js";

const VERSION = 1;

type Bundle = {
  version: number;
  deck: typeof labDecks.$inferSelect;
  cards: (typeof labDeckCards.$inferSelect)[];
  cast: (typeof labDeckCast.$inferSelect)[];
  images: (typeof labDeckImages.$inferSelect)[];
  ledger: (typeof labDeckLedger.$inferSelect)[];
};

export class BundleError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export async function exportBundle(deckId: string): Promise<Uint8Array> {
  const [deck] = await db.select().from(labDecks).where(eq(labDecks.id, deckId));
  if (!deck) throw new BundleError("Deck not found", 404);
  const [cards, cast, images, ledger] = await Promise.all([
    db.select().from(labDeckCards).where(eq(labDeckCards.deckId, deckId)),
    db.select().from(labDeckCast).where(eq(labDeckCast.deckId, deckId)),
    db.select().from(labDeckImages).where(eq(labDeckImages.deckId, deckId)),
    db.select().from(labDeckLedger).where(eq(labDeckLedger.deckId, deckId)),
  ]);
  const bundle: Bundle = {
    version: VERSION,
    deck: { ...deck, ownerId: null },
    cards,
    cast,
    images,
    ledger,
  };
  const entries: Zippable = { "deck.json": strToU8(JSON.stringify(bundle)) };
  for (const img of images) {
    if (!img.file) continue;
    try {
      entries[`files/${img.file}`] = [
        new Uint8Array(await readFile(filePath(deckId, img.file))),
        { level: 0 },
      ];
    } catch {
      // A missing file on disk shouldn't block the export; the image just won't render.
    }
  }
  return zipSync(entries);
}

/** JSON turns Dates into strings; turn the timestamp columns back. */
function revive<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const k of ["createdAt", "updatedAt"])
    if (typeof out[k] === "string") out[k] = new Date(out[k] as string);
  return out as T;
}

export async function importBundle(zip: Uint8Array, ownerId: string): Promise<string> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zip);
  } catch {
    throw new BundleError("That file isn't a deck bundle (.zip).");
  }
  if (!files["deck.json"])
    throw new BundleError("That zip has no deck.json: export it from a deck's workspace.");
  const b = JSON.parse(strFromU8(files["deck.json"])) as Bundle;
  if (b.version !== VERSION || !b.deck?.id)
    throw new BundleError("Unsupported deck bundle version.");
  const deckId = b.deck.id;
  const [existing] = await db
    .select({ id: labDecks.id })
    .from(labDecks)
    .where(eq(labDecks.id, deckId));
  if (existing) throw new BundleError("A deck with this id already exists here.", 409);

  // Files first (validated names only), then rows in one transaction.
  for (const [path, data] of Object.entries(files)) {
    if (!path.startsWith("files/")) continue;
    const name = path.slice("files/".length);
    filePath(deckId, name); // throws on anything but a plain image filename
    await saveFile(deckId, name, Buffer.from(data));
  }
  await db.transaction(async (tx) => {
    await tx.insert(labDecks).values(revive({ ...b.deck, ownerId }));
    if (b.cards.length)
      await tx.insert(labDeckCards).values(b.cards.map((r) => revive({ ...r, deckId })));
    if (b.cast.length)
      await tx.insert(labDeckCast).values(b.cast.map((r) => revive({ ...r, deckId })));
    if (b.images.length)
      await tx.insert(labDeckImages).values(b.images.map((r) => revive({ ...r, deckId })));
    // Ledger ids are a serial: let the new database assign them.
    if (b.ledger.length)
      await tx
        .insert(labDeckLedger)
        .values(b.ledger.map(({ id: _id, ...r }) => revive({ ...r, deckId })));
  });
  return deckId;
}
