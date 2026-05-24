import { useCallback, useRef } from "react";

/**
 * Returns a stable function reference that always delegates to the latest
 * version of `fn` — equivalent to React's experimental useEffectEvent.
 *
 * Use this when passing a callback into an event subscription (useEffect,
 * addEventListener, etc.) to avoid re-subscribing whenever the closure changes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useHandler<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  // Empty deps is intentional: stability is the point of this hook.
  // ref is a stable object; ref.current is always the latest fn.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}
