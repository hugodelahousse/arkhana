import { CARD_BY_ID } from "./cards.js";

const CDN = "https://cdn.jsdelivr.net/gh/metabismuth/tarot-json@master/cards";

const SUIT_PREFIX: Record<string, string> = {
  wands: "w",
  cups: "c",
  swords: "s",
  pentacles: "p",
};

export function cardImageUrl(cardId: number): string {
  const card = CARD_BY_ID[cardId];
  const prefix = card.arcana === "major" ? "m" : SUIT_PREFIX[card.suit!];
  const num = String(card.number).padStart(2, "0");
  return `${CDN}/${prefix}${num}.jpg`;
}
