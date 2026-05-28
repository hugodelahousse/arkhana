import { generateCard, CARD_DATA } from "../lib/procgen-tarot";
import type { GenOptions } from "../lib/procgen-tarot";

export type WorkerRequest =
  | { type: "generate-one"; cardId: number; deckSeed: number; opts?: GenOptions }
  | { type: "generate-all"; deckSeed: number; opts?: GenOptions };

export type WorkerResponse =
  | { type: "card-done"; cardId: number; cardBlob: Blob; maskBlob: Blob; ms: number }
  | { type: "all-done"; ms: number }
  | { type: "error"; message: string };

const W = 376;
const H = 634;

async function svgToPngBlob(svg: string): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const bitmap = await createImageBitmap(svgBlob, {
    resizeWidth: W * 2,
    resizeHeight: H * 2,
    resizeQuality: "high",
  });
  const canvas = new OffscreenCanvas(W * 2, H * 2);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.convertToBlob({ type: "image/png" });
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === "generate-one") {
      const t = performance.now();
      const { svg, maskSvg } = generateCard(req.cardId, req.deckSeed, req.opts);
      const [cardBlob, maskBlob] = await Promise.all([
        svgToPngBlob(svg),
        svgToPngBlob(maskSvg),
      ]);
      const ms = Math.round(performance.now() - t);
      self.postMessage({ type: "card-done", cardId: req.cardId, cardBlob, maskBlob, ms } satisfies WorkerResponse);
    } else if (req.type === "generate-all") {
      const t0 = performance.now();
      for (let id = 0; id < CARD_DATA.length; id++) {
        const t = performance.now();
        const { svg, maskSvg } = generateCard(id, req.deckSeed, req.opts);
        const [cardBlob, maskBlob] = await Promise.all([
          svgToPngBlob(svg),
          svgToPngBlob(maskSvg),
        ]);
        const ms = Math.round(performance.now() - t);
        self.postMessage({ type: "card-done", cardId: id, cardBlob, maskBlob, ms } satisfies WorkerResponse);
      }
      self.postMessage({ type: "all-done", ms: Math.round(performance.now() - t0) } satisfies WorkerResponse);
    }
  } catch (err) {
    self.postMessage({ type: "error", message: String(err) } satisfies WorkerResponse);
  }
};
