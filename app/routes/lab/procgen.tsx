import { useState } from "react";
import { CARD_DATA } from "../../lib/procgen-tarot";
import type { GenOptions } from "../../lib/procgen-tarot";
import { TarotCard } from "../../components/TarotCard";
import { CARDS, RARITY_LABELS } from "../../lib/cards";
import type { Rarity } from "../../lib/cards";

const DEFAULT_SEED = 12345;

const PALETTE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Auto" },
  { value: "RWS", label: "RWS" },
  { value: "gobelin", label: "Gobelin" },
  { value: "viscontiSforza", label: "Visconti-Sforza" },
  { value: "wildwood", label: "Wildwood" },
];

export function meta() {
  return [{ title: "Procgen Tarot — Lab" }];
}

function buildUrl(cardId: number, seed: number, palette: string, w = 752): string {
  const params = new URLSearchParams({ id: String(cardId), seed: String(seed), w: String(w) });
  if (palette) params.set("palette", palette);
  return `/api/procgen.png?${params}`;
}

export default function ProcgenLab() {
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [palette, setPalette] = useState("");
  const [selectedId, setSelectedId] = useState(0);
  const [rarity, setRarity] = useState<Rarity>(3);
  const [parallax, setParallax] = useState(true);
  const [parallaxAmount, setParallaxAmount] = useState(8);
  const [view, setView] = useState<"single" | "grid">("single");
  // Bump to force re-fetch after seed/palette change
  const [gen, setGen] = useState(0);

  const currentCard = CARD_DATA[selectedId];
  const imgUrl = buildUrl(selectedId, seed, palette);

  function regenerate() {
    setGen(g => g + 1);
  }

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

      <div className="flex h-[calc(100dvh-57px)]">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="p-4 border-b border-border space-y-4">
            <div>
              <span className="text-ghost-foreground text-[10px] uppercase tracking-wider">Deck seed</span>
              <div className="mt-1 flex gap-1">
                <input
                  type="number"
                  value={seed}
                  onChange={e => setSeed(Number(e.target.value))}
                  className="flex-1 min-w-0 bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring"
                />
                <button
                  onClick={() => setSeed(Math.floor(Math.random() * 2147483647))}
                  className="px-2 py-1.5 bg-muted border border-border rounded text-muted-foreground hover:text-foreground transition-colors text-sm"
                  title="Randomize seed"
                >
                  &#x27F3;
                </button>
              </div>
            </div>

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

            <div className="flex gap-1">
              <button
                onClick={() => setView("single")}
                className={`flex-1 py-1 text-[10px] uppercase tracking-wider rounded ${view === "single" ? "bg-muted text-foreground" : "text-ghost-foreground hover:text-muted-foreground"} transition-colors`}
              >
                Single
              </button>
              <button
                onClick={() => setView("grid")}
                className={`flex-1 py-1 text-[10px] uppercase tracking-wider rounded ${view === "grid" ? "bg-muted text-foreground" : "text-ghost-foreground hover:text-muted-foreground"} transition-colors`}
              >
                Grid
              </button>
            </div>

            <button
              onClick={regenerate}
              className="w-full py-1.5 px-2 text-[0.65rem] tracking-[0.12em] uppercase cursor-pointer border border-border bg-transparent text-primary font-serif hover:opacity-80 transition-opacity"
            >
              Regenerate
            </button>
          </div>

          {/* Card list */}
          <div className="flex-1 overflow-y-auto">
            {CARD_DATA.map(card => (
              <button
                key={card.id}
                onClick={() => setSelectedId(card.id)}
                className={[
                  "w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors",
                  selectedId === card.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                ].join(" ")}
              >
                <span className="truncate">{card.name}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main panel */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b border-border flex items-center gap-4">
            <div>
              <div className="text-sm font-semibold text-foreground">{currentCard.name}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {currentCard.arcana === "major"
                  ? `Major Arcana · ${currentCard.number}`
                  : `${currentCard.suit} · ${currentCard.number}`}
              </div>
            </div>
            <div className="ml-auto flex gap-3 items-center">
              <a
                href={`${imgUrl}&w=1200`}
                download={`${currentCard.name.toLowerCase().replace(/\s+/g, "-")}.png`}
                className="text-[0.65rem] tracking-[0.1em] uppercase px-3 py-1 border border-border bg-transparent text-primary font-serif hover:opacity-80 transition-opacity"
              >
                Download PNG
              </a>
            </div>
          </div>

          <div className={`flex-1 overflow-auto p-8 bg-card ${view === "grid" ? "" : "flex items-center justify-center"}`}>
            {view === "single" && (
              <TarotCard
                key={`${selectedId}-${seed}-${palette}-${gen}`}
                card={CARDS[selectedId]}
                rarityScore={rarity}
                isReversed={false}
                isRadiant={false}
                revealed={true}
                size="lg"
                imageUrl={imgUrl}
                procgenParallax={parallax ? parallaxAmount : 0}
              />
            )}
            {view === "grid" && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
                {CARD_DATA.map(card => (
                  <button
                    key={`${card.id}-${gen}`}
                    onClick={() => { setSelectedId(card.id); setView("single"); }}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <img
                      src={buildUrl(card.id, seed, palette, 200)}
                      alt={card.name}
                      className="w-full rounded shadow-md group-hover:shadow-lg transition-shadow"
                      loading="lazy"
                    />
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight">
                      {card.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
