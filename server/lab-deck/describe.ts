// "Describe from references": characters stay consistent through their text
// descriptions, so user reference images are turned into description text
// (never passed to card calls, where their rendering would leak into the art).
import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { labDeckCast } from "../../db/schema/lab-deck.js";
import { CRITIQUE_RESERVE_MICROS, TEXT_MODEL, textUsageMicros } from "../../app/lib/deck/pricing.js";
import { readRef, recordLedger, reserve, type DeckState } from "./store.js";

const schema = z.object({
  description: z.string().describe("The character's full updated description"),
  added: z.string().describe("One sentence for the artist on what the references added or corrected"),
});

export async function describeFromReferences(opts: { deckId: string; apiKey: string; member: DeckState["cast"][number] }) {
  const { member } = opts;
  if (!member.refImageIds.length) throw new Error("Add a reference image first.");
  const release = await reserve(opts.deckId, CRITIQUE_RESERVE_MICROS);
  try {
    const images = await Promise.all(member.refImageIds.slice(0, 4).map((id) => readRef(opts.deckId, id)));
    const openai = createOpenAI({ apiKey: opts.apiKey });
    const { output, usage } = await generateText({
      model: openai(TEXT_MODEL),
      output: Output.object({ schema }),
      providerOptions: { openai: { reasoningEffort: "low", store: false } },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `These are reference images of ${member.name} (${member.kind}) for a tarot deck. Update their description so an illustrator who never sees the images draws them recognisably on every card.

Keep everything in the current description that the images don't contradict. Add what the images show about lasting appearance: face and features, hair, build and apparent age, usual costume and its colours, distinctive marks, companions, signature items. Be specific and concrete. Describe the subject only: never describe the images' art style, medium, lighting or rendering. No lettering.

Current description: ${member.description || "(none yet)"}`,
            },
            ...images.map((img) => ({ type: "file" as const, mediaType: img.mime, data: img.data })),
          ],
        },
      ],
    });
    await recordLedger({
      deckId: opts.deckId,
      purpose: "describe",
      model: TEXT_MODEL,
      usage: usage as unknown as Record<string, unknown>,
      estimateMicros: CRITIQUE_RESERVE_MICROS,
      costMicros: textUsageMicros(TEXT_MODEL, {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.inputTokenDetails?.cacheReadTokens,
      }),
    });
    await db.update(labDeckCast).set({ description: output.description }).where(eq(labDeckCast.id, member.id));
    return output;
  } finally {
    release();
  }
}
