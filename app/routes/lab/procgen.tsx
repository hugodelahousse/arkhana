import { useCallback, useEffect, useRef, useState } from "react";
import { CARD_DATA } from "../../lib/procgen-tarot";
import type { GenOptions } from "../../lib/procgen-tarot";
import type { WorkerRequest, WorkerResponse } from "../../workers/procgen-tarot.worker";
import { TarotCard } from "../../components/TarotCard";
import { CARDS, RARITY_LABELS } from "../../lib/cards";
import type { Rarity } from "../../lib/cards";
import { rasterizeSvg } from "../../lib/rasterizeSvg";

const DEFAULT_SEED = 12345;

const PALETTE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Auto" },
  { value: "RWS", label: "RWS" },
  { value: "gobelin", label: "Gobelin" },
  { value: "viscontiSforza", label: "Visconti-Sforza" },
  { value: "wildwood", label: "Wildwood" },
];

type CardState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "rasterizing" }
  | { status: "done"; cardUrl: string; maskUrl: string; ms: number };

export function meta() {
  return [{ title: "Procgen Tarot — Lab" }];
}

export default function ProcgenLab() {
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [palette, setPalette] = useState("");
  const [minThickness, setMinThickness] = useState(1);
  const [maxThickness, setMaxThickness] = useState(3);
  const [selectedId, setSelectedId] = useState(0);
  const [cards, setCards] = useState<Record<number, CardState>>({});
  const [allStatus, setAllStatus] = useState<"idle" | "running" | "done">("idle");
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [rarity, setRarity] = useState<Rarity>(3);
  const [parallax, setParallax] = useState(true);
  const [parallaxAmount, setParallaxAmount] = useState(8);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const w = new Worker(
      new URL("../../workers/procgen-tarot.worker.ts", import.meta.url),
      { type: "module" }
    );
    workerRef.current = w;
    w.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "card-done") {
        setCards(prev => ({
          ...prev,
          [msg.cardId]: { status: "rasterizing" },
        }));
        setSelectedId(msg.cardId);
        const genMs = msg.ms;
        Promise.all([
          rasterizeSvg(msg.cardSvg),
          rasterizeSvg(msg.maskSvg),
        ]).then(([cardUrl, maskUrl]) => {
          setCards(prev => {
            const old = prev[msg.cardId];
            if (old && old.status === "done") {
              URL.revokeObjectURL(old.cardUrl);
              URL.revokeObjectURL(old.maskUrl);
            }
            return { ...prev, [msg.cardId]: { status: "done", cardUrl, maskUrl, ms: genMs } };
          });
        }).catch((err) => {
          console.error("Rasterize error:", err);
        });
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

  function buildOpts(): GenOptions {
    return {
      palette: palette || undefined,
      minThickness,
      maxThickness,
    };
  }

  function generateOne(cardId: number) {
    setCards(prev => ({ ...prev, [cardId]: { status: "generating" } }));
    post({ type: "generate-one", cardId, deckSeed: seed, opts: buildOpts() });
  }

  function generateAll() {
    const initialState: Record<number, CardState> = {};
    CARD_DATA.forEach(c => { initialState[c.id] = { status: "generating" }; });
    setCards(initialState);
    setAllStatus("running");
    setTotalMs(null);
    post({ type: "generate-all", deckSeed: seed, opts: buildOpts() });
  }

  const currentCard = CARD_DATA[selectedId];
  const currentState = cards[selectedId] ?? { status: "idle" };
  const doneCount = Object.values(cards).filter(s => s.status === "done").length;

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center gap-6">
        <span className="text-ghost-foreground text-xs uppercase tracking-widest">Arkhana</span>
        <span className="text-ghost-foreground">/</span>
        <a href="/lab/cards" className="text-ghost-foreground text-xs uppercase tracking-widest hover:text-muted-foreground transition-colors">Lab</a>
        <span className="text-ghost-foreground">/</span>
        <span className="text-xs uppercase tracking-widest">Procgen Tarot</span>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="p-4 border-b border-border space-y-4">
            {/* Seed */}
            <label className="block">
              <span className="text-ghost-foreground text-[10px] uppercase tracking-wider">Deck seed</span>
              <input
                type="number"
                value={seed}
                onChange={e => setSeed(Number(e.target.value))}
                className="mt-1 w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring"
              />
            </label>

            {/* Palette */}
            <label className="block">
              <span className="text-ghost-foreground text-[10px] uppercase tracking-wider">Palette</span>
              <select
                value={palette}
                onChange={e => setPalette(e.target.value)}
                className="mt-1 w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring cursor-pointer"
              >
                {PALETTE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>

            {/* Stroke thickness */}
            <div className="space-y-2">
              <span className="text-ghost-foreground text-[10px] uppercase tracking-wider">Stroke weight</span>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-7 shrink-0">Min</span>
                <input
                  type="range"
                  min={0.5} max={6} step={0.5}
                  value={minThickness}
                  onChange={e => setMinThickness(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="w-6 text-right tabular-nums text-ghost-foreground">{minThickness}</span>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="w-7 shrink-0">Max</span>
                <input
                  type="range"
                  min={1} max={10} step={0.5}
                  value={maxThickness}
                  onChange={e => setMaxThickness(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <span className="w-6 text-right tabular-nums text-ghost-foreground">{maxThickness}</span>
              </label>
            </div>

            {/* Rarity */}
            <label className="block">
              <span className="text-ghost-foreground text-[10px] uppercase tracking-wider">Rarity</span>
              <select
                value={rarity}
                onChange={e => setRarity(Number(e.target.value) as Rarity)}
                className="mt-1 w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring cursor-pointer"
              >
                {([1, 2, 3, 4, 5] as Rarity[]).map(r => (
                  <option key={r} value={r}>{r} — {RARITY_LABELS[r]}</option>
                ))}
              </select>
            </label>

            {/* Parallax */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-ghost-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={parallax}
                  onChange={e => setParallax(e.target.checked)}
                  className="accent-accent"
                />
                Parallax
              </label>
              {parallax && (
                <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="w-12 shrink-0">Amount</span>
                  <input
                    type="range"
                    min={0} max={20} step={1}
                    value={parallaxAmount}
                    onChange={e => setParallaxAmount(Number(e.target.value))}
                    className="flex-1 accent-accent"
                  />
                  <span className="w-6 text-right tabular-nums text-ghost-foreground">{parallaxAmount}</span>
                </label>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => generateOne(selectedId)}
                disabled={currentState.status === "generating" || allStatus === "running"}
                className="flex-1 py-1.5 px-2 text-[0.65rem] tracking-[0.12em] uppercase cursor-pointer border border-border bg-transparent text-primary font-serif hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Generate card
              </button>
              <button
                onClick={generateAll}
                disabled={allStatus === "running"}
                className="flex-1 py-1.5 px-2 text-[0.65rem] tracking-[0.12em] uppercase cursor-pointer border border-primary bg-transparent text-primary font-serif hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  ].join(" ")}
                >
                  <StatusDot state={state} />
                  <span className="truncate">{card.name}</span>
                  {state.status === "done" && (
                    <span className="ml-auto text-ghost-foreground shrink-0">{state.ms}ms</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-3 border-b border-border flex items-center gap-4">
            <div>
              <div className="text-sm font-semibold text-foreground">{currentCard.name}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {currentCard.arcana === "major"
                  ? `Major Arcana · ${currentCard.number}`
                  : `${currentCard.suit} · ${currentCard.number}`}
              </div>
            </div>
            {currentState.status === "done" && (
              <div className="ml-auto flex gap-3 items-center">
                <span className="text-xs text-ghost-foreground">{currentState.ms}ms</span>
                <a
                  href={currentState.cardUrl}
                  download={`${currentCard.name.toLowerCase().replace(/\s+/g, "-")}.png`}
                  className="text-[0.65rem] tracking-[0.1em] uppercase px-3 py-1 border border-border bg-transparent text-primary font-serif hover:opacity-80 transition-opacity"
                >
                  Download PNG
                </a>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-card">
            {currentState.status === "idle" && (
              <div className="text-ghost-foreground text-sm">Select a card or click Generate</div>
            )}
            {(currentState.status === "generating" || currentState.status === "rasterizing") && (
              <div className="text-muted-foreground text-sm animate-pulse">
                {currentState.status === "generating" ? "Generating..." : "Rasterizing..."}
              </div>
            )}
            {currentState.status === "done" && (
              <TarotCard
                key={`${selectedId}-${currentState.cardUrl}`}
                card={CARDS[selectedId]}
                rarityScore={rarity}
                isReversed={false}
                isRadiant={false}
                revealed={true}
                size="lg"
                imageUrl={currentState.cardUrl}
                maskUrl={currentState.maskUrl}
                procgenParallax={parallax ? parallaxAmount : 0}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusDot({ state }: { state: CardState }) {
  if (state.status === "generating" || state.status === "rasterizing") {
    return <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />;
  }
  if (state.status === "done") {
    return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />;
  }
  return <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />;
}
