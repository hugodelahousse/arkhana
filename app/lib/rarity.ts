const RARITY_TABLE = [
  { score: 1, weight: 0.5 },
  { score: 2, weight: 0.25 },
  { score: 3, weight: 0.15 },
  { score: 4, weight: 0.08 },
  { score: 5, weight: 0.02 },
];

const CUMULATIVE = (() => {
  let acc = 0;
  return RARITY_TABLE.map(({ score, weight }) => ({
    score,
    threshold: (acc += weight),
  }));
})();

export function rollRarity(): number {
  const r = Math.random();
  return CUMULATIVE.find(({ threshold }) => r < threshold)?.score ?? 1;
}

export const rollRadiant = () => Math.random() < 0.05;
export const rollReversed = () => Math.random() < 0.33;
