import { useCardStyle } from "./CardStyleContext";

function hashUserId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

export function useProcgenProps(cardId: number): {
  imageUrl?: string;
  loading: boolean;
} {
  const { style, userId } = useCardStyle();
  const isProcgen = style === "procgen" && !!userId;

  if (!isProcgen) return { loading: false };

  const seed = hashUserId(userId!);
  return {
    imageUrl: `/api/procgen.png?id=${cardId}&seed=${seed}&w=752`,
    loading: false,
  };
}
