import { CARD_BY_ID } from "./cards.js";

const CDN = "https://cdn.jsdelivr.net/gh/metabismuth/tarot-json@master/cards";

const SUIT_PREFIX: Record<string, string> = {
  wands: "w",
  cups: "c",
  swords: "s",
  pentacles: "p",
};

export function cardImageSlugCdn(cardId: number): string {
  const card = CARD_BY_ID[cardId];
  const prefix = card.arcana === "major" ? "m" : SUIT_PREFIX[card.suit!];
  return `${prefix}${String(card.number).padStart(2, "0")}`;
}

export function cardImageUrl(cardId: number): string {
  return `${CDN}/${cardImageSlugCdn(cardId)}.jpg`;
}

export function cardMaskUrl(cardId: number): string {
  return `/cards/masks/${cardImageSlugCdn(cardId)}.png`;
}

export function cardNameMaskUrl(cardId: number): string {
  return `/cards/masks/${cardImageSlugCdn(cardId)}_name.png`;
}

export function cardTopMaskUrl(cardId: number): string {
  return `/cards/masks/${cardImageSlugCdn(cardId)}_top.png`;
}
