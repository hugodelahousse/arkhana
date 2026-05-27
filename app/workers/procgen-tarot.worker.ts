import { generateCard, CARD_DATA } from "../lib/procgen-tarot";

export type WorkerRequest =
  | { type: "generate-one"; cardId: number; deckSeed: number }
  | { type: "generate-all"; deckSeed: number };

export type WorkerResponse =
  | { type: "card-done"; cardId: number; svg: string; ms: number }
  | { type: "all-done"; ms: number }
  | { type: "error"; message: string };

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data;
  try {
    if (req.type === "generate-one") {
      const t = performance.now();
      const svg = generateCard(req.cardId, req.deckSeed);
      const ms = Math.round(performance.now() - t);
      self.postMessage({ type: "card-done", cardId: req.cardId, svg, ms } satisfies WorkerResponse);
    } else if (req.type === "generate-all") {
      const t0 = performance.now();
      for (let id = 0; id < CARD_DATA.length; id++) {
        const t = performance.now();
        const svg = generateCard(id, req.deckSeed);
        const ms = Math.round(performance.now() - t);
        self.postMessage({ type: "card-done", cardId: id, svg, ms } satisfies WorkerResponse);
      }
      self.postMessage({ type: "all-done", ms: Math.round(performance.now() - t0) } satisfies WorkerResponse);
    }
  } catch (err) {
    self.postMessage({ type: "error", message: String(err) } satisfies WorkerResponse);
  }
};
