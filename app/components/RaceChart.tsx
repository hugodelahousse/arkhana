import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { RARITY_LABELS, type Rarity } from "../lib/cards";
import type { RaceData, RacePull, RaceRunner } from "../lib/race";

// ─── Color assignment ─────────────────────────────────────────────────────────
// The viewer runs in ink (--primary); followed readers take the CVD-validated
// chart slots in stable (alphabetical) order. Slots are never cycled — past 8,
// runners fall back to a neutral and rely on hover/legend for identity.

// NOTE: these read the token-layer vars (--chart-N / --rarity-*) directly,
// not the @theme inline --color-* names — Tailwind v4 "inline" mode never
// emits those as real custom properties, so var(--color-*) resolves to
// nothing at runtime.
export function raceRunnerColor(runner: RaceRunner, slot: number): string {
  if (runner.isViewer) return "var(--primary)";
  return slot < 8 ? `var(--chart-${slot + 1})` : "var(--ghost-foreground)";
}

function rarityColor(rarity: Rarity): string {
  return `var(--rarity-${RARITY_LABELS[rarity].toLowerCase()})`;
}

const DECK_SIZE = 78;

// ─── Date helpers (UTC, matching pullDate semantics) ──────────────────────────

function dateAt(startISO: string, i: number): Date {
  return new Date(Date.parse(`${startISO}T00:00:00Z`) + i * 86400000);
}

function formatTick(d: Date, style: "day" | "daymonth" | "month"): string {
  if (style === "day") {
    return d.toLocaleDateString(undefined, { day: "numeric", timeZone: "UTC" });
  }
  if (style === "daymonth") {
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  }
  return d.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
}

function formatFull(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

interface Tick {
  i: number;
  label: string;
}

function buildTicks(startISO: string, days: number): Tick[] {
  const ticks: Tick[] = [];
  if (days <= 14) {
    for (let i = 0; i < days; i++) {
      ticks.push({ i, label: formatTick(dateAt(startISO, i), days > 7 ? "day" : "daymonth") });
    }
    return ticks;
  }
  if (days <= 90) {
    for (let i = 0; i < days; i++) {
      const d = dateAt(startISO, i);
      if (d.getUTCDay() === 1) ticks.push({ i, label: formatTick(d, "daymonth") });
    }
  } else {
    for (let i = 0; i < days; i++) {
      const d = dateAt(startISO, i);
      if (d.getUTCDate() === 1) ticks.push({ i, label: formatTick(d, "month") });
    }
  }
  if (ticks.length < 2) {
    return [
      { i: 0, label: formatTick(dateAt(startISO, 0), "daymonth") },
      { i: days - 1, label: formatTick(dateAt(startISO, days - 1), "daymonth") },
    ];
  }
  // Thin to at most ~9 labels so long ranges stay recessive.
  const stride = Math.ceil(ticks.length / 9);
  return ticks.filter((_, idx) => idx % stride === 0);
}

// ─── Derived series ────────────────────────────────────────────────────────────

interface Series {
  runner: RaceRunner;
  color: string;
  countAt: Int16Array; // -1 before first pull
  pullAt: Map<number, RacePull>;
  hasLine: boolean;
}

function buildSeries(race: RaceData): Series[] {
  const followedSeen = { n: 0 };
  return race.runners.map((runner) => {
    const slot = runner.isViewer ? -1 : followedSeen.n++;
    const countAt = new Int16Array(race.days).fill(-1);
    const pullAt = new Map<number, RacePull>();
    for (const p of runner.pulls) pullAt.set(p.i, p);
    if (runner.startIndex >= 0) {
      let c = 0;
      for (let i = runner.startIndex; i <= runner.endIndex; i++) {
        const p = pullAt.get(i);
        if (p) c = p.count;
        countAt[i] = c;
      }
    }
    return {
      runner,
      color: raceRunnerColor(runner, slot),
      countAt,
      pullAt,
      hasLine: runner.startIndex >= 0,
    };
  });
}

// Minimal staircase path: corner points only, so a 400-day flat stretch is one segment.
function linePath(
  s: Series,
  x: (i: number) => number,
  y: (c: number) => number
): string {
  const { startIndex, endIndex } = s.runner;
  const pts: string[] = [`M${x(startIndex)},${y(s.countAt[startIndex])}`];
  for (let i = startIndex + 1; i <= endIndex; i++) {
    if (s.countAt[i] !== s.countAt[i - 1]) {
      pts.push(`L${x(i - 1)},${y(s.countAt[i - 1])}`);
      pts.push(`L${x(i)},${y(s.countAt[i])}`);
    }
  }
  pts.push(`L${x(endIndex)},${y(s.countAt[endIndex])}`);
  return pts.join("");
}

// Four small diamonds — the weekly-spread marker, worn in the runner's color.
function spreadMarkerPath(cx: number, cy: number, r: number): string {
  const o = r * 1.05;
  const d = r * 0.62;
  const diamond = (px: number, py: number) =>
    `M${px},${py - d}L${px + d},${py}L${px},${py + d}L${px - d},${py}Z`;
  return (
    diamond(cx, cy - o) + diamond(cx + o, cy) + diamond(cx, cy + o) + diamond(cx - o, cy)
  );
}

function easeInOutSine(p: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * p);
}

function subscribeReducedMotion(callback: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RaceChart({ race }: { race: RaceData }) {
  const uid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverI, setHoverI] = useState<number | null>(null);
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [pointedId, setPointedId] = useState<string | null>(null);
  const [animNonce, setAnimNonce] = useState(0);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
  const clipRefs = useRef(new Map<string, SVGRectElement>());
  const labelRefs = useRef(new Map<string, SVGGElement>());

  const focusedId = lockedId ?? pointedId;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const series = useMemo(() => buildSeries(race), [race]);
  const lined = useMemo(() => series.filter((s) => s.hasLine), [series]);

  const { days } = race;
  const wide = width >= 560;
  const height = Math.max(300, Math.min(Math.round(width * 0.55), 440));
  const margin = { top: 24, right: wide ? 118 : 16, bottom: 34, left: 34 };
  const plotW = Math.max(40, width - margin.left - margin.right);
  const plotH = height - margin.top - margin.bottom;
  const step = days > 1 ? plotW / (days - 1) : 0;
  const x = (i: number) => (days > 1 ? margin.left + i * step : margin.left + plotW / 2);
  const y = (c: number) => margin.top + plotH * (1 - c / DECK_SIZE);

  const rPull = Math.min(5, Math.max(2.5, step * 0.34));
  const rMiss = Math.min(2.25, Math.max(1, step * 0.2));
  const showMissed = step >= 2;
  const ringW = Math.min(2, Math.max(1, rPull * 0.4));

  const ticks = useMemo(() => buildTicks(race.start, days), [race.start, days]);

  // End labels, nudged apart so converging lines stay readable.
  const endLabels = useMemo(() => {
    if (!wide) return [];
    const items = lined
      .map((s) => ({
        s,
        ty: y(s.countAt[s.runner.endIndex]),
      }))
      .sort((a, b) => a.ty - b.ty);
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 1; k < items.length; k++) {
        if (items[k].ty < items[k - 1].ty + 14) items[k].ty = items[k - 1].ty + 14;
      }
      const overflow = items.length > 0 ? items[items.length - 1].ty - (height - margin.bottom - 4) : 0;
      if (overflow > 0) {
        items[items.length - 1].ty -= overflow;
        for (let k = items.length - 2; k >= 0; k--) {
          if (items[k].ty > items[k + 1].ty - 14) items[k].ty = items[k + 1].ty - 14;
        }
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lined, wide, height, plotW, days]);

  // Draw order: slowest total first, the leader (and "You" on ties) closes the show.
  const drawDelays = useMemo(() => {
    const order = [...lined].sort(
      (a, b) => a.runner.total - b.runner.total || (a.runner.isViewer ? 1 : -1)
    );
    const delays = new Map<string, { delay: number; dur: number }>();
    order.forEach((s, rank) => {
      const span = Math.max(1, s.runner.endIndex - s.runner.startIndex);
      const dur = Math.max(650, Math.min(2100, (1900 * span) / days));
      delays.set(s.runner.id, { delay: 350 + rank * 240, dur });
    });
    return delays;
  }, [lined, days]);

  // Clip-rect reveal: one RAF loop writes widths directly — dots surface exactly
  // as their line reaches them, with no React re-render per frame.
  useEffect(() => {
    if (width === 0) return;
    const widthFor = (s: Series) =>
      x(s.runner.endIndex) - x(s.runner.startIndex) + rPull * 2 + 4;

    if (reducedMotion) {
      for (const s of lined) {
        clipRefs.current.get(s.runner.id)?.setAttribute("width", String(widthFor(s)));
        const label = labelRefs.current.get(s.runner.id);
        if (label) label.style.opacity = "1";
      }
      return;
    }

    for (const s of lined) {
      clipRefs.current.get(s.runner.id)?.setAttribute("width", "0");
      const label = labelRefs.current.get(s.runner.id);
      if (label) label.style.opacity = "0";
    }

    let raf = 0;
    const t0 = performance.now();
    const tEnd = Math.max(
      ...lined.map((s) => {
        const d = drawDelays.get(s.runner.id)!;
        return d.delay + d.dur;
      }),
      1
    );
    const frame = (now: number) => {
      const t = now - t0;
      for (const s of lined) {
        const d = drawDelays.get(s.runner.id)!;
        const p = Math.max(0, Math.min(1, (t - d.delay) / d.dur));
        clipRefs.current
          .get(s.runner.id)
          ?.setAttribute("width", String(easeInOutSine(p) * widthFor(s)));
        if (p >= 1) {
          const label = labelRefs.current.get(s.runner.id);
          if (label) label.style.opacity = "1";
        }
      }
      if (t < tEnd + 100) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, days, reducedMotion, animNonce, lined, drawDelays, wide]);

  const indexFromPointer = (clientX: number): number => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || days <= 1) return 0;
    const px = clientX - rect.left - margin.left;
    return Math.max(0, Math.min(days - 1, Math.round(px / step)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") return setHoverI(null);
    let next: number | null = null;
    const cur = hoverI ?? days - 1;
    if (e.key === "ArrowLeft") next = cur - (e.shiftKey ? 7 : 1);
    if (e.key === "ArrowRight") next = cur + (e.shiftKey ? 7 : 1);
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = days - 1;
    if (next === null) return;
    e.preventDefault();
    setHoverI(Math.max(0, Math.min(days - 1, next)));
  };

  // Tooltip rows for the hovered day, leaders first.
  const hoverRows = useMemo(() => {
    if (hoverI === null) return [];
    return series
      .map((s) => {
        const started = s.hasLine && hoverI >= s.runner.startIndex;
        const count = started ? s.countAt[Math.min(hoverI, s.runner.endIndex)] : null;
        const pull = started ? s.pullAt.get(hoverI) : undefined;
        const beyond = s.hasLine && hoverI > s.runner.endIndex;
        return { s, started, count, pull, beyond };
      })
      .sort((a, b) => (b.count ?? -1) - (a.count ?? -1));
  }, [series, hoverI]);

  const liveText = useMemo(() => {
    if (hoverI === null) return "";
    const date = formatFull(dateAt(race.start, hoverI));
    return `${date}: ${hoverRows
      .filter((r) => r.count !== null)
      .map((r) => `${r.s.runner.isViewer ? "You" : r.s.runner.handle} ${r.count}`)
      .join(", ")}`;
  }, [hoverI, hoverRows, race.start]);

  const tooltipLeft =
    hoverI !== null ? (x(hoverI) > width * 0.58 ? x(hoverI) - 232 : x(hoverI) + 14) : 0;

  const yTicks = [20, 40, 60];

  return (
    <div className="space-y-4">
      {/* Legend — hover to trace one reader, click to hold the trace */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5">
        {series.map((s) => {
          const active = focusedId === s.runner.id;
          const dimmed = focusedId !== null && !active;
          return (
            <button
              key={s.runner.id}
              type="button"
              aria-pressed={lockedId === s.runner.id}
              onClick={() =>
                setLockedId((cur) => (cur === s.runner.id ? null : s.runner.id))
              }
              onMouseEnter={() => setPointedId(s.runner.id)}
              onMouseLeave={() => setPointedId(null)}
              className="flex items-center gap-2 px-2.5 py-1 text-xs tracking-wide border transition-all"
              style={{
                borderColor: active ? "var(--border)" : "transparent",
                background: active ? "var(--muted)" : "transparent",
                opacity: dimmed ? 0.45 : s.hasLine ? 1 : 0.5,
                color: "var(--muted-foreground)",
              }}
            >
              <svg width="16" height="8" aria-hidden>
                <line
                  x1="0"
                  y1="4"
                  x2="16"
                  y2="4"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeDasharray={s.hasLine ? undefined : "2 3"}
                />
                {s.hasLine && <circle cx="8" cy="4" r="2.5" fill={s.color} />}
              </svg>
              <span className="font-serif text-sm text-foreground">
                {s.runner.isViewer ? "You" : `@${s.runner.handle}`}
                <span className="text-ghost-foreground font-sans text-xs"> · {s.runner.total}</span>
              </span>
            </button>
          );
        })}
        {!reducedMotion && (
          <button
            type="button"
            onClick={() => setAnimNonce((n) => n + 1)}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 text-[11px] tracking-widest uppercase text-ghost-foreground hover:text-muted-foreground transition-colors"
          >
            <ArrowCounterClockwise size={13} weight="light" aria-hidden /> Replay
          </button>
        )}
      </div>

      <div ref={wrapRef} className="relative select-none" style={{ minHeight: 300 }}>
        {width > 0 && (
          <>
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={`Collection progress over time for ${series.length} readers, out of ${DECK_SIZE} cards. Use arrow keys to explore days.`}
              tabIndex={0}
              className="block outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onKeyDown={onKeyDown}
              onBlur={() => setHoverI(null)}
              onPointerMove={(e) => setHoverI(indexFromPointer(e.clientX))}
              onPointerDown={(e) => setHoverI(indexFromPointer(e.clientX))}
              onPointerLeave={() => setHoverI(null)}
            >
              {/* Grid & axes */}
              <g className="race-grid-in">
                {yTicks.map((v) => (
                  <g key={v}>
                    <line
                      x1={margin.left}
                      x2={width - margin.right}
                      y1={y(v)}
                      y2={y(v)}
                      stroke="var(--border)"
                      strokeOpacity="0.45"
                      strokeWidth="1"
                    />
                    <text
                      x={margin.left - 7}
                      y={y(v) + 3}
                      textAnchor="end"
                      fontSize="9.5"
                      fill="var(--ghost-foreground)"
                    >
                      {v}
                    </text>
                  </g>
                ))}
                {/* Full deck reference */}
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={y(DECK_SIZE)}
                  y2={y(DECK_SIZE)}
                  stroke="var(--accent)"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                />
                <text
                  x={width - margin.right}
                  y={y(DECK_SIZE) - 5}
                  textAnchor="end"
                  fontSize="9"
                  letterSpacing="0.14em"
                  fill="var(--accent-text)"
                >
                  ✦ FULL DECK · 78
                </text>
                {/* Baseline */}
                <line
                  x1={margin.left}
                  x2={width - margin.right}
                  y1={y(0)}
                  y2={y(0)}
                  stroke="var(--border)"
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 7}
                  y={y(0) + 3}
                  textAnchor="end"
                  fontSize="9.5"
                  fill="var(--ghost-foreground)"
                >
                  0
                </text>
                {/* X ticks */}
                {ticks.map((t) => (
                  <g key={t.i}>
                    <line
                      x1={x(t.i)}
                      x2={x(t.i)}
                      y1={y(0)}
                      y2={y(0) + 4}
                      stroke="var(--border)"
                      strokeWidth="1"
                    />
                    <text
                      x={x(t.i)}
                      y={y(0) + 16}
                      textAnchor="middle"
                      fontSize="9"
                      letterSpacing="0.1em"
                      fill="var(--ghost-foreground)"
                    >
                      {t.label.toUpperCase()}
                    </text>
                  </g>
                ))}
              </g>

              {/* Series */}
              {lined.map((s) => {
                const dimmed = focusedId !== null && focusedId !== s.runner.id;
                const focused = focusedId === s.runner.id;
                const clipId = `race-${uid}-${s.runner.id}`;
                const path = linePath(s, x, y);
                return (
                  <g
                    key={s.runner.id}
                    style={{ opacity: dimmed ? 0.13 : 1, transition: "opacity 220ms ease" }}
                  >
                    <clipPath id={clipId}>
                      <rect
                        ref={(el) => {
                          if (el) clipRefs.current.set(s.runner.id, el);
                          else clipRefs.current.delete(s.runner.id);
                        }}
                        x={x(s.runner.startIndex) - rPull - 2}
                        y={0}
                        width={0}
                        height={height}
                      />
                    </clipPath>
                    <g clipPath={`url(#${clipId})`}>
                      {focused && (
                        <path
                          d={`${path}L${x(s.runner.endIndex)},${y(0)}L${x(s.runner.startIndex)},${y(0)}Z`}
                          fill={s.color}
                          fillOpacity="0.07"
                        />
                      )}
                      <path
                        d={path}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={focused ? 2.5 : 2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      {/* Missed days — the greyed-out dots */}
                      {showMissed &&
                        Array.from(
                          { length: s.runner.endIndex - s.runner.startIndex + 1 },
                          (_, k) => s.runner.startIndex + k
                        )
                          .filter((i) => !s.pullAt.has(i))
                          .map((i) => (
                            <circle
                              key={i}
                              cx={x(i)}
                              cy={y(s.countAt[i])}
                              r={rMiss}
                              fill="var(--ghost-foreground)"
                              fillOpacity="0.55"
                            />
                          ))}
                      {/* Pull days — rarity-colored; spreads wear the runner's diamonds */}
                      {s.runner.pulls.map((p) =>
                        p.spread ? (
                          <path
                            key={p.i}
                            d={spreadMarkerPath(x(p.i), y(p.count), rPull)}
                            fill={s.color}
                            stroke="var(--card)"
                            strokeWidth={ringW * 0.75}
                            className={p.radiant ? "race-dot-radiant" : undefined}
                            style={p.radiant ? { color: s.color } : undefined}
                          />
                        ) : (
                          <circle
                            key={p.i}
                            cx={x(p.i)}
                            cy={y(p.count)}
                            r={p.radiant ? rPull + 0.75 : rPull}
                            fill={rarityColor(p.rarity)}
                            stroke="var(--card)"
                            strokeWidth={ringW}
                            className={p.radiant ? "race-dot-radiant" : undefined}
                            style={
                              p.radiant ? { color: rarityColor(p.rarity) } : undefined
                            }
                          />
                        )
                      )}
                    </g>
                  </g>
                );
              })}

              {/* End labels */}
              {endLabels.map(({ s, ty }) => {
                const dimmed = focusedId !== null && focusedId !== s.runner.id;
                return (
                  <g
                    key={s.runner.id}
                    ref={(el) => {
                      if (el) labelRefs.current.set(s.runner.id, el);
                      else labelRefs.current.delete(s.runner.id);
                    }}
                    style={{ opacity: 0, transition: "opacity 500ms ease 120ms" }}
                  >
                    <g style={{ opacity: dimmed ? 0.15 : 1, transition: "opacity 220ms ease" }}>
                      <circle
                        cx={x(s.runner.endIndex) + 9}
                        cy={ty}
                        r="2.5"
                        fill={s.color}
                      />
                      <text
                        x={x(s.runner.endIndex) + 15}
                        y={ty + 3}
                        fontSize="10.5"
                        fill="var(--muted-foreground)"
                      >
                        {s.runner.isViewer ? "You" : `@${s.runner.handle}`}
                        <tspan fill="var(--foreground)" fontWeight="600">
                          {" "}
                          {s.runner.total}
                        </tspan>
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Crosshair */}
              {hoverI !== null && (
                <g
                  className="race-crosshair"
                  style={{ transform: `translateX(${x(hoverI)}px)` }}
                  pointerEvents="none"
                >
                  <line
                    x1={0}
                    x2={0}
                    y1={margin.top}
                    y2={height - margin.bottom}
                    stroke="var(--muted-foreground)"
                    strokeOpacity="0.55"
                    strokeWidth="1"
                  />
                </g>
              )}
            </svg>

            {/* Tooltip */}
            {hoverI !== null && (
              <div
                className="absolute top-2 w-[218px] border border-border bg-card px-3 py-2.5 space-y-1.5 pointer-events-none z-10"
                style={{ left: Math.max(4, Math.min(tooltipLeft, width - 222)) }}
              >
                <p className="text-[10px] tracking-[0.14em] uppercase text-ghost-foreground">
                  {formatFull(dateAt(race.start, hoverI))}
                </p>
                {hoverRows.map(({ s, started, count, pull, beyond }) => (
                  <div key={s.runner.id} className="flex items-center gap-2 text-xs">
                    <svg width="12" height="4" aria-hidden className="shrink-0">
                      <line x1="0" y1="2" x2="12" y2="2" stroke={s.color} strokeWidth="2" />
                    </svg>
                    <span
                      className="font-semibold tabular-nums w-6 text-right shrink-0"
                      style={{ color: started ? "var(--foreground)" : "var(--ghost-foreground)" }}
                    >
                      {count ?? "—"}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {s.runner.isViewer ? "You" : `@${s.runner.handle}`}
                    </span>
                    <span className="ml-auto flex items-center gap-1.5 shrink-0 text-[10px] tracking-wide text-ghost-foreground">
                      {pull ? (
                        <>
                          <span
                            aria-hidden
                            className="inline-block size-2"
                            style={{
                              background: pull.spread ? s.color : rarityColor(pull.rarity),
                              borderRadius: pull.spread ? 0 : "9999px",
                              transform: pull.spread ? "rotate(45deg) scale(0.85)" : undefined,
                            }}
                          />
                          {pull.spread ? "Spread" : RARITY_LABELS[pull.rarity]}
                          {pull.radiant ? " ✶" : ""}
                        </>
                      ) : !started || beyond ? (
                        ""
                      ) : (
                        "No pull"
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <p className="sr-only" aria-live="polite">
          {liveText}
        </p>
      </div>
    </div>
  );
}
