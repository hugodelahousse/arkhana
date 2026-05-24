import { useRef, useState, useCallback } from "react";

const HOLD_DURATION = 600; // ms to hold before reveal

export function useHoldReveal(onReveal?: () => void) {
  const [progress, setProgress] = useState(0); // 0–1
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const cancel = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    setProgress(0);
  }, []);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    startRef.current = performance.now();

    function tick(now: number) {
      if (!activeRef.current || startRef.current === null) return;
      const elapsed = now - startRef.current;
      const p = Math.min(elapsed / HOLD_DURATION, 1);
      setProgress(p);
      if (p >= 1) {
        activeRef.current = false;
        rafRef.current = null;
        startRef.current = null;
        onReveal?.();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [onReveal]);

  return { progress, start, cancel };
}
