import { useEffect, useState } from "react";

/**
 * Returns a `revealed` boolean that flips to true `delay` ms after `trigger`
 * becomes truthy. Resets to false whenever trigger goes falsy.
 */
export function useAutoReveal(trigger: boolean, delay = 600): [boolean, () => void] {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!trigger) {
      setRevealed(false);
      return;
    }
    const t = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(t);
  }, [trigger, delay]);

  return [revealed, () => setRevealed(true)];
}
