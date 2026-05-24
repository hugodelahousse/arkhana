import { useRef, useState, useCallback } from "react";

const HOLD_DURATION = 600; // ms to hold before reveal

export function useHoldReveal(
  onReveal?: () => void,
  elementRef?: React.RefObject<HTMLElement | null>,
) {
  const [isHolding, setIsHolding] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const setProgressVar = useCallback(
    (p: number) => {
      elementRef?.current?.style.setProperty("--hold-progress", String(p));
    },
    [elementRef],
  );

  const cancel = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startRef.current = null;
    setIsHolding(false);
    setProgressVar(0);
  }, [setProgressVar]);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    startRef.current = performance.now();
    setIsHolding(true);

    function tick(now: number) {
      if (!activeRef.current || startRef.current === null) return;
      const elapsed = now - startRef.current;
      const p = Math.min(elapsed / HOLD_DURATION, 1);
      setProgressVar(p);
      if (p >= 1) {
        activeRef.current = false;
        rafRef.current = null;
        startRef.current = null;
        setIsHolding(false);
        onReveal?.();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [onReveal, setProgressVar]);

  return { isHolding, start, cancel };
}
