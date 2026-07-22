import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ArrowCounterClockwise, ArrowsHorizontal } from "@phosphor-icons/react";
import { RARITY_LABELS, type Rarity } from "../lib/cards";
import type { RaceData, RacePull, RaceRunner } from "../lib/race";

// ─── Color assignment ─────────────────────────────────────────────────────────
// The viewer runs in ink (--primary); followed readers take the CVD-validated
// chart slots in stable (alphabetical) order. Slots are never cycled — past 8,
// runners fall back to a neutral and rely on hover/labels for identity.

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
// Smallest zoom window, in days. Zoom UI is hidden entirely for short histories.
const MIN_SPAN = 3;
const ZOOMABLE_FROM_DAYS = 8;

// ─── Date helpers (UTC, matching pullDate semantics) ──────────────────────────

function dateAt(startISO: string, i: number): Date {
  return new Date(Date.parse(`${startISO}T00:00:00Z`) + Math.round(i) * 86400000);
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

function buildTicks(
  startISO: string,
  days: number,
  d0: number,
  d1: number,
  maxLabels: number
): Tick[] {
  const lo = Math.max(0, Math.ceil(d0));
  const hi = Math.min(days - 1, Math.floor(d1));
  const span = Math.max(d1 - d0, 1);
  const ticks: Tick[] = [];
  if (span <= 21) {
    for (let i = lo; i <= hi; i++) {
      ticks.push({ i, label: formatTick(dateAt(startISO, i), span > 10 ? "day" : "daymonth") });
    }
  } else if (span <= 120) {
    for (let i = lo; i <= hi; i++) {
      const d = dateAt(startISO, i);
      if (d.getUTCDay() === 1) ticks.push({ i, label: formatTick(d, "daymonth") });
    }
  } else {
    for (let i = lo; i <= hi; i++) {
      const d = dateAt(startISO, i);
      if (d.getUTCDate() === 1) ticks.push({ i, label: formatTick(d, "month") });
    }
  }
  if (ticks.length < 2) {
    return [
      { i: lo, label: formatTick(dateAt(startISO, lo), "daymonth") },
      { i: hi, label: formatTick(dateAt(startISO, hi), "daymonth") },
    ].filter((t, k, arr) => k === 0 || t.i !== arr[0].i);
  }
  const stride = Math.ceil(ticks.length / Math.max(3, maxLabels));
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function subscribeReducedMotion(callback: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

interface Domain {
  d0: number;
  d1: number;
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
  const doneRef = useRef(false);

  const { days } = race;
  const fullD1 = Math.max(days - 1, 0);
  const [domain, setDomain] = useState<Domain>({ d0: 0, d1: fullD1 });
  const [brushSel, setBrushSel] = useState<Domain | null>(null);
  const pointersRef = useRef(new Map<number, number>());
  const pinchRef = useRef<{ span: number; startDist: number; startMidDay: number } | null>(null);
  const brushRef = useRef<{ startX: number; startDay: number } | null>(null);

  const zoomable = fullD1 >= ZOOMABLE_FROM_DAYS;
  const zoomed = domain.d0 > 0.01 || domain.d1 < fullD1 - 0.01;
  const span = Math.max(domain.d1 - domain.d0, 1e-9);

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

  const wide = width >= 560;
  const height = Math.max(300, Math.min(Math.round(width * 0.55), 440));
  const margin = { top: 24, right: wide ? 118 : 92, bottom: 34, left: 34 };
  const plotW = Math.max(40, width - margin.left - margin.right);
  const plotH = height - margin.top - margin.bottom;
  const pxPerDay = days > 1 ? plotW / span : 0;
  const x = (i: number) =>
    days > 1 ? margin.left + (i - domain.d0) * pxPerDay : margin.left + plotW / 2;
  const y = (c: number) => margin.top + plotH * (1 - c / DECK_SIZE);

  const rPull = Math.min(5, Math.max(2.5, pxPerDay * 0.34));
  const rMiss = Math.min(2.25, Math.max(1, pxPerDay * 0.2));
  const showMissed = pxPerDay >= 2;
  const ringW = Math.min(2, Math.max(1, rPull * 0.4));

  // Visible integer day range (with one day of bleed; the plot clip crops it).
  const vi0 = Math.max(0, Math.ceil(domain.d0) - 1);
  const vi1 = Math.min(days - 1, Math.floor(domain.d1) + 1);
  const hoverLo = Math.max(0, Math.ceil(domain.d0 - 0.49));
  const hoverHi = Math.min(days - 1, Math.floor(domain.d1 + 0.49));

  const ticks = useMemo(
    () =>
      buildTicks(race.start, days, domain.d0, domain.d1, Math.max(3, Math.floor(plotW / 76))),
    [race.start, days, domain.d0, domain.d1, plotW]
  );

  // End labels ride the visible right edge: each shows the runner's count at the
  // last visible day of their line, nudged apart so converging lines stay legible.
  const endLabels = useMemo(() => {
    const items = lined
      .filter((s) => s.runner.endIndex >= domain.d0 && s.runner.startIndex <= domain.d1)
      .map((s) => {
        const anchor = clamp(
          Math.floor(domain.d1),
          s.runner.startIndex,
          s.runner.endIndex
        );
        const count = s.countAt[anchor];
        return { s, anchor, count, ty: y(count) };
      })
      .sort((a, b) => a.ty - b.ty);
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 1; k < items.length; k++) {
        if (items[k].ty < items[k - 1].ty + 14) items[k].ty = items[k - 1].ty + 14;
      }
      const overflow =
        items.length > 0 ? items[items.length - 1].ty - (height - margin.bottom - 4) : 0;
      if (overflow > 0) {
        items[items.length - 1].ty -= overflow;
        for (let k = items.length - 2; k >= 0; k--) {
          if (items[k].ty > items[k + 1].ty - 14) items[k].ty = items[k + 1].ty - 14;
        }
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lined, height, plotW, days, domain.d0, domain.d1]);

  // Draw order: slowest total first, the leader (and "You" on ties) closes the show.
  const drawDelays = useMemo(() => {
    const order = [...lined].sort(
      (a, b) => a.runner.total - b.runner.total || (a.runner.isViewer ? 1 : -1)
    );
    const delays = new Map<string, { delay: number; dur: number }>();
    order.forEach((s, rank) => {
      const spanDays = Math.max(1, s.runner.endIndex - s.runner.startIndex);
      const dur = Math.max(650, Math.min(2100, (1900 * spanDays) / days));
      delays.set(s.runner.id, { delay: 350 + rank * 240, dur });
    });
    return delays;
  }, [lined, days]);

  // Clip-rect reveal. Animates only on first load / replay at full range; any
  // other geometry change (zoom, resize) snaps the reveal to complete so the
  // lines never re-draw mid-interaction.
  const domainKey = `${domain.d0.toFixed(3)}:${domain.d1.toFixed(3)}`;
  useEffect(() => {
    if (width === 0) return;
    const widthFor = (s: Series) =>
      Math.max(0, x(s.runner.endIndex) - x(s.runner.startIndex)) + rPull * 2 + 4;

    const finish = () => {
      for (const s of lined) {
        clipRefs.current.get(s.runner.id)?.setAttribute("width", String(widthFor(s)));
        const label = labelRefs.current.get(s.runner.id);
        if (label) label.style.opacity = "1";
      }
      doneRef.current = true;
    };

    if (reducedMotion || zoomed || doneRef.current) {
      finish();
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
      else doneRef.current = true;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, days, reducedMotion, animNonce, lined, drawDelays, domainKey]);

  const dayFromClientX = (clientX: number): number => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || days <= 1) return 0;
    return domain.d0 + (clientX - rect.left - margin.left) / (pxPerDay || 1);
  };

  const indexFromPointer = (clientX: number): number =>
    clamp(Math.round(dayFromClientX(clientX)), hoverLo, hoverHi);

  const applyDomain = (d0: number, d1: number) => {
    const s = clamp(d1 - d0, MIN_SPAN, fullD1);
    const nd0 = clamp(d0, 0, fullD1 - s);
    setDomain({ d0: nd0, d1: nd0 + s });
  };

  const resetDomain = () => setDomain({ d0: 0, d1: fullD1 });

  // ── Plot pointer logic: scrub (any), pinch (two touches), brush (mouse drag) ──

  const onPlotPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture is best-effort — inactive/synthetic pointers can't be captured
    }
    pointersRef.current.set(e.pointerId, e.clientX);
    if (pointersRef.current.size === 2 && zoomable) {
      const [xa, xb] = [...pointersRef.current.values()];
      pinchRef.current = {
        span,
        startDist: Math.max(10, Math.abs(xa - xb)),
        startMidDay: dayFromClientX((xa + xb) / 2),
      };
      brushRef.current = null;
      setBrushSel(null);
      setHoverI(null);
      return;
    }
    if (e.pointerType === "mouse" && e.button === 0 && zoomable) {
      brushRef.current = { startX: e.clientX, startDay: dayFromClientX(e.clientX) };
    }
    setHoverI(indexFromPointer(e.clientX));
  };

  const onPlotPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, e.clientX);
    }
    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const [xa, xb] = [...pointersRef.current.values()];
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scale = pinch.startDist / Math.max(10, Math.abs(xa - xb));
      const newSpan = clamp(pinch.span * scale, MIN_SPAN, fullD1);
      const midFrac = ((xa + xb) / 2 - rect.left - margin.left) / plotW;
      applyDomain(pinch.startMidDay - midFrac * newSpan, pinch.startMidDay + (1 - midFrac) * newSpan);
      return;
    }
    if (brushRef.current && (e.buttons & 1) === 1) {
      if (Math.abs(e.clientX - brushRef.current.startX) > 5) {
        const a = brushRef.current.startDay;
        const b = dayFromClientX(e.clientX);
        setBrushSel({ d0: Math.min(a, b), d1: Math.max(a, b) });
      }
    }
    setHoverI(indexFromPointer(e.clientX));
  };

  const onPlotPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    const brush = brushRef.current;
    if (brush && e.pointerType === "mouse") {
      brushRef.current = null;
      setBrushSel(null);
      const endDay = dayFromClientX(e.clientX);
      if (
        Math.abs(e.clientX - brush.startX) > 5 &&
        Math.abs(endDay - brush.startDay) >= MIN_SPAN
      ) {
        applyDomain(Math.min(brush.startDay, endDay), Math.max(brush.startDay, endDay));
        setHoverI(null);
      }
    }
  };

  const onPlotPointerCancel = (e: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    brushRef.current = null;
    setBrushSel(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setHoverI(null);
      return;
    }
    let next: number | null = null;
    const cur = hoverI ?? hoverHi;
    if (e.key === "ArrowLeft") next = cur - (e.shiftKey ? 7 : 1);
    if (e.key === "ArrowRight") next = cur + (e.shiftKey ? 7 : 1);
    if (e.key === "Home") next = hoverLo;
    if (e.key === "End") next = hoverHi;
    if (next === null) return;
    e.preventDefault();
    setHoverI(clamp(next, hoverLo, hoverHi));
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

  const rangeLabel = useMemo(() => {
    const fmt = (i: number) =>
      dateAt(race.start, i).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
    const lo = Math.max(0, Math.ceil(domain.d0));
    const hi = Math.min(fullD1, Math.floor(domain.d1));
    return `${fmt(lo)} — ${fmt(hi)} · ${hi - lo + 1} days`;
  }, [race.start, domain.d0, domain.d1, fullD1]);

  const yTicks = [20, 40, 60];
  const plotClipId = `race-${uid}-plot`;

  return (
    <div className="space-y-3">
      {/* Utility row — visible range + zoom reset on the left, replay on the right */}
      <div className="flex items-center justify-between min-h-6 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {zoomed && (
            <button
              type="button"
              onClick={resetDomain}
              className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] tracking-widest uppercase border border-border text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowsHorizontal size={12} weight="light" aria-hidden /> Full range
            </button>
          )}
          <span className="type-ghost truncate">{rangeLabel.toUpperCase()}</span>
        </div>
        {!reducedMotion && (
          <button
            type="button"
            onClick={() => {
              doneRef.current = false;
              resetDomain();
              setAnimNonce((n) => n + 1);
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] tracking-widest uppercase text-ghost-foreground hover:text-muted-foreground transition-colors shrink-0"
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
              style={{ touchAction: "pan-y" }}
              onKeyDown={onKeyDown}
              onBlur={() => setHoverI(null)}
              onPointerDown={onPlotPointerDown}
              onPointerMove={onPlotPointerMove}
              onPointerUp={onPlotPointerUp}
              onPointerCancel={onPlotPointerCancel}
              onPointerLeave={() => setHoverI(null)}
              onDoubleClick={resetDomain}
            >
              <clipPath id={plotClipId}>
                <rect x={margin.left} y={0} width={plotW} height={height} />
              </clipPath>

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

              {/* Series — cropped to the plot area so zoomed lines never bleed */}
              <g clipPath={`url(#${plotClipId})`}>
                {lined.map((s) => {
                  const dimmed = focusedId !== null && focusedId !== s.runner.id;
                  const focused = focusedId === s.runner.id;
                  const clipId = `race-${uid}-${s.runner.id}`;
                  const path = linePath(s, x, y);
                  const dotLo = Math.max(s.runner.startIndex, vi0);
                  const dotHi = Math.min(s.runner.endIndex, vi1);
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
                          dotHi >= dotLo &&
                          Array.from({ length: dotHi - dotLo + 1 }, (_, k) => dotLo + k)
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
                        {s.runner.pulls
                          .filter((p) => p.i >= dotLo && p.i <= dotHi)
                          .map((p) =>
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
              </g>

              {/* End labels — identity lives here (hover/tap to trace, click to hold) */}
              {endLabels.map(({ s, anchor, count, ty }) => {
                const dimmed = focusedId !== null && focusedId !== s.runner.id;
                const tx = Math.min(x(anchor), width - margin.right);
                return (
                  <g
                    key={s.runner.id}
                    ref={(el) => {
                      if (el) labelRefs.current.set(s.runner.id, el);
                      else labelRefs.current.delete(s.runner.id);
                    }}
                    style={{ opacity: 0, transition: "opacity 500ms ease 120ms" }}
                  >
                    <g
                      style={{
                        opacity: dimmed ? 0.15 : 1,
                        transition: "opacity 220ms ease",
                        cursor: "pointer",
                      }}
                      onPointerEnter={() => setPointedId(s.runner.id)}
                      onPointerLeave={() => setPointedId(null)}
                      onClick={() =>
                        setLockedId((cur) => (cur === s.runner.id ? null : s.runner.id))
                      }
                    >
                      <rect
                        x={tx + 2}
                        y={ty - 9}
                        width={margin.right - 4}
                        height={18}
                        fill="transparent"
                        pointerEvents="all"
                      />
                      <circle cx={tx + 9} cy={ty} r="2.5" fill={s.color} />
                      <text
                        x={tx + 15}
                        y={ty + 3}
                        fontSize="10.5"
                        fill="var(--muted-foreground)"
                      >
                        {s.runner.isViewer ? "You" : `@${s.runner.handle}`}
                        <tspan fill="var(--foreground)" fontWeight="600">
                          {" "}
                          {count}
                        </tspan>
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Brush selection (mouse drag-to-zoom) */}
              {brushSel && (
                <rect
                  x={x(brushSel.d0)}
                  y={margin.top}
                  width={Math.max(0, x(brushSel.d1) - x(brushSel.d0))}
                  height={plotH}
                  fill="var(--accent)"
                  fillOpacity="0.08"
                  stroke="var(--accent)"
                  strokeOpacity="0.35"
                  strokeWidth="1"
                  pointerEvents="none"
                />
              )}

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

      {/* Zoom brush — drag the edges to zoom, the window to pan */}
      {width > 0 && zoomable && (
        <BrushStrip
          lined={lined}
          days={days}
          domain={domain}
          onChange={applyDomain}
          width={width}
          marginLeft={margin.left}
          marginRight={margin.right}
        />
      )}
    </div>
  );
}

// ─── Brush strip ──────────────────────────────────────────────────────────────
// A miniature of the whole race with a draggable window: edges resize the
// visible interval, the window body pans it, tapping outside recenters. Sized
// for touch — the handle hit zones are far wider than the 3px bars they draw.

const BRUSH_H = 44;
const BRUSH_PAD_T = 5;
const BRUSH_PAD_B = 7;

function BrushStrip({
  lined,
  days,
  domain,
  onChange,
  width,
  marginLeft,
  marginRight,
}: {
  lined: Series[];
  days: number;
  domain: Domain;
  onChange: (d0: number, d1: number) => void;
  width: number;
  marginLeft: number;
  marginRight: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ mode: "l" | "r" | "pan"; grabOffset: number } | null>(null);

  const fullD1 = Math.max(days - 1, 1);
  const plotW = Math.max(40, width - marginLeft - marginRight);
  const mx = (i: number) => marginLeft + (i / fullD1) * plotW;
  const my = (c: number) => BRUSH_PAD_T + (BRUSH_H - BRUSH_PAD_T - BRUSH_PAD_B) * (1 - c / DECK_SIZE);

  const dayFromClientX = (clientX: number): number => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clamp(((clientX - rect.left - marginLeft) / plotW) * fullD1, 0, fullD1);
  };

  const span = domain.d1 - domain.d0;
  const xl = mx(domain.d0);
  const xr = mx(domain.d1);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture is best-effort — inactive/synthetic pointers can't be captured
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const day = dayFromClientX(e.clientX);
    if (Math.abs(px - xl) <= 14 && Math.abs(px - xl) <= Math.abs(px - xr)) {
      dragRef.current = { mode: "l", grabOffset: 0 };
    } else if (Math.abs(px - xr) <= 14) {
      dragRef.current = { mode: "r", grabOffset: 0 };
    } else if (px > xl && px < xr) {
      dragRef.current = { mode: "pan", grabOffset: day - domain.d0 };
    } else {
      // Tap outside the window: recenter it there, then pan.
      const d0 = clamp(day - span / 2, 0, fullD1 - span);
      onChange(d0, d0 + span);
      dragRef.current = { mode: "pan", grabOffset: span / 2 };
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const day = dayFromClientX(e.clientX);
    if (drag.mode === "l") {
      onChange(Math.min(day, domain.d1 - MIN_SPAN), domain.d1);
    } else if (drag.mode === "r") {
      onChange(domain.d0, Math.max(day, domain.d0 + MIN_SPAN));
    } else {
      const d0 = clamp(day - drag.grabOffset, 0, fullD1 - span);
      onChange(d0, d0 + span);
    }
  };

  const onPointerEnd = () => {
    dragRef.current = null;
  };

  return (
    <svg
      ref={ref}
      width={width}
      height={BRUSH_H}
      aria-hidden
      className="block"
      style={{ touchAction: "none", cursor: "crosshair" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {/* Miniature race */}
      {lined.map((s) => (
        <path
          key={s.runner.id}
          d={linePath(s, mx, my)}
          fill="none"
          stroke={s.color}
          strokeOpacity="0.55"
          strokeWidth="1"
        />
      ))}
      <line
        x1={marginLeft}
        x2={width - marginRight}
        y1={BRUSH_H - BRUSH_PAD_B}
        y2={BRUSH_H - BRUSH_PAD_B}
        stroke="var(--border)"
        strokeWidth="1"
      />
      {/* Dim the un-selected stretches */}
      <rect
        x={marginLeft}
        y={0}
        width={Math.max(0, xl - marginLeft)}
        height={BRUSH_H}
        fill="var(--card)"
        fillOpacity="0.72"
      />
      <rect
        x={xr}
        y={0}
        width={Math.max(0, width - marginRight - xr)}
        height={BRUSH_H}
        fill="var(--card)"
        fillOpacity="0.72"
      />
      {/* Window */}
      <rect
        x={xl}
        y={0.5}
        width={Math.max(0, xr - xl)}
        height={BRUSH_H - 1}
        fill="var(--accent)"
        fillOpacity="0.05"
        stroke="var(--accent)"
        strokeOpacity="0.45"
        strokeWidth="1"
      />
      {/* Handles — 3px bars with wide invisible hit zones */}
      {[
        { hx: xl, cursor: "ew-resize" },
        { hx: xr, cursor: "ew-resize" },
      ].map(({ hx, cursor }, k) => (
        <g key={k} style={{ cursor }}>
          <rect x={hx - 14} y={0} width={28} height={BRUSH_H} fill="transparent" pointerEvents="all" />
          <rect x={hx - 1.5} y={4} width={3} height={BRUSH_H - 8} fill="var(--accent-text)" />
          <rect x={hx - 4.5} y={BRUSH_H / 2 - 5} width={9} height={10} fill="var(--card)" stroke="var(--accent-text)" strokeWidth="1" />
          <line x1={hx - 1.5} y1={BRUSH_H / 2 - 2} x2={hx + 1.5} y2={BRUSH_H / 2 - 2} stroke="var(--accent-text)" strokeWidth="1" />
          <line x1={hx - 1.5} y1={BRUSH_H / 2 + 2} x2={hx + 1.5} y2={BRUSH_H / 2 + 2} stroke="var(--accent-text)" strokeWidth="1" />
        </g>
      ))}
    </svg>
  );
}
