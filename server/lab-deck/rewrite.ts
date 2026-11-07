// Rewrites a card brief that OpenAI's image safety system refused, keeping
// its meaning. One small structured text call; cost is recorded in the ledger.
import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { labDeckCards } from "../../db/schema/lab-deck.js";
import { CRITIQUE_RESERVE_MICROS, TEXT_MODEL, textUsageMicros } from "../../app/lib/deck/pricing.js";
import { traditionalName } from "../../app/lib/deck/prompts.js";
import { recordLedger, reserve } from "./store.js";

const schema = z.object({
  subject: z.string().describe("The rewritten subject: what is visibly in the picture"),
  composition: z.string().describe("The rewritten composition"),
  whatChanged: z.string().describe("One or two sentences for the artist on what you changed and why"),
});

export async function rewriteRefusedBrief(opts: {
  deckId: string;
  apiKey: string;
  card: { cardId: number; name: string; meaning: string; subject: string; composition: string };
  violations: string[];
  styleSummary: string;
}) {
  const release = await reserve(opts.deckId, CRITIQUE_RESERVE_MICROS);
  try {
    const openai = createOpenAI({ apiKey: opts.apiKey });
    const { card } = opts;
    const { output, usage } = await generateText({
      model: openai(TEXT_MODEL),
      output: Output.object({ schema }),
      providerOptions: { openai: { reasoningEffort: "low", store: false } },
      prompt: `OpenAI's image safety system refused this tarot card brief${opts.violations.length ? `, flagging: ${opts.violations.join(", ")}` : ""}.
Rewrite the SUBJECT and COMPOSITION so an image model will accept it, while keeping the card's meaning, its characters and their recognisable traits. Change only what the flags require. Keep it medium-neutral: never mention the medium, printing process or palette names.

Rules: remove anything that reads as self-harm, violence, injury, death of a person, nudity or restraint. Replace physical peril with symbolic, calm, or impossible-but-gentle imagery (for a Hanged Man: the figure floats upside down, unsupported, serene, as if gravity were reversed; never hanging, tied or suspended by a limb, rope or branch). Avoid words like gaunt, emaciated, wounded, bleeding, dead, corpse, noose, hanging, chained, choking, bound. No lettering in the picture.

Card: ${traditionalName(card.cardId)} — "${card.name}"
Meaning: ${card.meaning || "(not specified)"}
SUBJECT: ${card.subject}
COMPOSITION: ${card.composition}`,
    });
    await recordLedger({
      deckId: opts.deckId,
      purpose: "rewrite",
      model: TEXT_MODEL,
      usage: usage as unknown as Record<string, unknown>,
      estimateMicros: CRITIQUE_RESERVE_MICROS,
      costMicros: textUsageMicros(TEXT_MODEL, {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens,
      }),
    });
    await db
      .update(labDeckCards)
      .set({ subject: output.subject, composition: output.composition, updatedAt: new Date() })
      .where(and(eq(labDeckCards.deckId, opts.deckId), eq(labDeckCards.cardId, card.cardId)));
    return output;
  } finally {
    release();
  }
}

/** Pull the flagged categories out of an OpenAI safety error message. */
export function violationsFrom(error: string | null | undefined): string[] {
  const m = /safety_violations=\[([^\]]*)\]/.exec(error ?? "");
  return m ? m[1].split(",").map((v) => v.trim()).filter(Boolean) : [];
}
