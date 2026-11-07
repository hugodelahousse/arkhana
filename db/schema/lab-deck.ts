// Lab: Major Arcana deck builder (see docs/lab-deck-builder.md).
// A deck is addressed by its unguessable id: anyone with the link can view it;
// only its owner (a signed-in account) can change it.
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export type LabStyleBible = {
  artefact: string; // the physical object: "A flat scan of a hand-printed two-colour linocut…"
  process: string; // tools, process, imperfections, how magic/light is rendered
  palette: string; // capped palette, named pigments (+ hex)
  exclude: string; // exclusions line
};

export type LabCritique = {
  readsAsMeaning: boolean;
  matchesCharacters?: "yes" | "partly" | "no" | "n/a";
  styleAdherence: "good" | "drifting" | "off";
  hasTextOrBorder: boolean;
  issues: string[];
  suggestion: string;
};

export type LabStyleSuggestions = {
  options: { presetId: string; why: string }[];
  recommended: string;
};

export const labDecks = pgTable("lab_decks", {
  id: text("id").primaryKey(),
  // The account that can edit the deck. Null only for decks made before ownership existed:
  // the first signed-in editor claims those.
  ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
  title: text("title").notNull().default("Untitled deck"),
  theme: text("theme").notNull().default(""),
  presetId: text("preset_id").notNull().default("linocut-2c"),
  frameId: text("frame_id"), // null = the preset's default frame
  styleBible: jsonb("style_bible").$type<LabStyleBible>(), // null = preset unmodified
  anchorImageId: text("anchor_image_id"), // null = preset's shipped anchor (if unmodified)
  // Agent's pending style suggestions, shown in the Style tab until the user picks.
  styleSuggestions: jsonb("style_suggestions").$type<LabStyleSuggestions>(),
  budgetMicros: integer("budget_micros").notNull().default(10_000_000), // $10
  backStyle: text("back_style").notNull().default("standard"), // "standard" | "story"
  backImageId: text("back_image_id"), // optional generated art for the standard back
  view: text("view").notNull().default("chat"), // "chat" | "wizard"
  wizardStep: text("wizard_step").notNull().default("style"),
  messages: jsonb("messages").$type<unknown[]>().notNull().default([]),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const labDeckCards = pgTable(
  "lab_deck_cards",
  {
    deckId: text("deck_id")
      .notNull()
      .references(() => labDecks.id, { onDelete: "cascade" }),
    cardId: integer("card_id").notNull(), // 0–21
    name: text("name").notNull(), // display title (renamable)
    meaning: text("meaning").notNull().default(""),
    subject: text("subject").notNull().default(""),
    composition: text("composition").notNull().default(""),
    fidelityNotes: text("fidelity_notes").notNull().default(""),
    // "Story" card back: why this character was chosen for this card.
    backText: text("back_text").notNull().default(""),
    castIds: jsonb("cast_ids").$type<string[]>().notNull().default([]),
    locked: boolean("locked").notNull().default(false),
    approvedDraftId: text("approved_draft_id"),
    finalImageId: text("final_image_id"),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.deckId, t.cardId] })]
);

// Characters, props and places that recur across cards. User references are
// translated once into an in-style "plate"; only plates go into card calls.
export const labDeckCast = pgTable(
  "lab_deck_cast",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => labDecks.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("character"), // "character" | "prop" | "place"
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    refImageIds: jsonb("ref_image_ids").$type<string[]>().notNull().default([]),
    plateImageId: text("plate_image_id"), // approved plate
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("lab_deck_cast_deck_idx").on(t.deckId)]
);

export const labDeckImages = pgTable(
  "lab_deck_images",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => labDecks.id, { onDelete: "cascade" }),
    // "upload" | "style-ref" | "probe" | "anchor" | "plate" | "draft" | "final" | "back"
    kind: text("kind").notNull(),
    cardId: integer("card_id"),
    castId: text("cast_id"),
    status: text("status").notNull().default("done"), // "queued" | "running" | "done" | "error"
    file: text("file"), // filename inside the deck's data dir
    model: text("model"),
    quality: text("quality"),
    size: text("size"),
    prompt: text("prompt"),
    refIds: jsonb("ref_ids").$type<string[]>().notNull().default([]),
    critique: jsonb("critique").$type<LabCritique>(),
    error: text("error"),
    costMicros: integer("cost_micros").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("lab_deck_images_deck_idx").on(t.deckId, t.kind)]
);

export const labDeckLedger = pgTable(
  "lab_deck_ledger",
  {
    id: serial("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => labDecks.id, { onDelete: "cascade" }),
    imageId: text("image_id"),
    purpose: text("purpose").notNull(), // "chat" | "critique" | "probe" | "plate" | "draft" | "final" | …
    model: text("model").notNull(),
    usage: jsonb("usage").$type<Record<string, unknown>>().notNull(),
    estimateMicros: integer("estimate_micros").notNull().default(0),
    costMicros: integer("cost_micros").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("lab_deck_ledger_deck_idx").on(t.deckId)]
);
