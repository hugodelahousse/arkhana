import { useCallback, useEffect, useRef } from "react";
import { useMotionValue, useSpring, animate } from "motion/react";
import type { MotionStyle } from "motion/react";

export interface CardMotionConfig {
  idleAmplitude: number;    // degrees of idle sway
  idleSpeed: number;        // oscillation speed multiplier
  touchHScale: number;      // degrees per card-width of horizontal swipe
  touchVMax: number;        // max vertical rotation in degrees
  springStiffness: number;
  springDamping: number;
}

export const DEFAULT_MOTION_CONFIG: CardMotionConfig = {
  idleAmplitude: 3,
  idleSpeed: 0.5,
  touchHScale: 360,   // one full rotation per card width
  touchVMax: 8,
  springStiffness: 200,
  springDamping: 25,
};

// Normalise any accumulated rotation angle into 0–360 range.
// rotateY(360deg) === rotateY(0deg) visually, so setting the MotionValue to the
// normalised equivalent is a safe instant teleport with no visible change.
function normalise360(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function useCardMotion(
  ref: React.RefObject<HTMLDivElement | null>,
  config: CardMotionConfig,
  onDragStart?: () => void,
) {
  const cfgRef = useRef(config);
  cfgRef.current = config;
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;

  // rotateX: spring (small clamped values — no wrap-around issue)
  const rotateX = useSpring(0, { stiffness: config.springStiffness, damping: config.springDamping });
  // rotateY: plain MotionValue so we can teleport after snapping
  const rotateY = useMotionValue(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snapAnimRef = useRef<any>(null);
  const isDraggingRef = useRef(false);
  const isHoveringRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const baseRotYRef  = useRef(0);   // normalised rotateY at touch-start
  const cardWidthRef = useRef(200); // updated on each touch-start
  const velocityRef  = useRef(0);   // px/ms, EMA-smoothed
  const lastXRef     = useRef(0);
  const lastTimeRef  = useRef(0);

  const setCSSVars = useCallback((nx: number, ny: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--ratio-x", String((nx + 1) / 2));
    el.style.setProperty("--ratio-y", String((ny + 1) / 2));
    el.style.setProperty("--glow-x",  String((nx + 1) / 2));
    el.style.setProperty("--glow-y",  String((ny + 1) / 2));
    el.style.setProperty("--pointer-from-center", String(Math.min(1, Math.hypot(nx, ny) / Math.SQRT2)));
  }, [ref]);

  const resetCSSVars = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--ratio-x", "0.5");
    el.style.setProperty("--ratio-y", "0.5");
    el.style.setProperty("--glow-x",  "0.5");
    el.style.setProperty("--glow-y",  "0.5");
    el.style.setProperty("--pointer-from-center", "0");
  }, [ref]);

  // Autonomous idle animation — two incommensurate frequencies for organic motion
  useEffect(() => {
    let rafId: number;
    const loop = (ts: number) => {
      if (!isDraggingRef.current && !isHoveringRef.current) {
        const t = ts / 1000;
        const { idleAmplitude: amp, idleSpeed: spd } = cfgRef.current;
        const ny = Math.sin(t * spd * 0.87) * amp;
        const nx = Math.cos(t * spd * 0.53) * amp * 0.6;
        rotateX.set(-ny);
        rotateY.set(nx);
        const safeAmp = Math.max(0.01, amp);
        setCSSVars(nx / safeAmp, ny / safeAmp);
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [rotateX, rotateY, setCSSVars]);

  // Snap rotateY to the nearest multiple of 360° (front-facing), with momentum.
  // After the spring settles we teleport to 0° — visually identical but keeps
  // the value small so the idle animation can take over without a backward spin.
  const snapYToFront = useCallback(() => {
    snapAnimRef.current?.stop?.();

    const { springStiffness: stiffness, springDamping: damping, touchHScale } = cfgRef.current;
    const cardW = cardWidthRef.current;

    const current    = rotateY.get();
    const normalised = normalise360(current);
    rotateY.set(normalised); // instant teleport (safe — same visual)

    // Momentum: project where the card would be after ~250 ms at current velocity
    const degsPerPx   = touchHScale / cardW;
    const rawMomentum = velocityRef.current * 250 * degsPerPx;
    // Cap at ±3 full rotations of extra momentum
    const momentum = Math.max(-1080, Math.min(1080, rawMomentum));

    const target  = normalised + momentum;
    const snapped = Math.round(target / 360) * 360;

    if (Math.abs(normalised - snapped) < 0.5) {
      rotateY.set(0);
      return;
    }

    snapAnimRef.current = animate(rotateY, snapped, {
      type: "spring",
      stiffness,
      damping,
      onComplete: () => {
        if (!isDraggingRef.current) {
          // Teleport: rotateY(N×360°) === rotateY(0°) — invisible, resets for idle
          rotateY.set(0);
        }
      },
    });
  }, [rotateY]);

  // ── Touch drag ────────────────────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    snapAnimRef.current?.stop?.();
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };

    // Normalise and record the Y rotation base for this gesture
    const normalised = normalise360(rotateY.get());
    rotateY.set(normalised);
    baseRotYRef.current = normalised;

    if (ref.current) cardWidthRef.current = ref.current.getBoundingClientRect().width;
    lastXRef.current    = t.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;
    isDraggingRef.current = false;
  }, [rotateY, ref]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !ref.current) return;
    const t   = e.touches[0];
    const now = performance.now();
    const dt  = Math.max(1, now - lastTimeRef.current);
    // Exponential moving average for velocity
    velocityRef.current = 0.7 * velocityRef.current + 0.3 * ((t.clientX - lastXRef.current) / dt);
    lastXRef.current    = t.clientX;
    lastTimeRef.current = now;

    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (!isDraggingRef.current && Math.hypot(dx, dy) > 8) {
      isDraggingRef.current = true;
      onDragStartRef.current?.();
    }
    if (!isDraggingRef.current) return;

    const { touchHScale, touchVMax } = cfgRef.current;
    const degsPerPx = touchHScale / cardWidthRef.current;

    // Horizontal: unclamped accumulation from touch-start base
    rotateY.set(baseRotYRef.current + dx * degsPerPx);

    // Vertical: clamped give
    const { height } = ref.current.getBoundingClientRect();
    const ny = Math.max(-1, Math.min(1, (dy / height) * 2));
    rotateX.set(-ny * touchVMax);

    // Normalise horizontal for CSS vars (90° ≡ full shine)
    const nxNorm = Math.max(-1, Math.min(1, (dx * degsPerPx) / 90));
    setCSSVars(nxNorm, ny);
  }, [ref, rotateX, rotateY, setCSSVars]);

  const onTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    touchStartRef.current = null;
    rotateX.set(0);
    snapYToFront();
    resetCSSVars();
  }, [rotateX, snapYToFront, resetCSSVars]);

  // ── Mouse hover (desktop) ─────────────────────────────────────────────────

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    isHoveringRef.current = true;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const nx = ((e.clientX - left) / width)  * 2 - 1;
    const ny = ((e.clientY - top)  / height) * 2 - 1;
    rotateX.set(-ny * 15);
    rotateY.set(nx * 15);
    ref.current.style.setProperty("--ratio-x", String((nx + 1) / 2));
    ref.current.style.setProperty("--ratio-y", String((ny + 1) / 2));
    ref.current.style.setProperty("--glow-x",  String((e.clientX - left) / width));
    ref.current.style.setProperty("--glow-y",  String((e.clientY - top)  / height));
    ref.current.style.setProperty("--pointer-from-center",
      String(Math.min(1, Math.hypot(nx, ny) / Math.SQRT2)));
  }, [ref, rotateX, rotateY]);

  const onMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
    const { springStiffness: stiffness, springDamping: damping } = cfgRef.current;
    rotateX.set(0);
    animate(rotateY, 0, { type: "spring", stiffness, damping });
    resetCSSVars();
  }, [rotateX, rotateY, resetCSSVars]);

  return {
    style: { rotateX, rotateY } as MotionStyle,
    onMouseMove,
    onMouseLeave,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
