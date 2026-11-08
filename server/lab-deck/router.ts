// HTTP API for the lab deck builder, mounted at /api/lab-deck.
// The user's OpenAI key arrives per request in `x-openai-key`; it is used for
// that request/job only and never stored or logged.
import express, { type Request, type Response } from "express";
import { and, eq, isNull } from "drizzle-orm";
import {
  convertToModelMessages,
  createIdGenerator,
  pipeUIMessageStreamToResponse,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { db } from "../../db/index.js";
import { labDeckCards, labDeckCast, labDeckImages, labDecks } from "../../db/schema/lab-deck.js";
import { config } from "../../config/index.js";
import {
  CHAT_TURN_RESERVE_MICROS,
  CONFIRM_ABOVE_MICROS,
  IMAGE_MODELS,
  TEXT_MODEL,
  textUsageMicros,
  type ImageQuality,
} from "../../app/lib/deck/pricing.js";
import {
  FRAME_IDS,
  PRESET_BY_ID,
  anchorSubjectFor,
  effectiveBible,
  isPresetUnmodified,
} from "../../app/lib/deck/presets.js";
import { buildBackPrompt, buildCardPrompt, type RefRole } from "../../app/lib/deck/prompts.js";
import type { PreviewData } from "../../app/lib/deck/client.js";
import {
  BudgetError,
  createDeck,
  filePath,
  getDeckState,
  ledgerFor,
  newId,
  recordLedger,
  reserve,
  saveFile,
  touchDeck,
  type DeckState,
} from "./store.js";
import { auth } from "../auth.js";
import { BundleError, exportBundle, importBundle } from "./bundle.js";
import {
  estimateJob,
  failInterruptedJobs,
  friendlyOpenAIError,
  preflight,
  queueImages,
  runImageJob,
  type ImageJob,
} from "./images.js";
import { createDeckAgent, type DeckAgentUIMessage } from "./agent.js";
import { rewriteRefusedBrief, violationsFrom } from "./rewrite.js";
import { reviseFromNote } from "./revise.js";
import { describeFromReferences } from "./describe.js";

export const labDeckRouter = express.Router();

if (config.labDeckEnabled) {
  failInterruptedJobs()
    .then((n) => n && console.log(`[lab-deck] marked ${n} interrupted image job(s) as failed`))
    .catch((err) => console.error("[lab-deck] could not sweep interrupted jobs", err));
}

labDeckRouter.use((_req, res, next) => {
  if (!config.labDeckEnabled) return res.status(404).json({ error: "Not found" });
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

const json = express.json({ limit: "25mb" }); // uploads arrive as data URLs

// ── Access ───────────────────────────────────────────────────────────────
// Anyone with a deck's link can read it (the preview is meant for sharing).
// Creating, importing and every change need a signed-in account, and changes
// are limited to the deck's owner.

type SessionUser = { id: string; isAnonymous?: boolean | null };

async function signedInUser(req: Request): Promise<SessionUser | null> {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });
  const u = session?.user as SessionUser | undefined;
  return u && !u.isAnonymous ? u : null;
}

labDeckRouter.use("/decks/:id", async (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next();
  try {
    const user = await signedInUser(req);
    if (!user) return res.status(401).json({ error: "Sign in to edit this deck." });
    const id = String(req.params.id ?? "");
    const [deck] = await db
      .select({ ownerId: labDecks.ownerId })
      .from(labDecks)
      .where(eq(labDecks.id, id));
    if (!deck) return res.status(404).json({ error: "Deck not found" });
    if (deck.ownerId === null) {
      // Decks from before ownership existed: the first signed-in editor claims them.
      await db
        .update(labDecks)
        .set({ ownerId: user.id })
        .where(and(eq(labDecks.id, id), isNull(labDecks.ownerId)));
    } else if (deck.ownerId !== user.id) {
      return res
        .status(403)
        .json({ error: "Only this deck's owner can change it. You can still view its preview." });
    }
    next();
  } catch (err) {
    next(err);
  }
});

function apiKey(req: Request): string | null {
  const k = req.header("x-openai-key");
  return k && /^sk-[A-Za-z0-9_-]{20,}$/.test(k) ? k : null;
}

async function loadState(req: Request, res: Response): Promise<DeckState | null> {
  const id = String(req.params.id ?? "");
  if (!/^[a-z0-9]{24}$/.test(id)) {
    res.status(404).json({ error: "Deck not found" });
    return null;
  }
  const state = await getDeckState(id);
  if (!state) res.status(404).json({ error: "Deck not found" });
  return state;
}

// ── Key & decks ──────────────────────────────────────────────────────────

labDeckRouter.post("/preflight", async (req, res) => {
  const key = apiKey(req);
  if (!key)
    return res
      .status(400)
      .json({ ok: false, error: "That doesn't look like an OpenAI API key (sk-…)." });
  res.json(await preflight(key));
});

labDeckRouter.post("/decks", async (req, res) => {
  const user = await signedInUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to create a deck." });
  res.json({ id: await createDeck(user.id) });
});

labDeckRouter.get("/decks/:id", async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const user = await signedInUser(req);
  const { ownerId, ...deck } = state.deck;
  res.json({
    ...state,
    deck,
    canEdit: !!user && (ownerId === null || ownerId === user.id),
    ledger: await ledgerFor(state.deck.id),
    agentRunning: agentRuns.has(state.deck.id),
  });
});

/**
 * Just what the preview page shows: card names and texts, and the few images it
 * can pick between per card (accepted final, approved draft, newest final, newest
 * draft) plus the back. The full state carries prompts, chat and ledger (~2 MB).
 */
labDeckRouter.get("/decks/:id/preview", async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const user = await signedInUser(req);
  const { deck } = state;
  const done = state.images.filter((i) => i.status === "done" && i.file); // newest first
  const keep = new Set<string>();
  if (deck.backImageId) keep.add(deck.backImageId);
  for (const c of state.cards) {
    for (const id of [c.finalImageId, c.approvedDraftId]) if (id) keep.add(id);
    for (const kind of ["final", "draft"]) {
      const newest = done.find((i) => i.kind === kind && i.cardId === c.cardId);
      if (newest) keep.add(newest.id);
    }
  }
  const preview: PreviewData = {
    deck: {
      id: deck.id,
      title: deck.title,
      frameId: deck.frameId,
      presetId: deck.presetId,
      backImageId: deck.backImageId,
    },
    cards: state.cards.map((c) => ({
      cardId: c.cardId,
      name: c.name,
      backText: c.backText,
      finalImageId: c.finalImageId,
      approvedDraftId: c.approvedDraftId,
    })),
    images: done
      .filter((i) => keep.has(i.id))
      .map((i) => ({ id: i.id, kind: i.kind, cardId: i.cardId, status: i.status, url: i.url })),
    canEdit: !!user && (deck.ownerId === null || deck.ownerId === user.id),
  };
  res.json(preview);
});

/** The whole deck (rows + image files) as a zip, to move it to another environment. Owner only. */
labDeckRouter.get("/decks/:id/bundle", async (req, res, next) => {
  try {
    const state = await loadState(req, res);
    if (!state) return;
    const user = await signedInUser(req);
    if (!user || (state.deck.ownerId !== null && state.deck.ownerId !== user.id)) {
      return res.status(403).json({ error: "Only this deck's owner can export it." });
    }
    const zip = await exportBundle(state.deck.id);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="deck-${state.deck.id}.zip"`);
    res.send(Buffer.from(zip));
  } catch (err) {
    next(err);
  }
});

/** Import a deck bundle; the importer becomes its owner. Keeps the deck's id, so its links still work. */
labDeckRouter.post(
  "/import",
  express.raw({ type: ["application/zip", "application/octet-stream"], limit: "500mb" }),
  async (req, res, next) => {
    try {
      const user = await signedInUser(req);
      if (!user) return res.status(401).json({ error: "Sign in to import a deck." });
      if (!Buffer.isBuffer(req.body) || !req.body.length)
        return res.status(400).json({ error: "Send the bundle as a .zip body." });
      res.json({ id: await importBundle(new Uint8Array(req.body), user.id) });
    } catch (err) {
      if (err instanceof BundleError) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  }
);

labDeckRouter.patch("/decks/:id", json, async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const b = req.body ?? {};
  const patch: Parameters<typeof touchDeck>[1] = {};
  if (typeof b.title === "string") patch.title = b.title.slice(0, 120);
  if (typeof b.theme === "string") patch.theme = b.theme.slice(0, 4000);
  if (typeof b.presetId === "string" && PRESET_BY_ID[b.presetId]) {
    if (b.presetId !== state.deck.presetId)
      Object.assign(patch, { presetId: b.presetId, styleBible: null, anchorImageId: null });
    patch.styleSuggestions = null; // the pending suggestion is answered
  }
  if (b.styleSuggestions === null) patch.styleSuggestions = null;
  if (
    b.frameId === null ||
    (typeof b.frameId === "string" && (FRAME_IDS as readonly string[]).includes(b.frameId))
  )
    patch.frameId = b.frameId;
  if (b.styleBible && typeof b.styleBible === "object") {
    const sb = b.styleBible;
    if (["artefact", "process", "palette", "exclude"].every((k) => typeof sb[k] === "string")) {
      const unmodified = isPresetUnmodified(patch.presetId ?? state.deck.presetId, sb);
      Object.assign(patch, { styleBible: unmodified ? null : sb, anchorImageId: null });
    }
  }
  if (b.backStyle === "standard" || b.backStyle === "story") patch.backStyle = b.backStyle;
  if (
    b.backImageId === null ||
    (typeof b.backImageId === "string" &&
      state.images.some((i) => i.id === b.backImageId && i.kind === "back" && i.status === "done"))
  )
    patch.backImageId = b.backImageId;
  if (Number.isInteger(b.budgetMicros) && b.budgetMicros >= 0 && b.budgetMicros <= 500_000_000)
    patch.budgetMicros = b.budgetMicros;
  if (b.view === "chat" || b.view === "wizard") patch.view = b.view;
  if (["style", "cards", "drafts", "finals"].includes(b.wizardStep))
    patch.wizardStep = b.wizardStep;
  if (b.anchorImageId === null || typeof b.anchorImageId === "string") {
    const ok =
      b.anchorImageId === null ||
      state.images.some((i) => i.id === b.anchorImageId && i.status === "done");
    if (ok) patch.anchorImageId = b.anchorImageId;
  }
  await touchDeck(state.deck.id, patch);
  res.json({ ok: true });
});

labDeckRouter.patch("/decks/:id/cards/:cardId", json, async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const cardId = Number(req.params.cardId);
  if (!Number.isInteger(cardId) || cardId < 0 || cardId > 21)
    return res.status(400).json({ error: "bad card" });
  const b = req.body ?? {};
  const patch: Partial<typeof labDeckCards.$inferInsert> = { updatedAt: new Date() };
  for (const k of [
    "name",
    "meaning",
    "subject",
    "composition",
    "fidelityNotes",
    "backText",
  ] as const)
    if (typeof b[k] === "string") patch[k] = b[k].slice(0, 4000);
  if (typeof b.locked === "boolean") patch.locked = b.locked;
  if (Array.isArray(b.castIds))
    patch.castIds = b.castIds.filter((id: unknown) => state.cast.some((c) => c.id === id));
  for (const k of ["approvedDraftId", "finalImageId"] as const)
    if (
      b[k] === null ||
      (typeof b[k] === "string" && state.images.some((i) => i.id === b[k] && i.cardId === cardId))
    )
      patch[k] = b[k];
  await db
    .update(labDeckCards)
    .set(patch)
    .where(and(eq(labDeckCards.deckId, state.deck.id), eq(labDeckCards.cardId, cardId)));
  res.json({ ok: true });
});

/** Rewrite a card's brief after OpenAI's safety system refused its draft. */
labDeckRouter.post("/decks/:id/cards/:cardId/rewrite-for-policy", async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const key = apiKey(req);
  if (!key) return res.status(401).json({ error: "Add your OpenAI API key first." });
  const card = state.cards.find((c) => c.cardId === Number(req.params.cardId));
  if (!card) return res.status(404).json({ error: "Card not found" });
  if (card.locked)
    return res
      .status(409)
      .json({ error: "This card is locked. Unlock it to let its brief be rewritten." });
  const refused = state.images.find(
    (i) =>
      i.cardId === card.cardId &&
      i.status === "error" &&
      /safety|content-policy/i.test(i.error ?? "")
  );
  const bible = effectiveBible(state.deck.presetId, state.deck.styleBible);
  try {
    const out = await rewriteRefusedBrief({
      deckId: state.deck.id,
      apiKey: key,
      card,
      violations: violationsFrom(refused?.error),
      styleSummary: `${bible.artefact} ${bible.palette}`,
    });
    res.json({ whatChanged: out.whatChanged });
  } catch (e) {
    if (e instanceof BudgetError)
      return res.status(402).json({ error: "This would exceed the deck budget." });
    res.status(502).json({ error: friendlyOpenAIError(e) });
  }
});

// ── Cast & uploads ───────────────────────────────────────────────────────

labDeckRouter.post("/decks/:id/cast", json, async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const { name, kind = "character", description = "" } = req.body ?? {};
  if (typeof name !== "string" || !name.trim())
    return res.status(400).json({ error: "name required" });
  const id = newId();
  await db
    .insert(labDeckCast)
    .values({
      id,
      deckId: state.deck.id,
      name: name.slice(0, 120),
      kind,
      description: String(description).slice(0, 4000),
    });
  res.json({ id });
});

labDeckRouter.patch("/decks/:id/cast/:castId", json, async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const member = state.cast.find((c) => c.id === req.params.castId);
  if (!member) return res.status(404).json({ error: "cast member not found" });
  const b = req.body ?? {};
  const patch: Partial<typeof labDeckCast.$inferInsert> = {};
  if (typeof b.name === "string") patch.name = b.name.slice(0, 120);
  if (typeof b.description === "string") patch.description = b.description.slice(0, 4000);
  if (["character", "prop", "place"].includes(b.kind)) patch.kind = b.kind;
  if (Array.isArray(b.refImageIds))
    patch.refImageIds = b.refImageIds.filter((id: unknown) =>
      state.images.some((i) => i.id === id)
    );
  await db.update(labDeckCast).set(patch).where(eq(labDeckCast.id, member.id));
  res.json({ ok: true });
});

/** Turn a cast member's reference images into description text (references never go into card calls). */
labDeckRouter.post("/decks/:id/cast/:castId/describe-from-refs", async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const key = apiKey(req);
  if (!key) return res.status(401).json({ error: "Add your OpenAI API key first." });
  const member = state.cast.find((c) => c.id === req.params.castId);
  if (!member) return res.status(404).json({ error: "cast member not found" });
  try {
    const out = await describeFromReferences({ deckId: state.deck.id, apiKey: key, member });
    res.json({ added: out.added });
  } catch (e) {
    if (e instanceof BudgetError)
      return res.status(402).json({ error: "This would exceed the deck budget." });
    res.status(502).json({ error: friendlyOpenAIError(e) });
  }
});

labDeckRouter.delete("/decks/:id/cast/:castId", async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  await db
    .delete(labDeckCast)
    .where(
      and(eq(labDeckCast.id, String(req.params.castId)), eq(labDeckCast.deckId, state.deck.id))
    );
  res.json({ ok: true });
});

/** Upload an image as a data URL. purpose: "style-ref" | "cast-ref" | "back-sketch" (layout reference for the back) | "back" (finished back art). */
labDeckRouter.post("/decks/:id/uploads", json, async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const { dataUrl, purpose, castId } = req.body ?? {};
  const m =
    typeof dataUrl === "string" && /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(dataUrl);
  if (!m) return res.status(400).json({ error: "Upload a PNG, JPEG or WebP image." });
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 15 * 1024 * 1024)
    return res.status(413).json({ error: "Images must be under 15 MB." });
  const id = newId();
  const file = `${id}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
  await saveFile(state.deck.id, file, buf);
  const member = purpose === "cast-ref" ? state.cast.find((c) => c.id === castId) : undefined;
  if (purpose === "cast-ref" && !member)
    return res.status(400).json({ error: "unknown cast member" });
  await db.insert(labDeckImages).values({
    id,
    deckId: state.deck.id,
    kind: ["style-ref", "back-sketch", "back"].includes(purpose) ? purpose : "upload",
    castId: member?.id ?? null,
    file,
  });
  if (member)
    await db
      .update(labDeckCast)
      .set({ refImageIds: [...member.refImageIds, id] })
      .where(eq(labDeckCast.id, member.id));
  res.json({ id });
});

labDeckRouter.delete("/decks/:id/images/:imageId", async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const img = state.images.find((i) => i.id === req.params.imageId);
  if (!img || !["upload", "style-ref", "back-sketch"].includes(img.kind))
    return res.status(404).json({ error: "not found" });
  await db.delete(labDeckImages).where(eq(labDeckImages.id, img.id));
  for (const c of state.cast)
    if (c.refImageIds.includes(img.id))
      await db
        .update(labDeckCast)
        .set({ refImageIds: c.refImageIds.filter((x) => x !== img.id) })
        .where(eq(labDeckCast.id, c.id));
  res.json({ ok: true });
});

labDeckRouter.get("/files/:deckId/:file", (req, res) => {
  try {
    // Cache headers go on the success path only (via sendFile's `headers`), so a
    // 404 is never cached. dotfiles: "allow" because the data dir defaults to
    // `.data/`; filePath() already validates the deck id and file name.
    res.sendFile(
      filePath(String(req.params.deckId), String(req.params.file)),
      { dotfiles: "allow", headers: { "Cache-Control": "private, max-age=31536000, immutable" } },
      (err) => {
        if (err && !res.headersSent) res.status(404).set("Cache-Control", "no-store").end();
      }
    );
  } catch {
    res.status(404).set("Cache-Control", "no-store").end();
  }
});

// ── Spending ─────────────────────────────────────────────────────────────

type GenerateBody = {
  action: "probe" | "drafts" | "finals" | "back";
  cardIds?: number[];
  quality?: ImageQuality;
  /** Artist's revision note for a redraft of a single card. */
  note?: string;
  /** Edit this existing image instead of starting fresh (requires `note`). */
  baseImageId?: string;
  count?: number;
  confirm?: boolean;
  /** For action "back": what this back shows, and which uploaded layout sketch to follow (default: the newest). */
  backDesign?: string;
  sketchId?: string;
};

class BadRequest extends Error {}

function anchorRef(state: DeckState): { id: string; presetSubject?: string } | null {
  const { deck } = state;
  if (deck.anchorImageId) return { id: deck.anchorImageId };
  if (isPresetUnmodified(deck.presetId, deck.styleBible))
    return { id: `preset:${deck.presetId}`, presetSubject: anchorSubjectFor(deck.presetId) };
  return null;
}

function cardCharacters(state: DeckState, castIds: string[]) {
  return castIds
    .map((id) => state.cast.find((c) => c.id === id))
    .filter((c): c is DeckState["cast"][number] => !!c)
    .map((c) => ({ name: c.name, kind: c.kind, description: c.description }));
}

/** A redraft note either edits an existing image (kept as a reference) or is added to the prompt. */
function revision(
  state: DeckState,
  body: GenerateBody,
  owns: (img: DeckState["images"][number]) => boolean
) {
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  if (!note) return { note: undefined, base: undefined };
  const base = body.baseImageId
    ? state.images.find((i) => i.id === body.baseImageId && i.status === "done" && owns(i))
    : undefined;
  if (body.baseImageId && !base) throw new BadRequest("That image can't be used as a base.");
  return { note, base };
}

function buildJobs(state: DeckState, body: GenerateBody): ImageJob[] {
  const { deck } = state;
  const bible = effectiveBible(deck.presetId, deck.styleBible);
  const anchor = anchorRef(state);

  if (body.action === "probe") {
    const cardId = body.cardIds?.[0] ?? state.cards.find((c) => c.subject)?.cardId ?? 0;
    const card = state.cards.find((c) => c.cardId === cardId)!;
    if (!card.subject)
      throw new BadRequest("Write a brief for this card first (or ask the agent to).");
    const styleRefs = state.images.filter((i) => i.kind === "style-ref").slice(0, 3);
    const roles: RefRole[] = styleRefs.map(() => ({ kind: "style-ref" }));
    const prompt = buildCardPrompt(
      bible,
      card,
      roles,
      undefined,
      cardCharacters(state, card.castIds)
    );
    const n = Math.min(Math.max(body.count ?? 4, 1), 4);
    return Array.from({ length: n }, () => ({
      deckId: deck.id,
      kind: "probe",
      cardId,
      model: IMAGE_MODELS.draft,
      quality: "low",
      prompt,
      refIds: styleRefs.map((i) => i.id),
    }));
  }

  if (!anchor)
    throw new BadRequest(
      "This deck's style was customized: run a style probe and pick an anchor first."
    );

  if (body.action === "back") {
    // A layout sketch (the chosen one, else the newest) steers the composition.
    const sketches = state.images.filter((i) => i.kind === "back-sketch" && i.file);
    const sketch = body.sketchId ? sketches.find((i) => i.id === body.sketchId) : sketches[0];
    if (body.sketchId && !sketch) throw new BadRequest("That layout sketch doesn't exist.");
    const design = typeof body.backDesign === "string" ? body.backDesign.slice(0, 2000) : undefined;
    const roles: RefRole[] = [
      { kind: "anchor", presetSubject: anchor.presetSubject },
      ...(sketch ? [{ kind: "sketch" as const }] : []),
    ];
    const quality: ImageQuality =
      body.quality && ["medium", "high"].includes(body.quality) ? body.quality : "high";
    return [
      {
        deckId: deck.id,
        kind: "back" as const,
        model: IMAGE_MODELS.final,
        quality,
        size: "1024x1536",
        prompt: buildBackPrompt(bible, roles, deck.title, deck.theme, design),
        refIds: [anchor.id, ...(sketch ? [sketch.id] : [])],
      },
    ];
  }

  const ids = body.cardIds?.length ? body.cardIds : state.cards.map((c) => c.cardId);
  const cards = state.cards.filter((c) => ids.includes(c.cardId));

  if (body.action === "drafts") {
    const draftQuality: ImageQuality = body.quality === "medium" ? "medium" : "low";
    const single = cards.length === 1 ? cards[0] : undefined;
    const rev = single
      ? revision(state, body, (i) => i.kind === "draft" && i.cardId === single.cardId)
      : { note: undefined, base: undefined };
    return cards
      .filter((c) => c.subject.trim())
      .map((card) => {
        // Characters stay consistent through their descriptions (sent with every card), not reference sheets.
        const roles: RefRole[] = [
          { kind: "anchor", presetSubject: anchor.presetSubject },
          ...(rev.base ? [{ kind: "previous" as const, change: rev.note! }] : []),
        ];
        return {
          deckId: deck.id,
          kind: "draft" as const,
          cardId: card.cardId,
          model: IMAGE_MODELS.draft,
          quality: draftQuality,
          prompt: buildCardPrompt(
            bible,
            card,
            roles,
            rev.base ? undefined : rev.note,
            cardCharacters(state, card.castIds)
          ),
          refIds: [anchor.id, ...(rev.base ? [rev.base.id] : [])],
        };
      });
  }

  // finals
  const quality: ImageQuality =
    body.quality && ["medium", "high", "xhigh"].includes(body.quality) ? body.quality : "high";
  return cards
    .filter((c) => c.approvedDraftId)
    .map((card) => {
      const roles: RefRole[] = [
        { kind: "anchor", presetSubject: anchor.presetSubject },
        { kind: "draft" },
      ];
      return {
        deckId: deck.id,
        kind: "final" as const,
        cardId: card.cardId,
        model: IMAGE_MODELS.final,
        quality,
        prompt: buildCardPrompt(bible, card, roles, undefined, cardCharacters(state, card.castIds)),
        refIds: [anchor.id, card.approvedDraftId!],
      };
    });
}

/** Estimate without spending (no key needed). */
labDeckRouter.post("/decks/:id/estimate", json, async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  try {
    const jobs = buildJobs(state, req.body as GenerateBody);
    const estimates = await Promise.all(jobs.map(estimateJob));
    res.json({ count: jobs.length, estimateMicros: estimates.reduce((a, b) => a + b, 0) });
  } catch (e) {
    res.status(e instanceof BadRequest ? 400 : 500).json({ error: (e as Error).message });
  }
});

/** Build, estimate, reserve and start jobs. Returns an HTTP status + JSON body. */
async function startGeneration(
  state: DeckState,
  body: GenerateBody,
  key: string
): Promise<{ status: number; json: unknown }> {
  let jobs: ImageJob[];
  try {
    jobs = buildJobs(state, body);
  } catch (e) {
    return { status: e instanceof BadRequest ? 400 : 500, json: { error: (e as Error).message } };
  }
  if (!jobs.length) return { status: 400, json: { error: "Nothing to generate." } };

  const estimates = await Promise.all(jobs.map(estimateJob));
  const total = estimates.reduce((a, b) => a + b, 0);
  if (total > CONFIRM_ABOVE_MICROS && !body.confirm)
    return { status: 409, json: { needsConfirm: true, estimateMicros: total, count: jobs.length } };

  const releases: (() => void)[] = [];
  try {
    for (const est of estimates) releases.push(await reserve(state.deck.id, est));
  } catch (e) {
    releases.forEach((r) => r());
    if (e instanceof BudgetError)
      return {
        status: 402,
        json: {
          error: "This would exceed the deck budget.",
          needMicros: total,
          availableMicros: e.availableMicros,
        },
      };
    throw e;
  }

  const imageIds = await queueImages(jobs);
  jobs.forEach((job, i) => void runImageJob(imageIds[i], job, key, estimates[i], releases[i]));
  return { status: 200, json: { imageIds, estimateMicros: total } };
}

labDeckRouter.post("/decks/:id/generate", json, async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const key = apiKey(req);
  if (!key) return res.status(401).json({ error: "Add your OpenAI API key first." });
  const r = await startGeneration(state, req.body as GenerateBody, key);
  res.status(r.status).json(r.json);
});

/**
 * "Apply note" (auto mode): route the note to the card brief and/or character
 * descriptions, then redraft — keeping the current image for small edits.
 */
labDeckRouter.post("/decks/:id/revise", json, async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const key = apiKey(req);
  if (!key) return res.status(401).json({ error: "Add your OpenAI API key first." });
  const { note, cardId, quality } = req.body ?? {};
  if (typeof note !== "string" || !note.trim())
    return res.status(400).json({ error: "Write a note first." });
  const card =
    typeof cardId === "number" ? state.cards.find((c) => c.cardId === cardId) : undefined;
  if (!card) return res.status(400).json({ error: "Nothing to revise." });
  const members = state.cast.filter((m) => card.castIds.includes(m.id));
  const bible = effectiveBible(state.deck.presetId, state.deck.styleBible);

  let rev;
  try {
    rev = await reviseFromNote({
      deckId: state.deck.id,
      apiKey: key,
      note: note.slice(0, 1000),
      bible,
      card,
      members,
    });
  } catch (e) {
    if (e instanceof BudgetError)
      return res.status(402).json({ error: "This would exceed the deck budget." });
    return res.status(502).json({ error: friendlyOpenAIError(e) });
  }

  // Redraft from the updated deck. "edit" keeps the latest finished draft as a base.
  const fresh = (await getDeckState(state.deck.id))!;
  const base = fresh.images.find(
    (i) => i.status === "done" && i.kind === "draft" && i.cardId === card.cardId
  );
  const edit = rev.mode === "edit" && !!base;
  const body: GenerateBody = {
    action: "drafts",
    cardIds: [card.cardId],
    quality,
    ...(edit && { note, baseImageId: base!.id }),
  };
  const r = await startGeneration(fresh, body, key);
  res
    .status(r.status)
    .json({ ...(r.json as object), summary: rev.summary, mode: edit ? "edit" : "fresh" });
});

// ── Agent chat ───────────────────────────────────────────────────────────

// One agent run per deck at a time. Runs are decoupled from the HTTP
// response: if the client navigates away or reloads, the run continues,
// persists its messages after every step, and the client picks them up from
// the deck (which reports `agentRunning`).
const agentRuns = new Map<string, AbortController>();
export const isAgentRunning = (deckId: string) => agentRuns.has(deckId);

labDeckRouter.post("/decks/:id/chat", json, async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  const key = apiKey(req);
  if (!key) return res.status(401).json({ error: "Add your OpenAI API key first." });
  const deckId = state.deck.id;
  if (agentRuns.has(deckId))
    return res
      .status(409)
      .json({ error: "The agent is still working on this deck. Wait for it, or stop it." });
  let release: () => void;
  try {
    release = await reserve(deckId, CHAT_TURN_RESERVE_MICROS);
  } catch (e) {
    if (e instanceof BudgetError)
      return res
        .status(402)
        .json({ error: "The deck budget is used up. Raise it to keep chatting." });
    throw e;
  }
  const run = new AbortController();
  agentRuns.set(deckId, run);
  const finish = () => {
    agentRuns.delete(deckId);
    release();
  };

  try {
    const agent = await createDeckAgent(deckId, key);
    // Drop parts from tools that no longer exist (e.g. after an agent change),
    // so older conversations still validate.
    const raw: { parts?: { type?: string }[] }[] = Array.isArray(req.body?.messages)
      ? req.body.messages
      : [];
    const known = new Set(Object.keys(agent.tools).map((t) => `tool-${t}`));
    const cleaned = raw.map((m) => ({
      ...m,
      parts: (m.parts ?? []).filter((p) => !p.type?.startsWith("tool-") || known.has(p.type)),
    }));
    const uiMessages = await validateUIMessages<DeckAgentUIMessage>({
      messages: cleaned,
      tools: agent.tools,
    });
    // Save the user's turn up front so it survives a failed or aborted run.
    await touchDeck(deckId, { messages: uiMessages });

    const result = await agent.stream({
      prompt: await convertToModelMessages(uiMessages, { tools: agent.tools }),
      abortSignal: run.signal,
      onStepEnd: async (step) => {
        await recordLedger({
          deckId,
          purpose: "chat",
          model: TEXT_MODEL,
          usage: step.usage as unknown as Record<string, unknown>,
          estimateMicros: 0,
          costMicros: textUsageMicros(TEXT_MODEL, {
            inputTokens: step.usage.inputTokens,
            outputTokens: step.usage.outputTokens,
            cachedInputTokens: step.usage.inputTokenDetails?.cacheReadTokens,
          }),
        });
      },
    });

    const uiStream = toUIMessageStream({
      stream: result.stream,
      tools: agent.tools,
      originalMessages: uiMessages,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
      // Forward a readable message instead of the SDK's generic "An error occurred."
      onError: (err) => friendlyOpenAIError(err),
      onStepEnd: async ({ messages }) => {
        await touchDeck(deckId, { messages });
      },
      onEnd: async ({ messages }) => {
        try {
          await touchDeck(deckId, { messages });
        } finally {
          finish();
        }
      },
    });

    pipeUIMessageStreamToResponse({
      response: res,
      stream: uiStream,
      // Drain a copy of the stream server-side so the run (and its onEnd
      // persistence) completes even when the client disconnects.
      consumeSseStream: ({ stream }) => {
        void stream.pipeTo(new WritableStream()).catch(() => {});
      },
    });
  } catch (e) {
    finish();
    throw e;
  }
});

/** Explicit stop (closing the tab no longer stops a run). */
labDeckRouter.post("/decks/:id/chat/stop", async (req, res) => {
  const state = await loadState(req, res);
  if (!state) return;
  agentRuns.get(state.deck.id)?.abort();
  res.json({ ok: true });
});

// ── Errors ───────────────────────────────────────────────────────────────
// Return JSON with the underlying cause (Drizzle wraps the Postgres error),
// so the UI can show it instead of failing silently.
labDeckRouter.use((err: unknown, _req: Request, res: Response, next: express.NextFunction) => {
  if (res.headersSent) return next(err);
  const e = err as Error & { cause?: { message?: string; code?: string } };
  const cause = e.cause?.message ?? e.message;
  const hint =
    e.cause?.code === "42P01" ? " — run `pnpm db:migrate` to create the lab_deck tables." : "";
  console.error("[lab-deck]", cause);
  res.status(500).json({ error: `${cause}${hint}` });
});
