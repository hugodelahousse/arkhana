import type { SpreadPositionKey } from "./spreads";
import { CARD_POSITION_DESCRIPTIONS_A } from "./card-position-descriptions-a";
import { CARD_POSITION_DESCRIPTIONS_B } from "./card-position-descriptions-b";
import { CARD_POSITION_DESCRIPTIONS_C } from "./card-position-descriptions-c";

export type { SpreadPositionKey };
export type CardPositionDescriptions = Record<number, Partial<Record<SpreadPositionKey, string>>>;

export const CARD_POSITION_DESCRIPTIONS: CardPositionDescriptions = {
  ...CARD_POSITION_DESCRIPTIONS_A,
  ...CARD_POSITION_DESCRIPTIONS_B,
  ...CARD_POSITION_DESCRIPTIONS_C,
};
