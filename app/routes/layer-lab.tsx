import { useState, useRef, useCallback, useEffect, memo } from "react";
import { CARDS } from "../lib/cards";
import { cardImageUrl, cardMaskUrl, cardNameMaskUrl, cardTopMaskUrl } from "../lib/cardImages";
import type { CardDefinition } from "../lib/cards";

export function meta() {
  return [{ title: "Layer Lab — Arkhana" }];
}

type Centroids = Record<string, { x: number; y: number }>;

function useCentroids() {
  const [data, setData] = useState<Centroids>({});
  useEffect(() => {
    fetch("/cards/masks/centroids.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);
  return data;
}

interface Config {
  subjectDepth: number;
  subjectFoil: number;
  nameFoil: number;
  topFoil: number;
  glare: number;
}

const DEFAULT_CONFIG: Config = {
  subjectDepth: 5,
  subjectFoil: 0.35,
  nameFoil: 0.4,
  topFoil: 0.4,
  glare: 0.2,
};

function useHover(ref: React.RefObject<HTMLDivElement | null>) {
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current) return;
      const { left, top, width, height } = ref.current.getBoundingClientRect();
      ref.current.style.setProperty("--rx", String((e.clientX - left) / width));
      ref.current.style.setProperty("--ry", String((e.clientY - top) / height));
    },
    [ref],
  );
  const onMouseLeave = useCallback(() => {
    ref.current?.style.setProperty("--rx", "0.5");
    ref.current?.style.setProperty("--ry", "0.5");
  }, [ref]);
  return { onMouseMove, onMouseLeave };
}

function cardCdnSlug(card: CardDefinition): string {
  const prefix = card.arcana === "major" ? "m" : { wands: "w", cups: "c", swords: "s", pentacles: "p" }[card.suit!]!;
  return `${prefix}${String(card.number).padStart(2, "0")}`;
}

const LayeredCard = memo(function LayeredCard({
  card,
  config,
  centroids,
  size,
  onClick,
}: {
  card: CardDefinition;
  config: Config;
  centroids: Centroids;
  size: "sm" | "lg";
  onClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const hover = useHover(ref);
  const imgSrc = cardImageUrl(card.id);
  const maskSrc = cardMaskUrl(card.id);
  const nameMaskSrc = cardNameMaskUrl(card.id);
  const topMaskSrc = cardTopMaskUrl(card.id);
  const isMajor = card.arcana === "major";

  const depthMul = size === "lg" ? 2.5 : 1;
  const foilMul = size === "lg" ? 1.3 : 1;

  return (
    <div
      ref={ref}
      className={`ll-card ll-card-${size}`}
      onMouseMove={hover.onMouseMove}
      onMouseLeave={hover.onMouseLeave}
      onClick={onClick}
      style={{
        "--mask-url": `url(${maskSrc})`,
        "--name-mask-url": `url(${nameMaskSrc})`,
        "--top-mask-url": `url(${topMaskSrc})`,
        "--depth": `${config.subjectDepth * depthMul}px`,
        "--subject-foil": Math.min(1, config.subjectFoil * foilMul),
        "--name-foil": Math.min(1, config.nameFoil * foilMul),
        "--top-foil": isMajor ? Math.min(1, config.topFoil * foilMul) : 0,
        "--glare-opacity": config.glare,
      } as React.CSSProperties}
    >
      <img className="ll-base" src={imgSrc} alt="" draggable={false} />
      <img className="ll-subject" src={imgSrc} alt={card.name} draggable={false} />
      <div className="ll-shine" />
      <div className="ll-name-foil" />
      {isMajor && <div className="ll-top-foil" />}
      {size === "lg" && <div className="ll-glare" />}
    </div>
  );
});

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="ll-ctrl">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
      <span className="ll-ctrl-val">{value}</span>
    </label>
  );
}

function Controls({ config, onChange }: { config: Config; onChange: (c: Config) => void }) {
  const set = <K extends keyof Config>(k: K, v: Config[K]) => onChange({ ...config, [k]: v });
  return (
    <div className="ll-controls">
      <Slider label="Subject depth" value={config.subjectDepth} min={0} max={20} step={1} onChange={(v) => set("subjectDepth", v)} />
      <Slider label="Subject foil" value={config.subjectFoil} min={0} max={1} step={0.05} onChange={(v) => set("subjectFoil", v)} />
      <Slider label="Name foil" value={config.nameFoil} min={0} max={1} step={0.05} onChange={(v) => set("nameFoil", v)} />
      <Slider label="Top foil (major)" value={config.topFoil} min={0} max={1} step={0.05} onChange={(v) => set("topFoil", v)} />
      <Slider label="Glare" value={config.glare} min={0} max={0.6} step={0.05} onChange={(v) => set("glare", v)} />
    </div>
  );
}

export default function LayerLab() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const centroids = useCentroids();
  const selectedCard = selectedId !== null ? CARDS.find((c) => c.id === selectedId) : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-base)", padding: "1.5rem 1rem" }}>
      <style>{layerLabCss}</style>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1
            className="text-xl font-light tracking-widest"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}
          >
            Layer Lab
          </h1>
        </div>

        <Controls config={config} onChange={setConfig} />

        {/* Zoom overlay */}
        {selectedCard && (
          <div className="ll-zoom-overlay" onClick={() => setSelectedId(null)}>
            <div className="ll-zoom-inner" onClick={(e) => e.stopPropagation()}>
              <div className="ll-zoom-card-area">
                <LayeredCard card={selectedCard} config={config} centroids={centroids} size="lg" />
                <div className="ll-zoom-name">{selectedCard.name}</div>
              </div>
              <Controls config={config} onChange={setConfig} />
              <button className="ll-zoom-close" onClick={() => setSelectedId(null)}>✕</button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="ll-grid">
          {CARDS.map((card) => (
            <LayeredCard
              key={card.id}
              card={card}
              config={config}
              centroids={centroids}
              size="sm"
              onClick={() => setSelectedId(card.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const layerLabCss = `
  .ll-card {
    --rx: .5;
    --ry: .5;
    --sp1: hsl(2,   100%, 73%);
    --sp2: hsl(53,  100%, 69%);
    --sp3: hsl(93,  100%, 69%);
    --sp4: hsl(176, 100%, 76%);
    --sp5: hsl(228, 100%, 74%);
    --sp6: hsl(283, 100%, 73%);
    position: relative;
    aspect-ratio: 350 / 600;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
  }

  .ll-base, .ll-subject {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }
  .ll-base { z-index: 1; }

  .ll-subject {
    z-index: 2;
    mask-image: var(--mask-url, none);
    mask-size: cover;
    mask-mode: luminance;
    -webkit-mask-image: var(--mask-url, none);
    -webkit-mask-size: cover;
    -webkit-mask-mode: luminance;
    transform:
      translate(
        calc((var(--rx) - .5) * var(--depth)),
        calc((var(--ry) - .5) * var(--depth))
      );
    filter: drop-shadow(0 2px 8px rgba(0,0,0,.45));
  }

  .ll-shine {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    mix-blend-mode: color-dodge;
    opacity: var(--subject-foil, 0);
    background: conic-gradient(
      from calc(var(--rx) * 360deg),
      var(--sp1), var(--sp2), var(--sp3),
      var(--sp4), var(--sp5), var(--sp6), var(--sp1)
    );
    background-size: 200% 200%;
    background-position: calc(var(--rx) * 100%) calc(var(--ry) * 100%);
    filter: brightness(.7) contrast(3) saturate(1.5);
    mask-image: var(--mask-url, none);
    mask-size: cover;
    mask-mode: luminance;
    -webkit-mask-image: var(--mask-url, none);
    -webkit-mask-size: cover;
    -webkit-mask-mode: luminance;
    transform:
      translate(
        calc((var(--rx) - .5) * var(--depth)),
        calc((var(--ry) - .5) * var(--depth))
      );
  }

  /* ─── Name foil: gold sweep masked to bottom text ─── */
  .ll-name-foil {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    mix-blend-mode: color-dodge;
    opacity: var(--name-foil, 0);
    mask-image: var(--name-mask-url, none);
    mask-size: cover;
    mask-mode: luminance;
    -webkit-mask-image: var(--name-mask-url, none);
    -webkit-mask-size: cover;
    -webkit-mask-mode: luminance;
    transform: translate(
      calc((var(--rx) - .5) * var(--depth)),
      calc((var(--ry) - .5) * var(--depth))
    );
    background: linear-gradient(
      calc(90deg + (var(--rx) - .5) * 60deg),
      transparent 15%,
      hsl(40, 70%, 45%) 40%,
      hsl(45, 90%, 70%) 50%,
      hsl(40, 70%, 45%) 60%,
      transparent 85%
    );
    background-size: 200% 100%;
    background-position: calc(var(--rx) * 100%) 0;
    filter: brightness(.8) contrast(2) saturate(1.2);
  }

  /* ─── Top foil: gold sweep masked to top text ─── */
  .ll-top-foil {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
    mix-blend-mode: color-dodge;
    opacity: var(--top-foil, 0);
    mask-image: var(--top-mask-url, none);
    mask-size: cover;
    mask-mode: luminance;
    -webkit-mask-image: var(--top-mask-url, none);
    -webkit-mask-size: cover;
    -webkit-mask-mode: luminance;
    transform: translate(
      calc((var(--rx) - .5) * var(--depth)),
      calc((var(--ry) - .5) * var(--depth))
    );
    background: linear-gradient(
      calc(90deg + (var(--rx) - .5) * 60deg),
      transparent 15%,
      hsl(40, 70%, 45%) 40%,
      hsl(45, 90%, 70%) 50%,
      hsl(40, 70%, 45%) 60%,
      transparent 85%
    );
    background-size: 200% 100%;
    background-position: calc(var(--rx) * 100%) 0;
    filter: brightness(.8) contrast(2) saturate(1.2);
  }

  .ll-glare {
    position: absolute;
    inset: 0;
    z-index: 4;
    pointer-events: none;
    mix-blend-mode: overlay;
    opacity: var(--glare-opacity, 0);
    background: radial-gradient(
      farthest-corner circle
        at calc(var(--rx) * 100%) calc(var(--ry) * 100%),
      hsla(0,0%,100%,.85) 0%,
      hsla(0,0%,100%,.4) 18%,
      hsla(0,0%,0%,.55) 80%
    );
  }

  /* ─── Sizes ─── */
  .ll-card-sm { cursor: pointer; }
  .ll-card-sm:hover .ll-subject { filter: drop-shadow(0 4px 12px rgba(0,0,0,.55)); }

  .ll-card-lg { width: 300px; cursor: default; }
  @media (min-width: 640px) { .ll-card-lg { width: 360px; } }

  /* ─── Controls ─── */
  .ll-controls {
    display: flex;
    flex-wrap: wrap;
    gap: .5rem 1.25rem;
    padding: .75rem 1rem;
    background: var(--color-bg-surface, #111);
    border: 1px solid var(--color-bg-elevated, #222);
    align-items: end;
    border-radius: 4px;
  }
  .ll-ctrl {
    display: flex;
    flex-direction: column;
    gap: .2rem;
    font-size: .6rem;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--color-text-muted, #999);
    cursor: pointer;
  }
  .ll-ctrl input[type=range] { accent-color: var(--color-border-default, #555); width: 80px; }
  .ll-ctrl-val { font-family: monospace; font-size: .65rem; opacity: .6; text-align: right; }

  /* ─── Grid ─── */
  .ll-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: .5rem;
  }
  @media (min-width: 640px) {
    .ll-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: .75rem; }
  }

  /* ─── Zoom ─── */
  .ll-zoom-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(5, 5, 12, .88);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow-y: auto;
    padding: 2rem 1rem;
  }
  .ll-zoom-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    cursor: default;
    max-width: 400px;
    width: 100%;
  }
  .ll-zoom-card-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .75rem;
  }
  .ll-zoom-name {
    font-size: .75rem;
    letter-spacing: .15em;
    text-transform: uppercase;
    color: var(--color-text-muted, #999);
    font-family: var(--font-serif, Georgia);
    opacity: .6;
  }
  .ll-zoom-close {
    position: fixed;
    top: 1.5rem;
    right: 1.5rem;
    background: none;
    border: 1px solid rgba(255,255,255,.15);
    color: rgba(255,255,255,.5);
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    font-size: .9rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ll-zoom-close:hover {
    border-color: rgba(255,255,255,.3);
    color: rgba(255,255,255,.8);
  }
`;
