// OpenAI image calls for the lab deck builder. The user's key is passed in
// per call and only lives in memory for the duration of the job.
import OpenAI, { toFile } from "openai";
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { labDeckImages } from "../../db/schema/lab-deck.js";
import {
  IMAGE_MODELS,
  TEXT_MODEL,
  WINDOW_SIZE,
  estimateImageMicros,
  imageUsageMicros,
  type ImageQuality,
} from "../../app/lib/deck/pricing.js";
import { newId, observedOutputTokens, readRef, recordLedger, saveFile } from "./store.js";

export type ImageJob = {
  deckId: string;
  kind: "probe" | "anchor" | "draft" | "final" | "back";
  cardId?: number;
  castId?: string;
  model: string;
  quality: ImageQuality;
  prompt: string;
  refIds: string[];
  /** Output size; defaults to the card's art window. Card backs use the full card. */
  size?: string;
};

/**
 * The render queue lives in memory, so a server restart orphans whatever was queued or running.
 * Mark those as failed at startup so the UI stops showing them in progress and lets them be
 * rendered again. Runs once per process (dev reloads re-import this module mid-job).
 */
export async function failInterruptedJobs(): Promise<number> {
  const g = globalThis as { __labDeckJobsSwept?: boolean };
  if (g.__labDeckJobsSwept) return 0;
  g.__labDeckJobsSwept = true;
  const rows = await db
    .update(labDeckImages)
    .set({ status: "error", error: "Interrupted: the server restarted before this finished. Render it again." })
    .where(inArray(labDeckImages.status, ["queued", "running"]))
    .returning({ id: labDeckImages.id });
  return rows.length;
}

export async function estimateJob(job: Pick<ImageJob, "model" | "quality" | "prompt" | "refIds" | "size">) {
  const size = job.size ?? WINDOW_SIZE;
  return estimateImageMicros({
    quality: job.quality,
    size,
    promptChars: job.prompt.length,
    refCount: job.refIds.length,
    // Observed token counts are per (model, quality) at the window size only.
    observedOutputTokens: size === WINDOW_SIZE ? await observedOutputTokens(job.model, job.quality) : undefined,
  });
}

/** Insert queued rows for a batch so the UI can show placeholders immediately. */
export async function queueImages(jobs: ImageJob[]) {
  const rows = jobs.map((j) => ({
    id: newId(),
    deckId: j.deckId,
    kind: j.kind,
    cardId: j.cardId ?? null,
    castId: j.castId ?? null,
    status: "queued",
    model: j.model,
    quality: j.quality,
    size: j.size ?? WINDOW_SIZE,
    prompt: j.prompt,
    refIds: j.refIds,
  }));
  if (rows.length) await db.insert(labDeckImages).values(rows);
  return rows.map((r) => r.id);
}

// Small per-process concurrency limiter for image calls.
let running = 0;
const waiting: (() => void)[] = [];
const MAX_CONCURRENT = 4;
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

export function friendlyOpenAIError(err: unknown): string {
  // openai SDK errors carry `status`; AI SDK APICallErrors carry `statusCode`.
  const e = err as { status?: number; statusCode?: number; message?: string };
  const status = e?.status ?? e?.statusCode;
  const msg = e?.message ?? String(err);
  if (/no credits|insufficient_quota|billing/i.test(msg)) return "Your OpenAI account is out of credit. Top up at platform.openai.com/settings/organization/billing, then retry.";
  if (/verify|verification/i.test(msg)) return "Your OpenAI organization must be verified to use GPT Image models (platform.openai.com/settings/organization/general).";
  if (status === 401 || /invalid_api_key|Incorrect API key/i.test(msg)) return "OpenAI rejected the API key.";
  if (/safety|moderation|content policy|rejected/i.test(msg)) return `OpenAI refused this image on content-policy grounds. Try a more symbolic, less graphic brief. (${msg})`;
  if (status === 429) return "OpenAI rate limit hit; wait a moment and retry.";
  return msg.slice(0, 400);
}

/** Run one queued image job to completion. Never throws. */
export async function runImageJob(imageId: string, job: ImageJob, apiKey: string, estimateMicros: number, release: () => void) {
  await slot(async () => {
    await db.update(labDeckImages).set({ status: "running" }).where(eq(labDeckImages.id, imageId));
    try {
      const client = new OpenAI({ apiKey, maxRetries: 1, timeout: 240_000 });
      const common = {
        model: job.model,
        prompt: job.prompt,
        size: job.size ?? WINDOW_SIZE,
        quality: job.quality,
        output_format: "jpeg" as const,
      };
      const res = job.refIds.length
        ? await client.images.edit({
            ...common,
            image: await Promise.all(
              job.refIds.map(async (id) => {
                const r = await readRef(job.deckId, id);
                return toFile(r.data, r.name, { type: r.mime });
              })
            ),
          })
        : await client.images.generate(common);

      const b64 = res.data?.[0]?.b64_json;
      if (!b64) throw new Error("OpenAI returned no image");
      const file = `${imageId}.jpg`;
      await saveFile(job.deckId, file, Buffer.from(b64, "base64"));
      const usage = (res.usage ?? {}) as Parameters<typeof imageUsageMicros>[0];
      const cost = imageUsageMicros(usage);
      await recordLedger({
        deckId: job.deckId,
        imageId,
        purpose: job.kind,
        model: job.model,
        usage: usage as Record<string, unknown>,
        estimateMicros,
        costMicros: cost,
      });
      await db.update(labDeckImages).set({ status: "done", file, costMicros: cost }).where(eq(labDeckImages.id, imageId));
      release();

    } catch (err) {
      release();
      await db
        .update(labDeckImages)
        .set({ status: "error", error: friendlyOpenAIError(err) })
        .where(eq(labDeckImages.id, imageId));
    }
  });
}

/** Cheap key check: can this key see the GPT Image 2.6 models? */
export async function preflight(apiKey: string) {
  try {
    const client = new OpenAI({ apiKey, maxRetries: 0, timeout: 20_000 });
    const ids: string[] = [];
    for await (const m of client.models.list()) ids.push(m.id);
    const missing = [IMAGE_MODELS.draft, IMAGE_MODELS.final, TEXT_MODEL].filter((m) => !ids.includes(m));
    return missing.length
      ? { ok: false as const, error: `This key can't access: ${missing.join(", ")}. Your organization may need verification.` }
      : { ok: true as const };
  } catch (err) {
    return { ok: false as const, error: friendlyOpenAIError(err) };
  }
}
