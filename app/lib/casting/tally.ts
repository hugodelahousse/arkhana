// Lab: casting vote. Pure ranking maths, shared by the server and the page.

export const CASTING_LIMITS = {
  title: 80,
  theme: 200,
  name: 60,
  pitch: 280,
  scene: 700,
  proposalsPerCard: 30,
};

/**
 * The order a voter sees: their saved ranking first (minus anything deleted since),
 * then proposals they have not placed yet, oldest first.
 */
export function resolveOrder(
  proposalIds: string[],
  saved: string[] | null
): { order: string[]; unranked: string[] } {
  const known = new Set(proposalIds);
  const ranked = [...new Set(saved ?? [])].filter((id) => known.delete(id));
  const unranked = proposalIds.filter((id) => known.has(id));
  return { order: [...ranked, ...unranked], unranked };
}

export type Standing = { id: string; points: number; firsts: number };

/**
 * Borda count. With n proposals, a voter's first choice earns n-1 points, the next n-2,
 * and so on. Proposals a voter has not placed share the points left over, so a late
 * proposal is not punished by ballots cast before it existed.
 * Ties keep the order of `proposalIds` (oldest first).
 */
export function tally(proposalIds: string[], ballots: string[][]): Standing[] {
  const n = proposalIds.length;
  const score = new Map(proposalIds.map((id) => [id, { id, points: 0, firsts: 0 }]));
  for (const ballot of ballots) {
    const { order, unranked } = resolveOrder(proposalIds, ballot);
    const ranked = order.slice(0, order.length - unranked.length);
    if (ranked.length === 0) continue;
    ranked.forEach((id, i) => {
      const s = score.get(id)!;
      s.points += n - 1 - i;
      if (i === 0) s.firsts += 1;
    });
    const leftover = (n - 1 - ranked.length) / 2;
    for (const id of unranked) score.get(id)!.points += leftover;
  }
  const position = new Map(proposalIds.map((id, i) => [id, i]));
  return [...score.values()].sort(
    (a, b) =>
      b.points - a.points || b.firsts - a.firsts || position.get(a.id)! - position.get(b.id)!
  );
}

/** Ballots that place at least one current proposal. */
export function countVoters(proposalIds: string[], ballots: string[][]): number {
  const known = new Set(proposalIds);
  return ballots.filter((b) => b.some((id) => known.has(id))).length;
}
