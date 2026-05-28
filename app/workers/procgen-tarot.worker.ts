import { generateCard, CARD_DATA } from "../lib/procgen-tarot";
import type { GenOptions } from "../lib/procgen-tarot";

export type WorkerRequest =
  | { type: "generate-one"; cardId: number; deckSeed: number; opts?: GenOptions }
  | { type: "generate-all"; deckSeed: number; opts?: GenOptions };

export type WorkerResponse =
  | { type: "card-done"; cardId: number; cardBitmap: ImageBitmap; maskBitmap: ImageBitmap; ms: number }
  | { type: "all-done"; ms: number }
  | { type: "error"; message: string };

async function svgToBitmap(svgStr: string, width: number, height: number): Promise<ImageBitmap> {
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const bitmap = await createImageBitmap(blob, { resizeWidth: width, resizeHeight: height });
  return bitmap;
}

const RENDER_W = 376;
const RENDER_H = 634;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === "generate-one") {
      const t = performance.now();
      const { svg, maskSvg } = generateCard(req.cardId, req.deckSeed, req.opts);
      const [cardBitmap, maskBitmap] = await Promise.all([
        svgToBitmap(svg, RENDER_W, RENDER_H),
        svgToBitmap(maskSvg, RENDER_W, RENDER_H),
      ]);
      const ms = Math.round(performance.now() - t);
      self.postMessage(
        { type: "card-done", cardId: req.cardId, cardBitmap, maskBitmap, ms } satisfies WorkerResponse,
        // @ts-expect-error transfer bitmaps
        [cardBitmap, maskBitmap],
      );
    } else if (req.type === "generate-all") {
      const t0 = performance.now();
      for (let id = 0; id < CARD_DATA.length; id++) {
        const t = performance.now();
        const { svg, maskSvg } = generateCard(id, req.deckSeed, req.opts);
        const [cardBitmap, maskBitmap] = await Promise.all([
          svgToBitmap(svg, RENDER_W, RENDER_H),
          svgToBitmap(maskSvg, RENDER_W, RENDER_H),
        ]);
        const ms = Math.round(performance.now() - t);
        self.postMessage(
          { type: "card-done", cardId: id, cardBitmap, maskBitmap, ms } satisfies WorkerResponse,
          // @ts-expect-error transfer bitmaps
          [cardBitmap, maskBitmap],
        );
      }
      self.postMessage({ type: "all-done", ms: Math.round(performance.now() - t0) } satisfies WorkerResponse);
    }
  } catch (err) {
    self.postMessage({ type: "error", message: String(err) } satisfies WorkerResponse);
  }
};
