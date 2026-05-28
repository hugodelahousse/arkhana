import { generateCard, CARD_DATA } from "../lib/procgen-tarot";
import type { GenOptions } from "../lib/procgen-tarot";

export type WorkerRequest =
  | { type: "generate-one"; cardId: number; deckSeed: number; opts?: GenOptions }
  | { type: "generate-all"; deckSeed: number; opts?: GenOptions };

export type WorkerResponse =
  | { type: "card-done"; cardId: number; cardDataUrl: string; maskDataUrl: string; ms: number }
  | { type: "all-done"; ms: number }
  | { type: "error"; message: string };

function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === "generate-one") {
      const t = performance.now();
      const { svg, maskSvg } = generateCard(req.cardId, req.deckSeed, req.opts);
      const cardDataUrl = svgToDataUrl(svg);
      const maskDataUrl = svgToDataUrl(maskSvg);
      const ms = Math.round(performance.now() - t);
      self.postMessage({ type: "card-done", cardId: req.cardId, cardDataUrl, maskDataUrl, ms } satisfies WorkerResponse);
    } else if (req.type === "generate-all") {
      const t0 = performance.now();
      for (let id = 0; id < CARD_DATA.length; id++) {
        const t = performance.now();
        const { svg, maskSvg } = generateCard(id, req.deckSeed, req.opts);
        const cardDataUrl = svgToDataUrl(svg);
        const maskDataUrl = svgToDataUrl(maskSvg);
        const ms = Math.round(performance.now() - t);
        self.postMessage({ type: "card-done", cardId: id, cardDataUrl, maskDataUrl, ms } satisfies WorkerResponse);
      }
      self.postMessage({ type: "all-done", ms: Math.round(performance.now() - t0) } satisfies WorkerResponse);
    }
  } catch (err) {
    self.postMessage({ type: "error", message: String(err) } satisfies WorkerResponse);
  }
};
