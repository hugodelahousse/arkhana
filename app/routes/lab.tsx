import { useState } from "react";
import { CARD_DATA } from "../lib/procgen-tarot";

const DEFAULT_SEED = 12345;

export function meta() {
  return [{ title: "Procgen Tarot Lab" }];
}

export default function Lab() {
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [selectedId, setSelectedId] = useState(0);
  const [generating, setGenerating] = useState(false);

  const currentCard = CARD_DATA[selectedId];
  const imgUrl = `/api/procgen.png?id=${selectedId}&seed=${seed}&w=752`;

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center gap-6">
        <span className="text-ghost-foreground text-xs uppercase tracking-widest">Arkhana</span>
        <span className="text-ghost-foreground">/</span>
        <span className="text-xs uppercase tracking-widest">Procgen Tarot Lab</span>
      </div>

      <div className="flex h-[calc(100dvh-57px)]">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border flex flex-col overflow-hidden">
          {/* Controls */}
          <div className="p-4 border-b border-border space-y-3">
            <label className="block">
              <span className="text-ghost-foreground text-xs uppercase tracking-wider">Deck seed</span>
              <input
                type="number"
                value={seed}
                onChange={e => setSeed(Number(e.target.value))}
                className="mt-1 w-full bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground focus:outline-none focus:border-ring"
              />
            </label>
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
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-card">
            <img
              src={imgUrl}
              alt={currentCard.name}
              className="shadow-2xl"
              style={{ width: 300, height: "auto" }}
              onLoadStart={() => setGenerating(true)}
              onLoad={() => setGenerating(false)}
            />
            {generating && (
              <div className="absolute text-muted-foreground text-sm animate-pulse">Generating…</div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
