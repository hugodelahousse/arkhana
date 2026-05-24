import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useHandler } from "./useHandler";

type Handler = (nx: number, ny: number) => void;

type OrientationContextValue = {
  subscribe: (handler: Handler) => () => void;
};

// No-op default so components work outside the provider (tests, Storybook, etc.)
const OrientationContext = createContext<OrientationContextValue>({
  subscribe: () => () => {},
});

export function OrientationProvider({ children }: { children: ReactNode }) {
  const handlers = useRef(new Set<Handler>());
  const base = useRef<{ gamma: number; beta: number } | null>(null);

  const subscribe = useCallback((handler: Handler): (() => void) => {
    handlers.current.add(handler);
    return () => handlers.current.delete(handler);
  }, []);

  useEffect(() => {
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      if (!base.current) base.current = { gamma: e.gamma, beta: e.beta };
      const nx = Math.max(-1, Math.min(1, (e.gamma - base.current.gamma) / 90));
      const ny = Math.max(-1, Math.min(1, (e.beta  - base.current.beta)  / 90));
      document.documentElement.style.setProperty("--ratio-x", String((nx + 1) / 2));
      document.documentElement.style.setProperty("--ratio-y", String((ny + 1) / 2));
      handlers.current.forEach((h) => h(nx, ny));
    };
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []);

  const value = useMemo(() => ({ subscribe }), [subscribe]);

  return (
    <OrientationContext.Provider value={value}>
      {children}
    </OrientationContext.Provider>
  );
}

export function useOrientation() {
  return useContext(OrientationContext);
}

/** Subscribe to orientation updates for the lifetime of the calling component. */
export function useOrientationEffect(handler: Handler) {
  const { subscribe } = useOrientation();
  const stable = useHandler(handler);
  useEffect(() => subscribe(stable), [subscribe, stable]);
}
