// "Apply note": route an artist's feedback to where it belongs (the card's
// brief and/or a character's description) and decide whether the redraft
// should keep the current composition (edit) or start fresh.
import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { labDeckCards, labDeckCast, type LabStyleBible } from "../../db/schema/lab-deck.js";
import { CRITIQUE_RESERVE_MICROS, TEXT_MODEL, textUsageMicros } from "../../app/lib/deck/pricing.js";
import { traditionalName } from "../../app/lib/deck/prompts.js";
import { recordLedger, reserve, type DeckState } from "./store.js";

const schema = z.object({
  mode: z
    .enum(["edit", "fresh"])
    .describe("edit = keep the current image and change only something local (colour, an object, expression, a small detail); fresh = the note changes setting, pose, composition or adds major elements"),
  cardSubject: z.string().nullable().describe("The card's full rewritten SUBJECT if the card brief must change, else null"),
  cardComposition: z.string().nullable().describe("The card's full rewritten COMPOSITION if it must change, else null"),
  characters: z
    .array(z.object({ id: z.string(), description: z.string().describe("The character's full rewritten description") }))
    .describe("Characters whose lasting appearance the note changes (hair, beard, build, costume, companions); empty if none"),
  summary: z.string().describe("One or two sentences for the artist: what you changed where, and whether you kept the image"),
});
export type Revision = z.infer<typeof schema>;

export async function reviseFromNote(opts: {
  deckId: string;
  apiKey: string;
  note: string;
  bible: LabStyleBible;
  /** The card being redrafted. */
  card: DeckState["cards"][number];
  /** Characters on the card. */
  members: DeckState["cast"];
}): Promise<Revision> {
  const release = await reserve(opts.deckId, CRITIQUE_RESERVE_MICROS);
  try {
    const openai = createOpenAI({ apiKey: opts.apiKey });
    const { card } = opts;
    const { output, usage } = await generateText({
      model: openai(TEXT_MODEL),
      output: Output.object({ schema }),
      providerOptions: { openai: { reasoningEffort: "low", store: false } },
      prompt: `You are the art director of a tarot deck. The artist left a note on a draft of a card. Decide where the change belongs and how to redraft.

- A change to a character's lasting appearance (hair, beard, face, build, costume, companion) belongs in that character's description, so every card they appear on gets it. Rewrite the full description, keeping everything the note doesn't change.
- A change to this card's scene (setting, pose, action, objects, composition) belongs in the card's subject/composition. Rewrite them in full, keeping everything the note doesn't change.
- mode "edit" only for small local changes that keep the composition; "fresh" whenever the scene, pose, placement or setting changes.
- Write descriptions medium-neutral: people, objects and scene in plain words with natural colours. Never mention the medium, printing process, line style or palette names; the style is applied separately at render time.
- No lettering in the picture. Avoid anything that reads as self-harm, violence, injury or nudity.

ARTIST'S NOTE: ${opts.note}

CARD: ${traditionalName(card.cardId)} — "${card.name}"
Meaning: ${card.meaning}
SUBJECT: ${card.subject}
COMPOSITION: ${card.composition}
CHARACTERS:
${opts.members.map((m) => `- id ${m.id}: ${m.name}: ${m.description}`).join("\n") || "(none)"}`,
    });
    await recordLedger({
      deckId: opts.deckId,
      purpose: "revise",
      model: TEXT_MODEL,
      usage: usage as unknown as Record<string, unknown>,
      estimateMicros: CRITIQUE_RESERVE_MICROS,
      costMicros: textUsageMicros(TEXT_MODEL, {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens,
      }),
    });

    if (!card.locked && (output.cardSubject || output.cardComposition)) {
      await db
        .update(labDeckCards)
        .set({
          ...(output.cardSubject && { subject: output.cardSubject }),
          ...(output.cardComposition && { composition: output.cardComposition }),
          updatedAt: new Date(),
        })
        .where(and(eq(labDeckCards.deckId, opts.deckId), eq(labDeckCards.cardId, card.cardId)));
    }
    for (const c of output.characters) {
      const member = opts.members.find((m) => m.id === c.id);
      if (member) await db.update(labDeckCast).set({ description: c.description }).where(eq(labDeckCast.id, member.id));
    }
    return output;
  } finally {
    release();
  }
}
