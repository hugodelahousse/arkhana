import { useCallback, useEffect, useRef } from "react";
import { useMotionValue, useSpring, animate } from "motion/react";
import type { MotionStyle } from "motion/react";

export interface CardMotionConfig {
  idleAmplitude: number;
  idleSpeed: number;
  touchHScale: number;    // degrees per card-width of horizontal swipe
  touchVMax: number;      // max vertical rotation in degrees
  spinFriction: number;   // velocity decay per frame at 60 fps (0 = no friction, 1 = instant stop)
  springStiffness: number;
  springDamping: number;
}

export const DEFAULT_MOTION_CONFIG: CardMotionConfig = {
  idleAmplitude: 6,
  idleSpeed: 0.5,
  touchHScale: 180,
  touchVMax: 30,
  spinFriction: 0.05,
  springStiffness: 200,
  springDamping: 25,
};

function normalise360(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function useCardMotion(
  ref: React.RefObject<HTMLDivElement | null>,
  config: CardMotionConfig,
  onDragStart?: () => void,
) {
  const cfgRef = useRef(config);
  // eslint-disable-next-line react-hooks/refs
  cfgRef.current = config;
  const onDragStartRef = useRef(onDragStart);
  // eslint-disable-next-line react-hooks/refs
  onDragStartRef.current = onDragStart;

  // rotateX: spring (small clamped values — no wrap issue)
  const rotateX = useSpring(0, { stiffness: config.springStiffness, damping: config.springDamping });
  // rotateY: plain MotionValue so we can teleport after snapping
  const rotateY = useMotionValue(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const snapAnimRef   = useRef<any>(null);
  const decelRafRef   = useRef<number | null>(null);
  const omegaRef      = useRef(0);         // angular velocity in deg/s

  const isDraggingRef    = useRef(false);
  const isHoveringRef    = useRef(false);
  const isDeceleratingRef = useRef(false); // prevents idle fighting the spin loop

  const touchStartRef  = useRef<{ x: number; y: number } | null>(null);
  const baseRotYRef    = useRef(0);   // normalised rotateY at touch-start
  const cardWidthRef   = useRef(200);
  const velocityRef    = useRef(0);   // px/ms, EMA-smoothed
  const lastXRef       = useRef(0);
  const lastTimeRef    = useRef(0);

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

  // Idle: two incommensurate frequencies + a subtle harmonic on each axis
  // for an organic, never-quite-periodic drift.
  useEffect(() => {
    let rafId: number;
    const loop = (ts: number) => {
      if (!isDraggingRef.current && !isHoveringRef.current && !isDeceleratingRef.current) {
        const t = ts / 1000;
        const { idleAmplitude: amp, idleSpeed: spd } = cfgRef.current;
        const ny = Math.sin(t * spd * 0.87)         * amp
                 + Math.sin(t * spd * 0.23 + 1.4)   * amp * 0.22;
        const nx = Math.cos(t * spd * 0.53)         * amp * 0.6
                 + Math.cos(t * spd * 0.17 + 2.1)   * amp * 0.18;
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

  // Physics-based spin-down after a swipe: exponential friction until velocity
  // drops to a threshold, then spring-snap to the nearest front-facing angle.
  const startDeceleration = useCallback(() => {
    if (decelRafRef.current !== null) cancelAnimationFrame(decelRafRef.current);
    isDeceleratingRef.current = true;

    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      // Cap dt so a stalled tab doesn't cause a huge jump on resume
      const dt  = Math.min(32, now - lastTime) / 1000; // seconds
      lastTime  = now;

      const { spinFriction, springStiffness: stiffness, springDamping: damping } = cfgRef.current;

      // Exponential velocity decay: same formula regardless of frame rate
      omegaRef.current *= Math.pow(1 - spinFriction, dt * 60);

      const delta     = omegaRef.current * dt;
      const current   = normalise360(rotateY.get());
      const next      = normalise360(current + delta);
      rotateY.set(next);

      // Update foil/shine: use rotation angle to drive a sweep
      const angle = next / 360; // 0–1
      setCSSVars(Math.sin(angle * Math.PI * 2), 0);

      if (Math.abs(omegaRef.current) < 30) {
        // Velocity is low enough — snap to nearest face
        const normalised = normalise360(rotateY.get());
        rotateY.set(normalised);
        const snapped = Math.round(normalised / 360) * 360; // 0 or 360

        isDeceleratingRef.current = false;
        decelRafRef.current = null;

        if (Math.abs(normalised - snapped) < 0.5) {
          rotateY.set(0);
          return;
        }

        snapAnimRef.current = animate(rotateY, snapped, {
          type: "spring",
          stiffness,
          damping,
          onComplete: () => {
            if (!isDraggingRef.current) rotateY.set(0);
          },
        });
        return;
      }

      decelRafRef.current = requestAnimationFrame(tick);
    };

    decelRafRef.current = requestAnimationFrame(tick);
  }, [rotateY, setCSSVars]);

  // ── Touch drag ──────────────────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Cancel any in-flight animation or deceleration
    if (decelRafRef.current !== null) {
      cancelAnimationFrame(decelRafRef.current);
      decelRafRef.current = null;
    }
    snapAnimRef.current?.stop?.();
    isDeceleratingRef.current = false;

    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };

    // Normalise and record base so gestures start from current visual position
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
    // EMA-smooth velocity to reduce noise from jittery touch events
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

    // Horizontal: unclamped accumulation from gesture base
    rotateY.set(baseRotYRef.current + dx * degsPerPx);

    // Vertical: clamped give
    const { height } = ref.current.getBoundingClientRect();
    const ny = Math.max(-1, Math.min(1, (dy / height) * 2));
    rotateX.set(-ny * touchVMax);

    // CSS vars for foil/shine (normalise horizontal to ±1 over 90°)
    setCSSVars(Math.max(-1, Math.min(1, (dx * degsPerPx) / 90)), ny);
  }, [ref, rotateX, rotateY, setCSSVars]);

  const onTouchEnd = useCallback(() => {
    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;
    touchStartRef.current = null;
    rotateX.set(0);
    resetCSSVars();

    // Only spin if the finger actually moved — a tap should do nothing
    if (!wasDragging) return;

    const { touchHScale } = cfgRef.current;
    const degsPerPx = touchHScale / cardWidthRef.current;
    omegaRef.current = velocityRef.current * degsPerPx * 1000; // px/ms → deg/s
    startDeceleration();
  }, [rotateX, resetCSSVars, startDeceleration]);

  // ── Mouse hover (desktop) ────────────────────────────────────────────────

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
