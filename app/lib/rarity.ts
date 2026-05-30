import type { Rarity } from "./cards.js";

export type PullType = "daily" | "spread";

const SOFT_PITY_START = 10;
const HARD_PITY = 12;
const BASE_MYSTIC_PLUS = 0.25;
const RAMP_PER_PULL = (1.0 - BASE_MYSTIC_PLUS) / (HARD_PITY - SOFT_PITY_START);

export { HARD_PITY };

const MYSTIC_PLUS_WEIGHTS = [
  { score: 3 as Rarity, weight: 0.15 },
  { score: 4 as Rarity, weight: 0.08 },
  { score: 5 as Rarity, weight: 0.02 },
];
const MYSTIC_PLUS_TOTAL = MYSTIC_PLUS_WEIGHTS.reduce((s, w) => s + w.weight, 0);
const MYSTIC_PLUS_CDF = MYSTIC_PLUS_WEIGHTS.reduce<Array<{ score: Rarity; threshold: number }>>(
  (acc, { score, weight }) => [
    ...acc,
    { score, threshold: (acc.at(-1)?.threshold ?? 0) + weight / MYSTIC_PLUS_TOTAL },
  ],
  []
);

const LOW_WEIGHTS = [
  { score: 1 as Rarity, weight: 0.5 },
  { score: 2 as Rarity, weight: 0.25 },
];
const LOW_TOTAL = LOW_WEIGHTS.reduce((s, w) => s + w.weight, 0);
const LOW_CDF = LOW_WEIGHTS.reduce<Array<{ score: Rarity; threshold: number }>>(
  (acc, { score, weight }) => [
    ...acc,
    { score, threshold: (acc.at(-1)?.threshold ?? 0) + weight / LOW_TOTAL },
  ],
  []
);

function getMysticPlusChance(dryStreak: number): number {
  if (dryStreak < SOFT_PITY_START) return BASE_MYSTIC_PLUS;
  return Math.min(1.0, BASE_MYSTIC_PLUS + (dryStreak - SOFT_PITY_START + 1) * RAMP_PER_PULL);
}

export function rollRarity(dryStreak: number = 0): Rarity {
  const mysticChance = getMysticPlusChance(dryStreak);

  if (Math.random() < mysticChance) {
    const r = Math.random();
    return MYSTIC_PLUS_CDF.find(({ threshold }) => r < threshold)?.score ?? 3;
  }

  const r = Math.random();
  return LOW_CDF.find(({ threshold }) => r < threshold)?.score ?? 1;
}

export function rollRadiant(): boolean {
  return Math.random() < 0.01;
}

function reversedChance(pullType: PullType): number {
  switch (pullType) {
    case "daily": return 0.10;
    case "spread": return 0.25;
    default:
      pullType satisfies never;
      return 0.10;
  }
}

export function rollReversed(pullType: PullType): boolean {
  return Math.random() < reversedChance(pullType);
}
