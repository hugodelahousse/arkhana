// Lab: casting vote (/lab/casting). People propose who or what should play each
// Major Arcana in a themed deck, then each voter stack-ranks the proposals.
// A deck is addressed by its unguessable id: anyone with the link can read it,
// any signed-in account can propose and rank, and only the owner can edit or delete it.
import { index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth.js";

export const labCastingDecks = pgTable(
  "lab_casting_decks",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // The world the cast is drawn from: "our D&D campaign", "the office", "90s cartoons".
    theme: text("theme").notNull().default(""),
    // Art style for every card drawn in this deck (a preset from app/lib/deck/presets.ts).
    presetId: text("preset_id").notNull().default("linocut-2c"),
    frameId: text("frame_id"), // null = the preset's default frame
    // An uploaded style image. When set it replaces the preset as the deck's style.
    anchorFile: text("anchor_file"),
    // The shared card back: uploaded or drawn art. Null = the frame's pattern.
    backFile: text("back_file"),
    backStatus: text("back_status").notNull().default("none"), // "none" | "running" | "error"
    backError: text("back_error"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("lab_casting_decks_owner_idx").on(t.ownerId)]
);

export const labCastingProposals = pgTable(
  "lab_casting_proposals",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => labCastingDecks.id, { onDelete: "cascade" }),
    cardId: integer("card_id").notNull(), // 0–21
    name: text("name").notNull(),
    pitch: text("pitch").notNull().default(""), // why this pick fits the card
    // What the card shows: who, doing what, where. The whole brief for the card art.
    scene: text("scene").notNull().default(""),
    artFile: text("art_file"), // current card art, a file in the deck's data dir
    artStatus: text("art_status").notNull().default("none"), // "none" | "running" | "error"
    artError: text("art_error"),
    proposerId: text("proposer_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("lab_casting_proposals_deck_card_idx").on(t.deckId, t.cardId),
    index("lab_casting_proposals_proposer_idx").on(t.proposerId),
  ]
);

// One voter's stack rank for one card: proposal ids, best first.
// Ids of proposals deleted since are ignored when read.
export const labCastingRankings = pgTable(
  "lab_casting_rankings",
  {
    deckId: text("deck_id")
      .notNull()
      .references(() => labCastingDecks.id, { onDelete: "cascade" }),
    cardId: integer("card_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    order: jsonb("order").$type<string[]>().notNull().default([]),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.deckId, t.cardId, t.userId] }),
    index("lab_casting_rankings_user_idx").on(t.userId),
  ]
);
