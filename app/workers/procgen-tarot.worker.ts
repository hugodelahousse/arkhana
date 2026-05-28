import { generateCard, CARD_DATA } from "../lib/procgen-tarot";
import type { GenOptions } from "../lib/procgen-tarot";

export type WorkerRequest =
  | { type: "generate-one"; cardId: number; deckSeed: number; opts?: GenOptions }
  | { type: "generate-all"; deckSeed: number; opts?: GenOptions };

export type WorkerResponse =
  | { type: "card-done"; cardId: number; ms: number }
  | { type: "all-done"; ms: number }
  | { type: "error"; message: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === "generate-one") {
      const t = performance.now();
      generateCard(req.cardId, req.deckSeed, req.opts);
      const ms = Math.round(performance.now() - t);
      self.postMessage({ type: "card-done", cardId: req.cardId, ms } satisfies WorkerResponse);
    } else if (req.type === "generate-all") {
      const t0 = performance.now();
      for (let id = 0; id < CARD_DATA.length; id++) {
        const t = performance.now();
        generateCard(id, req.deckSeed, req.opts);
        const ms = Math.round(performance.now() - t);
        self.postMessage({ type: "card-done", cardId: id, ms } satisfies WorkerResponse);
      }
      self.postMessage({ type: "all-done", ms: Math.round(performance.now() - t0) } satisfies WorkerResponse);
    }
  } catch (err) {
    self.postMessage({ type: "error", message: String(err) } satisfies WorkerResponse);
  }
};
