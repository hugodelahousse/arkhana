// Card frames for the lab deck builder. Every frame obeys one contract:
// 1024×1536 card, art window at (64, 96) 896×1216, numeral slot in the top
// band, title slot in the bottom band. Title and numeral are live text.
import "@fontsource/im-fell-english-sc/400.css";
import "@fontsource/uncial-antiqua/400.css";
import "@fontsource/cinzel/600.css";
import { useId, useState, type ReactNode } from "react";
import type { FrameId } from "../../lib/deck/presets";

export const CARD_W = 1024;
export const CARD_H = 1536;
export const WIN = { x: 64, y: 96, w: 896, h: 1216 } as const;
const HOLE = `M0 0H${CARD_W}V${CARD_H}H0Z M${WIN.x} ${WIN.y}V${WIN.y + WIN.h}H${WIN.x + WIN.w}V${WIN.y}Z`;

export const FRAMES: { id: FrameId; name: string }[] = [
  { id: "carved-block", name: "Carved block" },
  { id: "leaded-glass", name: "Leaded glass" },
  { id: "vellum-margin", name: "Vellum margin" },
  { id: "marseille-banners", name: "Marseille banners" },
  { id: "white-border-1909", name: "White border, 1909" },
  { id: "foil-rule", name: "Foil rule" },
  { id: "ink-band", name: "Ink band" },
];

type TextSpec = { font: string; weight?: number; color: string; size: number; tracking: number; upper?: boolean };

function FitText({ x, y, text, spec, max = 820 }: { x: number; y: number; text: string; spec: TextSpec; max?: number }) {
  const t = spec.upper === false ? text : text.toUpperCase();
  // Rough width estimate; shrink to fit, then squeeze as a last resort.
  const width = (size: number) => t.length * (size * 0.62 + spec.tracking * (size / spec.size));
  const size = Math.max(spec.size * 0.6, Math.min(spec.size, spec.size * (max / width(spec.size))));
  const squeeze = width(size) > max;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily={spec.font}
      fontWeight={spec.weight ?? 400}
      fontSize={size}
      letterSpacing={spec.tracking * (size / spec.size)}
      fill={spec.color}
      {...(squeeze ? { textLength: max, lengthAdjust: "spacingAndGlyphs" } : {})}
    >
      {t}
    </text>
  );
}

/**
 * Card title at a fixed size (consistent across the whole deck). Long titles
 * wrap onto two lines, preferring a split at " — "; only a line that still
 * doesn't fit is squeezed. Centred vertically on `cy`.
 */
function TitleText({ cy, text, spec, max }: { cy: number; text: string; spec: TextSpec; max: number }) {
  const t = spec.upper === false ? text : text.toUpperCase();
  const width = (str: string) => str.length * (spec.size * 0.62 + spec.tracking);
  let lines = [t];
  if (width(t) > max) {
    const dash = t.split(/\s+[—–-]\s+/);
    if (dash.length === 2) lines = dash;
    else {
      const words = t.split(/\s+/);
      let best = Infinity;
      for (let i = 1; i < words.length; i++) {
        const a = words.slice(0, i).join(" ");
        const b = words.slice(i).join(" ");
        const m = Math.max(width(a), width(b));
        if (m < best) {
          best = m;
          lines = [a, b];
        }
      }
    }
  }
  const lineHeight = spec.size * 1.08;
  const first = cy + spec.size * 0.35 - ((lines.length - 1) * lineHeight) / 2;
  return (
    <text textAnchor="middle" fontFamily={spec.font} fontWeight={spec.weight ?? 400} fontSize={spec.size} letterSpacing={spec.tracking} fill={spec.color}>
      {lines.map((l, i) => (
        <tspan key={i} x={512} y={first + i * lineHeight} {...(width(l) > max ? { textLength: max, lengthAdjust: "spacingAndGlyphs" } : {})}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

const FELL = "'IM Fell English SC', Georgia, serif";
const UNCIAL = "'Uncial Antiqua', Georgia, serif";
const CINZEL = "'Cinzel', Georgia, serif";
const CORMORANT = "'Cormorant Garamond Variable', Georgia, serif";
const DMSANS = "'DM Sans Variable', system-ui, sans-serif";

function frameLayers(id: FrameId, uid: string, numeral: string, title: string): { under?: ReactNode; over: ReactNode } {
  switch (id) {
    case "carved-block": {
      const ink = "#17130f";
      const red = "#9A3B2A";
      return {
        over: (
          <>
            <defs>
              <filter id={`rough-${uid}`}>
                <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
                <feDisplacementMap in="SourceGraphic" scale="7" />
              </filter>
            </defs>
            <path d={HOLE} fillRule="evenodd" fill="#efe6d3" />
            <g filter={`url(#rough-${uid})`}>
              <rect x="22" y="22" width={CARD_W - 44} height={CARD_H - 44} fill="none" stroke={ink} strokeWidth="16" />
              <rect x={WIN.x - 6} y={WIN.y - 6} width={WIN.w + 12} height={WIN.h + 12} fill="none" stroke={ink} strokeWidth="12" />
              <path d={`M78 1424 l16 -13 l16 13 l-16 13z M914 1424 l16 -13 l16 13 l-16 13z`} fill={red} />
            </g>
            <FitText x={512} y={76} text={numeral} spec={{ font: FELL, color: ink, size: 58, tracking: 8 }} />
            <TitleText cy={1424} text={title} spec={{ font: FELL, color: ink, size: 64, tracking: 5 }} max={700} />
          </>
        ),
      };
    }
    case "leaded-glass": {
      const lead = "#1d1b20";
      const panes = ["#2347a0", "#9c1f2c", "#c98f1c", "#2f7a4a"];
      const border: ReactNode[] = [];
      const step = 64;
      let k = 0;
      for (let x = 0; x < CARD_W; x += step) {
        border.push(<rect key={`t${x}`} x={x} y={0} width={step} height={WIN.y} fill={panes[k++ % 4]} />);
        border.push(<rect key={`b${x}`} x={x} y={WIN.y + WIN.h} width={step} height={CARD_H - WIN.y - WIN.h} fill={panes[(k + 1) % 4]} />);
      }
      for (let y = WIN.y; y < WIN.y + WIN.h; y += step) {
        border.push(<rect key={`l${y}`} x={0} y={y} width={WIN.x} height={step} fill={panes[k++ % 4]} />);
        border.push(<rect key={`r${y}`} x={WIN.x + WIN.w} y={y} width={WIN.x} height={step} fill={panes[(k + 2) % 4]} />);
      }
      const leads: ReactNode[] = [];
      for (let x = 0; x <= CARD_W; x += step) leads.push(<line key={`vx${x}`} x1={x} y1={0} x2={x} y2={WIN.y} />, <line key={`vb${x}`} x1={x} y1={WIN.y + WIN.h} x2={x} y2={CARD_H} />);
      for (let y = WIN.y; y <= WIN.y + WIN.h; y += step) leads.push(<line key={`hy${y}`} x1={0} y1={y} x2={WIN.x} y2={y} />, <line key={`hr${y}`} x1={WIN.x + WIN.w} y1={y} x2={CARD_W} y2={y} />);
      return {
        over: (
          <>
            <clipPath id={`gl-${uid}`}>
              <path d={HOLE} clipRule="evenodd" />
            </clipPath>
            <g clipPath={`url(#gl-${uid})`} opacity={0.92}>{border}</g>
            <g stroke={lead} strokeWidth="9" clipPath={`url(#gl-${uid})`}>{leads}</g>
            <rect x="6" y="6" width={CARD_W - 12} height={CARD_H - 12} fill="none" stroke={lead} strokeWidth="12" />
            <rect x={WIN.x - 5} y={WIN.y - 5} width={WIN.w + 10} height={WIN.h + 10} fill="none" stroke={lead} strokeWidth="12" />
            <rect x={196} y={1352} width={632} height={124} rx={10} fill="#ebe5cf" stroke={lead} strokeWidth="10" />
            <circle cx={512} cy={48} r={40} fill="#ebe5cf" stroke={lead} strokeWidth="9" />
            <FitText x={512} y={62} text={numeral} spec={{ font: CINZEL, weight: 600, color: lead, size: numeral.length > 3 ? 26 : 36, tracking: 2 }} max={70} />
            <TitleText cy={1414} text={title} spec={{ font: CINZEL, weight: 600, color: lead, size: 46, tracking: 4 }} max={580} />
          </>
        ),
      };
    }
    case "vellum-margin": {
      const vermilion = "#b0392a";
      const ultra = "#27408b";
      const gold = "#c39a3e";
      const green = "#3f6b3a";
      const vine = (tx: number, ty: number, sx: number, sy: number, key: string) => (
        <g key={key} transform={`translate(${tx} ${ty}) scale(${sx} ${sy})`}>
          <path d="M0 0 C40 10 60 50 50 100 M0 0 C10 40 50 60 100 50" fill="none" stroke={green} strokeWidth="5" />
          <path d="M50 100 c-14 4 -20 -10 -8 -18 c10 6 14 12 8 18z M100 50 c4 -14 -10 -20 -18 -8 c6 10 12 14 18 8z" fill={green} />
          <circle cx="28" cy="28" r="9" fill={gold} />
        </g>
      );
      return {
        over: (
          <>
            <path d={HOLE} fillRule="evenodd" fill="#efe2c4" />
            <rect x={WIN.x - 10} y={WIN.y - 10} width={WIN.w + 20} height={WIN.h + 20} fill="none" stroke={vermilion} strokeWidth="5" />
            <rect x={WIN.x - 3} y={WIN.y - 3} width={WIN.w + 6} height={WIN.h + 6} fill="none" stroke={gold} strokeWidth="5" />
            {vine(26, 26, 1, 1, "a")}
            {vine(CARD_W - 26, 26, -1, 1, "b")}
            {vine(26, CARD_H - 26, 1, -1, "c")}
            {vine(CARD_W - 26, CARD_H - 26, -1, -1, "d")}
            <FitText x={512} y={74} text={numeral} spec={{ font: UNCIAL, color: ultra, size: 54, tracking: 6 }} />
            <TitleText cy={1421} text={title} spec={{ font: UNCIAL, color: vermilion, size: 60, tracking: 2, upper: false }} max={760} />
          </>
        ),
      };
    }
    case "marseille-banners": {
      const ink = "#1a1612";
      return {
        over: (
          <>
            <path d={HOLE} fillRule="evenodd" fill="#f1e6cc" />
            <rect x="14" y="14" width={CARD_W - 28} height={CARD_H - 28} fill="none" stroke={ink} strokeWidth="10" />
            <rect x={WIN.x - 4} y={WIN.y - 4} width={WIN.w + 8} height={WIN.h + 8} fill="none" stroke={ink} strokeWidth="9" />
            <rect x={300} y={20} width={424} height={68} fill="#e3c34a" opacity={0.75} />
            <rect x={300} y={20} width={424} height={68} fill="none" stroke={ink} strokeWidth="7" />
            <rect x={110} y={1342} width={804} height={136} fill="#c8453a" opacity={0.18} />
            <rect x={110} y={1342} width={804} height={136} fill="none" stroke={ink} strokeWidth="8" />
            <FitText x={512} y={74} text={numeral} spec={{ font: FELL, color: ink, size: 56, tracking: 10 }} max={380} />
            <TitleText cy={1410} text={title} spec={{ font: FELL, color: ink, size: 58, tracking: 6 }} max={740} />
          </>
        ),
      };
    }
    case "white-border-1909": {
      const ink = "#1b1915";
      return {
        over: (
          <>
            <path d={HOLE} fillRule="evenodd" fill="#f7f3e8" />
            <rect x={WIN.x - 2} y={WIN.y - 2} width={WIN.w + 4} height={WIN.h + 4} fill="none" stroke={ink} strokeWidth="6" />
            <FitText x={512} y={74} text={numeral} spec={{ font: CORMORANT, weight: 600, color: ink, size: 60, tracking: 10 }} />
            <TitleText cy={1415} text={title} spec={{ font: CORMORANT, weight: 600, color: ink, size: 66, tracking: 8 }} max={820} />
          </>
        ),
      };
    }
    case "foil-rule": {
      const gold = "#c9a45c";
      return {
        over: (
          <>
            <path d={HOLE} fillRule="evenodd" fill="#0e0d10" />
            <rect x="28" y="28" width={CARD_W - 56} height={CARD_H - 56} fill="none" stroke={gold} strokeWidth="3" />
            <rect x={WIN.x - 10} y={WIN.y - 10} width={WIN.w + 20} height={WIN.h + 20} fill="none" stroke={gold} strokeWidth="3" />
            <path d="M492 1322 l20 -12 l20 12 l-20 12z" fill="#0e0d10" stroke={gold} strokeWidth="3" />
            <FitText x={512} y={74} text={numeral} spec={{ font: CORMORANT, weight: 500, color: gold, size: 56, tracking: 12 }} />
            <TitleText cy={1420} text={title} spec={{ font: CORMORANT, weight: 500, color: gold, size: 62, tracking: 10 }} max={800} />
          </>
        ),
      };
    }
    case "ink-band": {
      const band = "#1f5b5c";
      const cream = "#ece4d2";
      return {
        over: (
          <>
            <path d={HOLE} fillRule="evenodd" fill={cream} />
            <rect x={0} y={0} width={CARD_W} height={WIN.y - 14} fill={band} />
            <rect x={0} y={WIN.y + WIN.h + 14} width={CARD_W} height={CARD_H - WIN.y - WIN.h - 14} fill={band} />
            <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} fill="none" stroke="#111" strokeWidth="6" />
            <FitText x={512} y={64} text={numeral} spec={{ font: DMSANS, weight: 700, color: cream, size: 44, tracking: 14 }} />
            <TitleText cy={1428} text={title} spec={{ font: DMSANS, weight: 700, color: cream, size: 54, tracking: 10 }} max={840} />
          </>
        ),
      };
    }
  }
}

export function CardFrame({
  frameId,
  artUrl,
  numeral,
  title,
  status,
  htmlArt = false,
  className = "",
}: {
  frameId: FrameId;
  artUrl?: string | null;
  numeral: string;
  title: string;
  /** Shown over an empty window: e.g. "queued", "drawing…", an error. */
  status?: ReactNode;
  /**
   * Draw the art as an HTML <img> under the frame instead of inside the SVG, so the
   * browser loads and decodes it off the main thread. Image exports serialize the
   * SVG on its own, so they need the default.
   */
  htmlArt?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { over } = frameLayers(frameId, uid, numeral, title);
  const win = {
    left: `${(WIN.x / CARD_W) * 100}%`,
    top: `${(WIN.y / CARD_H) * 100}%`,
    width: `${(WIN.w / CARD_W) * 100}%`,
    height: `${(WIN.h / CARD_H) * 100}%`,
  };
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}>
      {htmlArt && (
        <div className="absolute" style={{ ...win, background: "#2a2730" }}>
          {artUrl && (
            <img src={artUrl} alt="" draggable={false} decoding="async" className="h-full w-full select-none object-cover" />
          )}
        </div>
      )}
      <svg viewBox={`0 0 ${CARD_W} ${CARD_H}`} className="absolute inset-0 h-full w-full" role="img" aria-label={`${numeral} ${title}`}>
        {!htmlArt && <rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} fill="#2a2730" />}
        {!htmlArt && artUrl && <image href={artUrl} x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} preserveAspectRatio="xMidYMid slice" />}
        {over}
      </svg>
      {!artUrl && status && (
        <div
          className="absolute flex items-center justify-center p-3 text-center text-xs leading-snug"
          style={{ left: `${(WIN.x / CARD_W) * 100}%`, top: `${(WIN.y / CARD_H) * 100}%`, width: `${(WIN.w / CARD_W) * 100}%`, height: `${(WIN.h / CARD_H) * 100}%`, color: "#d9d4ca" }}
        >
          {status}
        </div>
      )}
    </div>
  );
}

// ── Card backs ───────────────────────────────────────────────────────────

/** Paper, ink, accent and type for each frame, so backs match their fronts. */
const BACK_THEME: Record<FrameId, { paper: string; ink: string; accent: string; title: TextSpec["font"]; upper: boolean }> = {
  "carved-block": { paper: "#efe6d3", ink: "#17130f", accent: "#9A3B2A", title: FELL, upper: true },
  "leaded-glass": { paper: "#ebe5cf", ink: "#1d1b20", accent: "#2347a0", title: CINZEL, upper: true },
  "vellum-margin": { paper: "#efe2c4", ink: "#3b2a1a", accent: "#b0392a", title: UNCIAL, upper: false },
  "marseille-banners": { paper: "#f1e6cc", ink: "#1a1612", accent: "#c8453a", title: FELL, upper: true },
  "white-border-1909": { paper: "#f7f3e8", ink: "#1b1915", accent: "#9c4a36", title: CORMORANT, upper: true },
  "foil-rule": { paper: "#0e0d10", ink: "#c9a45c", accent: "#c9a45c", title: CORMORANT, upper: true },
  "ink-band": { paper: "#ece4d2", ink: "#111111", accent: "#1f5b5c", title: DMSANS, upper: true },
};

/** The deck's shared card back: an ornamental pattern in the frame's colours, or generated back art. */
export function CardBack({
  frameId,
  artUrl,
  htmlArt = false,
  className = "",
}: {
  frameId: FrameId;
  /** Generated back art (optional); otherwise an SVG pattern. */
  artUrl?: string | null;
  /** Show generated art as an HTML <img> (decoded off the main thread); see CardFrame. */
  htmlArt?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const t = BACK_THEME[frameId];
  if (htmlArt && artUrl) {
    return (
      <div className={`relative ${className}`} style={{ aspectRatio: `${CARD_W} / ${CARD_H}`, background: BACK_THEME[frameId].paper }}>
        <img src={artUrl} alt="Card back" draggable={false} decoding="async" className="absolute inset-0 h-full w-full select-none object-cover" />
      </div>
    );
  }
  const rules = (
    <>
      <rect x="24" y="24" width={CARD_W - 48} height={CARD_H - 48} fill="none" stroke={t.ink} strokeWidth="6" />
      <rect x="48" y="48" width={CARD_W - 96} height={CARD_H - 96} fill="none" stroke={t.accent} strokeWidth="3" />
    </>
  );

  {
    return (
      <div className={`relative ${className}`} style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}>
        <svg viewBox={`0 0 ${CARD_W} ${CARD_H}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Card back">
          <defs>
            <pattern id={`lattice-${uid}`} width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M32 4 L60 32 L32 60 L4 32 Z" fill="none" stroke={t.accent} strokeWidth="2" opacity="0.55" />
              <circle cx="32" cy="32" r="3" fill={t.ink} opacity="0.6" />
            </pattern>
          </defs>
          <rect width={CARD_W} height={CARD_H} fill={t.paper} />
          {artUrl ? (
            <image href={artUrl} x={0} y={0} width={CARD_W} height={CARD_H} preserveAspectRatio="xMidYMid slice" />
          ) : (
            <>
              <rect x="64" y="64" width={CARD_W - 128} height={CARD_H - 128} fill={`url(#lattice-${uid})`} />
              {/* 180°-symmetric medallion so the back reads the same either way up */}
              <g transform={`translate(${CARD_W / 2} ${CARD_H / 2})`}>
                <circle r="210" fill={t.paper} stroke={t.ink} strokeWidth="6" />
                <circle r="180" fill="none" stroke={t.accent} strokeWidth="3" />
                {Array.from({ length: 16 }, (_, i) => (
                  <path key={i} d="M0 -170 L14 -120 L0 -70 L-14 -120 Z" fill={i % 2 ? t.accent : t.ink} transform={`rotate(${i * 22.5})`} />
                ))}
                <circle r="44" fill={t.ink} />
                <circle r="22" fill={t.paper} />
              </g>
            </>
          )}
          {!artUrl && rules}
        </svg>
      </div>
    );
  }
}

/** Front/back with a flip toggle. */
export function FlipCard({ front, back, label = "Flip" }: { front: ReactNode; back: ReactNode; label?: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="space-y-1">
      {flipped ? back : front}
      <button className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => setFlipped((f) => !f)}>
        {flipped ? "Show front" : label}
      </button>
    </div>
  );
}
