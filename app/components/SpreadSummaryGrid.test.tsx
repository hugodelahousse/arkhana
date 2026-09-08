// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { SpreadSummaryGrid } from "./SpreadSummaryGrid";
import type { SpreadCardResult } from "../lib/spread-pull";
import { CARDS } from "../lib/cards";
import type { Rarity } from "../lib/cards";
import { SPREAD_REGISTRY } from "../lib/spreads";

vi.mock("motion/react", () => import("../test/motionMock"));
vi.mock("./TarotCard", () => ({
  TarotCard: ({ card }: { card: { name: string } }) =>
    React.createElement("div", { "data-testid": "tarot-card" }, card.name),
}));

function makeCard(position: number): SpreadCardResult {
  return {
    position,
    positionKey: `pos-${position}`,
    userCardId: position,
    cardId: position % CARDS.length,
    card: CARDS[position % CARDS.length],
    rarityScore: 3 as Rarity,
    isRadiant: false,
    isReversed: false,
  };
}

describe("SpreadSummaryGrid — sunday-weekly (4 cards)", () => {
  const spread = SPREAD_REGISTRY["sunday-weekly"];
  const cards = spread.positions.map((p) => makeCard(p.index));

  it("renders all position labels", () => {
    render(<SpreadSummaryGrid cards={cards} positions={spread.positions} />);
    for (const pos of spread.positions) {
      expect(screen.getByText(pos.label)).toBeInTheDocument();
    }
  });

  it("renders 4 card entries", () => {
    render(<SpreadSummaryGrid cards={cards} positions={spread.positions} />);
    expect(screen.getAllByTestId("tarot-card")).toHaveLength(4);
  });
});

describe("SpreadSummaryGrid — new-moon (5 cards)", () => {
  const spread = SPREAD_REGISTRY["new-moon"];
  const cards = spread.positions.map((p) => makeCard(p.index));

  it("renders all 5 position labels", () => {
    render(<SpreadSummaryGrid cards={cards} positions={spread.positions} />);
    for (const pos of spread.positions) {
      expect(screen.getByText(pos.label)).toBeInTheDocument();
    }
  });

  it("renders 5 card entries", () => {
    render(<SpreadSummaryGrid cards={cards} positions={spread.positions} />);
    expect(screen.getAllByTestId("tarot-card")).toHaveLength(5);
  });
});

describe("SpreadSummaryGrid — full-moon (6 cards)", () => {
  const spread = SPREAD_REGISTRY["full-moon"];
  const cards = spread.positions.map((p) => makeCard(p.index));

  it("renders all 6 position labels", () => {
    render(<SpreadSummaryGrid cards={cards} positions={spread.positions} />);
    for (const pos of spread.positions) {
      expect(screen.getByText(pos.label)).toBeInTheDocument();
    }
  });

  it("renders 6 card entries", () => {
    render(<SpreadSummaryGrid cards={cards} positions={spread.positions} />);
    expect(screen.getAllByTestId("tarot-card")).toHaveLength(6);
  });
});
