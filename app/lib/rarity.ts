const RARITY_TABLE = [
  { score: 1, weight: 0.5 },
  { score: 2, weight: 0.25 },
  { score: 3, weight: 0.15 },
  { score: 4, weight: 0.08 },
  { score: 5, weight: 0.02 },
];

const CUMULATIVE = RARITY_TABLE.reduce<Array<{ score: number; threshold: number }>>(
  (acc, { score, weight }) => [
    ...acc,
    { score, threshold: (acc.at(-1)?.threshold ?? 0) + weight },
  ],
  []
);

export function rollRarity(): number {
  const r = Math.random();
  return CUMULATIVE.find(({ threshold }) => r < threshold)?.score ?? 1;
}

export function rollRadiant(): boolean {
  return Math.random() < 0.05;
}

export function rollReversed(): boolean {
  return Math.random() < 0.33;
}
