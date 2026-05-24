import { useEffect } from "react";

export type OrientationHandler = (nx: number, ny: number) => void;

const handlers = new Set<OrientationHandler>();
let listenerBound = false;
let baseGamma: number | null = null;
let baseBeta: number | null = null;

/** Subscribe to normalised orientation values (nx/ny ∈ [-1, 1], relative to mount angle). */
export function subscribeOrientation(handler: OrientationHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

/**
 * Call once at the app root. Registers the singleton deviceorientation listener
 * and keeps --ratio-x / --ratio-y on <html> in sync so any CSS on the page
 * can react to tilt without per-component wiring.
 */
export function useGlobalOrientation() {
  useEffect(() => {
    if (listenerBound || typeof window === "undefined") return;
    window.addEventListener(
      "deviceorientation",
      (e: DeviceOrientationEvent) => {
        if (e.gamma === null || e.beta === null) return;
        if (baseGamma === null) baseGamma = e.gamma;
        if (baseBeta === null) baseBeta = e.beta;
        const nx = Math.max(-1, Math.min(1, (e.gamma - baseGamma) / 90));
        const ny = Math.max(-1, Math.min(1, (e.beta  - baseBeta)  / 90));
        document.documentElement.style.setProperty("--ratio-x", String((nx + 1) / 2));
        document.documentElement.style.setProperty("--ratio-y", String((ny + 1) / 2));
        handlers.forEach((h) => h(nx, ny));
      },
      { passive: true },
    );
    listenerBound = true;
  }, []);
}
