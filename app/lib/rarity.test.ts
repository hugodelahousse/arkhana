import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rollRarity } from "./rarity";

describe("rollRarity", () => {
  describe("base distribution (dryStreak=0)", () => {
    it("produces correct distribution over many rolls", () => {
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const n = 100_000;
      for (let i = 0; i < n; i++) {
        counts[rollRarity(0)]++;
      }
      expect(counts[1] / n).toBeCloseTo(0.5, 1);
      expect(counts[2] / n).toBeCloseTo(0.25, 1);
      expect(counts[3] / n).toBeCloseTo(0.15, 1);
      expect(counts[4] / n).toBeCloseTo(0.08, 1);
      expect(counts[5] / n).toBeCloseTo(0.02, 1);
    });
  });

  describe("soft pity (dryStreak=10)", () => {
    it("increases Mystic+ rate to ~62.5%", () => {
      let mysticPlus = 0;
      const n = 50_000;
      for (let i = 0; i < n; i++) {
        if (rollRarity(10) >= 3) mysticPlus++;
      }
      expect(mysticPlus / n).toBeCloseTo(0.625, 1);
    });

    it("preserves relative weights within Mystic+ tier", () => {
      const counts = { 3: 0, 4: 0, 5: 0 };
      const n = 100_000;
      for (let i = 0; i < n; i++) {
        const r = rollRarity(10);
        if (r >= 3) counts[r as 3 | 4 | 5]++;
      }
      const total = counts[3] + counts[4] + counts[5];
      expect(counts[3] / total).toBeCloseTo(0.6, 1);
      expect(counts[4] / total).toBeCloseTo(0.32, 1);
      expect(counts[5] / total).toBeCloseTo(0.08, 1);
    });
  });

  describe("hard pity (dryStreak=11)", () => {
    it("guarantees Mystic+ at dryStreak=11", () => {
      for (let i = 0; i < 1000; i++) {
        expect(rollRarity(11)).toBeGreaterThanOrEqual(3);
      }
    });

    it("guarantees Mystic+ beyond hard pity", () => {
      for (let i = 0; i < 1000; i++) {
        expect(rollRarity(50)).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe("no pity below threshold", () => {
    it("uses base rates at dryStreak=9", () => {
      let mysticPlus = 0;
      const n = 50_000;
      for (let i = 0; i < n; i++) {
        if (rollRarity(9) >= 3) mysticPlus++;
      }
      expect(mysticPlus / n).toBeCloseTo(0.25, 1);
    });
  });

  describe("default argument", () => {
    it("uses base rates when called with no argument", () => {
      let mysticPlus = 0;
      const n = 50_000;
      for (let i = 0; i < n; i++) {
        if (rollRarity() >= 3) mysticPlus++;
      }
      expect(mysticPlus / n).toBeCloseTo(0.25, 1);
    });
  });
});
