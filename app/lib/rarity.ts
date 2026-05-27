import type { Rarity } from "./cards.js";

export type PullType = "daily" | "spread";

const RARITY_TABLE: Array<{ score: Rarity; weight: number }> = [
  { score: 1, weight: 0.5 },
  { score: 2, weight: 0.25 },
  { score: 3, weight: 0.15 },
  { score: 4, weight: 0.08 },
  { score: 5, weight: 0.02 },
];

const CUMULATIVE = RARITY_TABLE.reduce<Array<{ score: Rarity; threshold: number }>>(
  (acc, { score, weight }) => [
    ...acc,
    { score, threshold: (acc.at(-1)?.threshold ?? 0) + weight },
  ],
  []
);

export function rollRarity(): Rarity {
  const r = Math.random();
  return CUMULATIVE.find(({ threshold }) => r < threshold)?.score ?? 1;
}

export function rollRadiant(): boolean {
  return Math.random() < 0.01;
}

function reversedChance(pullType: PullType): number {
  switch (pullType) {
    case "daily": return 0.10;
    case "spread": return 0.25;
    default: { const _: never = pullType; return 0.10; }
  }
}

export function rollReversed(pullType: PullType): boolean {
  return Math.random() < reversedChance(pullType);
}
