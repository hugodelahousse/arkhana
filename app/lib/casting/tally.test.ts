import { describe, expect, it } from "vitest";
import { countVoters, resolveOrder, tally } from "./tally";

describe("resolveOrder", () => {
  it("lists unplaced proposals after the saved ranking, oldest first", () => {
    expect(resolveOrder(["a", "b", "c", "d"], ["c", "a"])).toEqual({
      order: ["c", "a", "b", "d"],
      unranked: ["b", "d"],
    });
  });

  it("drops deleted and repeated ids", () => {
    expect(resolveOrder(["a", "b"], ["gone", "b", "b", "a"])).toEqual({
      order: ["b", "a"],
      unranked: [],
    });
  });

  it("treats no ballot as everything unranked", () => {
    expect(resolveOrder(["a", "b"], null)).toEqual({ order: ["a", "b"], unranked: ["a", "b"] });
  });
});

describe("tally", () => {
  it("adds Borda points and first choices across ballots", () => {
    const result = tally(
      ["a", "b", "c"],
      [
        ["a", "b", "c"],
        ["b", "a", "c"],
        ["a", "c", "b"],
      ]
    );
    expect(result).toEqual([
      { id: "a", points: 5, firsts: 2 },
      { id: "b", points: 3, firsts: 1 },
      { id: "c", points: 1, firsts: 0 },
    ]);
  });

  it("gives unplaced proposals the average of the leftover points", () => {
    // "c" and "d" were proposed after this ballot: they share (1 + 0) / 2.
    expect(tally(["a", "b", "c", "d"], [["b", "a"]])).toEqual([
      { id: "b", points: 3, firsts: 1 },
      { id: "a", points: 2, firsts: 0 },
      { id: "c", points: 0.5, firsts: 0 },
      { id: "d", points: 0.5, firsts: 0 },
    ]);
  });

  it("ignores ballots with no current proposals and keeps proposal order on ties", () => {
    expect(tally(["a", "b"], [["gone"], []])).toEqual([
      { id: "a", points: 0, firsts: 0 },
      { id: "b", points: 0, firsts: 0 },
    ]);
    expect(countVoters(["a", "b"], [["gone"], [], ["b"]])).toBe(1);
  });
});
