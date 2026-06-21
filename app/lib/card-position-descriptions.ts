import type { SpreadPositionKey } from "./spreads";
import { CARD_POSITION_DESCRIPTIONS_A } from "./card-position-descriptions-a";
import { CARD_POSITION_DESCRIPTIONS_B } from "./card-position-descriptions-b";
import { CARD_POSITION_DESCRIPTIONS_C } from "./card-position-descriptions-c";
import { CARD_POSITION_DESCRIPTIONS_A_REVERSED } from "./card-position-descriptions-a-reversed";
import { CARD_POSITION_DESCRIPTIONS_B_REVERSED } from "./card-position-descriptions-b-reversed";
import { CARD_POSITION_DESCRIPTIONS_C_REVERSED } from "./card-position-descriptions-c-reversed";

export type { SpreadPositionKey };

export type CardPositionDescriptionEntry = {
  upright: Partial<Record<SpreadPositionKey, string>>;
  reversed: Partial<Record<SpreadPositionKey, string>>;
};

export type CardPositionDescriptions = Record<number, CardPositionDescriptionEntry>;

const upright: Record<number, Partial<Record<SpreadPositionKey, string>>> = {
  ...CARD_POSITION_DESCRIPTIONS_A,
  ...CARD_POSITION_DESCRIPTIONS_B,
  ...CARD_POSITION_DESCRIPTIONS_C,
};

const reversed: Record<number, Partial<Record<SpreadPositionKey, string>>> = {
  ...CARD_POSITION_DESCRIPTIONS_A_REVERSED,
  ...CARD_POSITION_DESCRIPTIONS_B_REVERSED,
  ...CARD_POSITION_DESCRIPTIONS_C_REVERSED,
};

// Build combined record, sharing keys from 0–77
const ids = Array.from({ length: 78 }, (_, i) => i);
export const CARD_POSITION_DESCRIPTIONS: CardPositionDescriptions = Object.fromEntries(
  ids.map((id) => [id, { upright: upright[id] ?? {}, reversed: reversed[id] ?? {} }])
);
