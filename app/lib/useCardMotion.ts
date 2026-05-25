import { useCallback, useEffect, useRef } from "react";
import { useSpring } from "motion/react";
import type { MotionStyle } from "motion/react";

export interface CardMotionConfig {
  idleAmplitude: number;    // degrees of idle sway
  idleSpeed: number;        // oscillation speed multiplier
  touchHScale: number;      // max rotation degrees from full horizontal swipe
  touchVGive: number;       // vertical rotation as fraction of horizontal
  springStiffness: number;  // spring stiffness
  springDamping: number;    // spring damping
}

export const DEFAULT_MOTION_CONFIG: CardMotionConfig = {
  idleAmplitude: 3,
  idleSpeed: 0.5,
  touchHScale: 30,
  touchVGive: 0.25,
  springStiffness: 200,
  springDamping: 25,
};

export function useCardMotion(
  ref: React.RefObject<HTMLDivElement | null>,
  config: CardMotionConfig,
  onDragStart?: () => void,
) {
  const cfgRef = useRef(config);
  cfgRef.current = config;

  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;

  const rotateX = useSpring(0, { stiffness: config.springStiffness, damping: config.springDamping });
  const rotateY = useSpring(0, { stiffness: config.springStiffness, damping: config.springDamping });

  const isDraggingRef = useRef(false);
  const isHoveringRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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

  // Touch drag — horizontal rotates, vertical has limited give
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    isDraggingRef.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current || !ref.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (!isDraggingRef.current && Math.hypot(dx, dy) > 8) {
      isDraggingRef.current = true;
      onDragStartRef.current?.();
    }
    if (!isDraggingRef.current) return;

    const { width, height } = ref.current.getBoundingClientRect();
    const { touchHScale, touchVGive } = cfgRef.current;
    const nx = Math.max(-1, Math.min(1, (dx / width) * 2));
    const ny = Math.max(-1, Math.min(1, (dy / height) * 2));
    rotateY.set(nx * touchHScale);
    rotateX.set(-ny * touchHScale * touchVGive);
    setCSSVars(nx, ny);
  }, [ref, rotateX, rotateY, setCSSVars]);

  const onTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
    touchStartRef.current = null;
    rotateX.set(0);
    rotateY.set(0);
    resetCSSVars();
  }, [rotateX, rotateY, resetCSSVars]);

  // Mouse hover (desktop)
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    isHoveringRef.current = true;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const nx = ((e.clientX - left) / width) * 2 - 1;
    const ny = ((e.clientY - top) / height) * 2 - 1;
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
    rotateX.set(0);
    rotateY.set(0);
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
