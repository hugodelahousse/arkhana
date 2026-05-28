import { useCardStyle } from "./CardStyleContext";

function hashUserId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

export function procgenImageUrl(cardId: number, userId: string): string {
  const seed = hashUserId(userId);
  return `/api/procgen.png?id=${cardId}&seed=${seed}&w=752`;
}

export function useProcgenProps(cardId: number): { imageUrl?: string } {
  const { style, userId } = useCardStyle();
  if (style !== "procgen" || !userId) return {};
  return { imageUrl: procgenImageUrl(cardId, userId) };
}
