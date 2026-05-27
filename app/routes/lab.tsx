import { useCallback, useEffect, useRef, useState } from "react";
import { CARD_DATA } from "../lib/procgen-tarot";
import type { WorkerRequest, WorkerResponse } from "../workers/procgen-tarot.worker";

const DEFAULT_SEED = 12345;

type CardState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "done"; svg: string; ms: number };

export function meta() {
  return [{ title: "Procgen Tarot Lab" }];
}

export default function Lab() {
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [selectedId, setSelectedId] = useState(0);
  const [cards, setCards] = useState<Record<number, CardState>>({});
  const [allStatus, setAllStatus] = useState<"idle" | "running" | "done">("idle");
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Spin up worker once
  useEffect(() => {
    const w = new Worker(
      new URL("../workers/procgen-tarot.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = w;
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "card-done") {
        setCards(prev => ({
          ...prev,
          [msg.cardId]: { status: "done", svg: msg.svg, ms: msg.ms },
        }));
        setSelectedId(msg.cardId);
      } else if (msg.type === "all-done") {
        setAllStatus("done");
        setTotalMs(msg.ms);
      } else if (msg.type === "error") {
        console.error("Worker error:", msg.message);
      }
    };
    return () => w.terminate();
  }, []);

  const post = useCallback((req: WorkerRequest) => {
    workerRef.current?.postMessage(req);
  }, []);

  function generateOne(cardId: number) {
    setCards(prev => ({ ...prev, [cardId]: { status: "generating" } }));
    post({ type: "generate-one", cardId, deckSeed: seed });
  }

  function generateAll() {
    const initialState: Record<number, CardState> = {};
    CARD_DATA.forEach(c => { initialState[c.id] = { status: "generating" }; });
    setCards(initialState);
    setAllStatus("running");
    setTotalMs(null);
    post({ type: "generate-all", deckSeed: seed });
  }

  const currentCard = CARD_DATA[selectedId];
  const currentState = cards[selectedId] ?? { status: "idle" };

  const doneCount = Object.values(cards).filter(s => s.status === "done").length;

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white font-mono">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-6">
        <span className="text-white/40 text-xs uppercase tracking-widest">Arkhana</span>
        <span className="text-white/20">/</span>
        <span className="text-xs uppercase tracking-widest">Procgen Tarot Lab</span>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Sidebar */}
        <aside className="w-64 border-r border-white/10 flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="p-4 border-b border-white/10 space-y-3">
            <label className="block">
              <span className="text-white/40 text-xs uppercase tracking-wider">Deck seed</span>
              <input
                type="number"
                value={seed}
                onChange={e => setSeed(Number(e.target.value))}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-white/30"
              />
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => generateOne(selectedId)}
                disabled={currentState.status === "generating" || allStatus === "running"}
                className="flex-1 text-xs py-1.5 px-2 bg-white/10 hover:bg-white/15 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Generate card
              </button>
              <button
                onClick={generateAll}
                disabled={allStatus === "running"}
                className="flex-1 text-xs py-1.5 px-2 bg-indigo-600/60 hover:bg-indigo-600/80 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {allStatus === "running"
                  ? `${doneCount}/78`
                  : allStatus === "done"
                  ? `Done (${((totalMs ?? 0) / 1000).toFixed(1)}s)`
                  : "Generate all"}
              </button>
            </div>
          </div>

          {/* Card list */}
          <div className="flex-1 overflow-y-auto">
            {CARD_DATA.map(card => {
              const state = cards[card.id] ?? { status: "idle" };
              return (
                <button
                  key={card.id}
                  onClick={() => {
                    setSelectedId(card.id);
                    if (state.status === "idle") generateOne(card.id);
                  }}
                  className={[
                    "w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors",
                    selectedId === card.id
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:bg-white/5 hover:text-white/80",
                  ].join(" ")}
                >
                  <StatusDot state={state} />
                  <span className="truncate">{card.name}</span>
                  {state.status === "done" && (
                    <span className="ml-auto text-white/25 shrink-0">{state.ms}ms</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-3 border-b border-white/10 flex items-center gap-4">
            <div>
              <div className="text-sm font-semibold">{currentCard.name}</div>
              <div className="text-xs text-white/40 capitalize">
                {currentCard.arcana === "major"
                  ? `Major Arcana · ${currentCard.number}`
                  : `${currentCard.suit} · ${currentCard.number}`}
              </div>
            </div>
            {currentState.status === "done" && (
              <div className="ml-auto flex gap-3 items-center">
                <span className="text-xs text-white/30">{currentState.ms}ms</span>
                <a
                  href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(currentState.svg)}`}
                  download={`${currentCard.name.toLowerCase().replace(/\s+/g, "-")}.svg`}
                  className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
                >
                  Download SVG
                </a>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[#06060e]">
            {currentState.status === "idle" && (
              <div className="text-white/20 text-sm">Select a card or click Generate</div>
            )}
            {currentState.status === "generating" && (
              <div className="text-white/40 text-sm animate-pulse">Generating…</div>
            )}
            {currentState.status === "done" && (
              <div
                className="shadow-2xl"
                style={{ width: 300, height: 500 }}
                dangerouslySetInnerHTML={{ __html: currentState.svg }}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusDot({ state }: { state: CardState }) {
  if (state.status === "generating") {
    return <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />;
  }
  if (state.status === "done") {
    return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />;
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-white/15 shrink-0" />;
}
