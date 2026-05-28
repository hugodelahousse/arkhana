export type { CardStyle } from "../../db/schema/auth.js";
import type { CardStyle } from "../../db/schema/auth.js";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

export function getCardStyleFromCookie(request: Request): CardStyle {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)cardStyle=(classic|procgen)/);
  return (match?.[1] as CardStyle) ?? "classic";
}

export function setCardStyleCookie(style: CardStyle): string {
  return `cardStyle=${style}; Path=/; Max-Age=${ONE_YEAR_S}; SameSite=Lax`;
}
