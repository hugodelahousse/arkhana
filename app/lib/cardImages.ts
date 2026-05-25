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

// Card IDs that have a _top.png mask file in public/cards/masks/.
// A missing top mask causes mobile Safari to render the layer fully unmasked
// (Chrome hides it; Safari shows it), so we gate rendering on this set.
const TOP_MASK_IDS = new Set([3, 7, 16, 17]);

export function hasTopMask(cardId: number): boolean {
  return TOP_MASK_IDS.has(cardId);
}

export function cardTopMaskUrl(cardId: number): string {
  return `/cards/masks/${cardImageSlugCdn(cardId)}_top.png`;
}
