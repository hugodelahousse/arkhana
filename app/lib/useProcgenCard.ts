import { useState, useEffect } from "react";
import { useCardStyle } from "./CardStyleContext";
import { getProcgenCard } from "./procgenCache";

function hashUserId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

export function useProcgenProps(cardId: number): { imageUrl?: string } {
  const { style, userId } = useCardStyle();
  const isProcgen = style === "procgen" && !!userId;
  const seed = isProcgen ? hashUserId(userId!) : 0;
  const [url, setUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!isProcgen) return;
    let stale = false;
    getProcgenCard(cardId, seed, (u) => { if (!stale) setUrl(u); });
    return () => { stale = true; };
  }, [isProcgen, cardId, seed]);

  const effectiveUrl = isProcgen ? url : undefined;

  if (!isProcgen) return {};
  return effectiveUrl ? { imageUrl: effectiveUrl } : {};
}
