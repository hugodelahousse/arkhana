import { getCardDescription, type CardDefinition, type Rarity } from "../lib/cards";
import type { Locale } from "./index";
import { FR_CARDS } from "./locales/cards-fr";

export function getLocalizedCardName(card: CardDefinition, locale: Locale): string {
  if (locale === "fr") return FR_CARDS[card.id]?.name ?? card.name;
  return card.name;
}

export function getLocalizedCardDescription(
  card: CardDefinition,
  rarityScore: Rarity,
  isReversed: boolean,
  locale: Locale,
): string {
  if (locale === "fr") {
    const fr = FR_CARDS[card.id];
    if (fr) {
      return (isReversed ? fr.reversedDescriptions : fr.descriptions)[rarityScore - 1];
    }
  }
  return getCardDescription(card, rarityScore, isReversed);
}
