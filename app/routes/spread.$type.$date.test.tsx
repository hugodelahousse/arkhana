// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { createRoutesStub } from "react-router";
import SpreadDateRoute from "./spread.$type.$date";
import { SPREAD_REGISTRY } from "../lib/spreads";
import { CARDS } from "../lib/cards";
import type { SpreadCardResult } from "../lib/spread-pull";
import type { Rarity } from "../lib/cards";

vi.mock("motion/react", () => import("../test/motionMock"));
vi.mock("../components/DirectionalTransition", () => ({
  DirectionalTransition: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock("../components/ShareButton", () => ({
  ShareButton: () => null,
}));
vi.mock("../components/TarotCard", () => ({
  TarotCard: ({ card }: { card: { name: string } }) =>
    React.createElement("div", { "data-testid": "tarot-card" }, card.name),
}));
vi.mock("../lib/spread-pull", () => ({
  getTodaySpread: vi.fn(),
}));

function makeCard(position: number, positionKey: string): SpreadCardResult {
  return {
    position,
    positionKey,
    userCardId: position,
    cardId: position % CARDS.length,
    card: CARDS[position % CARDS.length],
    rarityScore: 3 as Rarity,
    isRadiant: false,
    isReversed: false,
  };
}

function stubRoute(spreadTypeId: string, spreadDate: string) {
  const spread = SPREAD_REGISTRY[spreadTypeId];
  const cards: SpreadCardResult[] = spread.positions.map((p) =>
    makeCard(p.index, p.label.toLowerCase())
  );
  const Stub = createRoutesStub([
    {
      path: "/spread/:type/:date",
      Component: SpreadDateRoute,
      loader: () => ({
        user: { id: "u1", username: "testuser" },
        name: spread.name,
        subtitle: spread.subtitle,
        positions: spread.positions,
        cards,
        spreadDate,
        formattedDate: "Monday, June 15, 2026",
        isToday: true,
        origin: "",
      }),
    },
  ]);
  return render(<Stub initialEntries={[`/spread/${spreadTypeId}/${spreadDate}`]} />);
}

describe("spread.$type.$date — new-moon", () => {
  it("renders the spread name", async () => {
    stubRoute("new-moon", "2026-06-15");
    expect(await screen.findByText("Seeds of Intention")).toBeInTheDocument();
  });

  it("renders all 5 position labels", async () => {
    stubRoute("new-moon", "2026-06-15");
    await screen.findByText("Seeds of Intention");
    for (const pos of SPREAD_REGISTRY["new-moon"].positions) {
      expect(screen.getByText(pos.label)).toBeInTheDocument();
    }
  });

  it("renders 5 cards", async () => {
    stubRoute("new-moon", "2026-06-15");
    await screen.findByText("Seeds of Intention");
    expect(screen.getAllByTestId("tarot-card")).toHaveLength(5);
  });
});

describe("spread.$type.$date — full-moon", () => {
  it("renders the spread name", async () => {
    stubRoute("full-moon", "2026-06-30");
    expect(await screen.findByText("Illumination & Release")).toBeInTheDocument();
  });

  it("renders all 6 position labels", async () => {
    stubRoute("full-moon", "2026-06-30");
    await screen.findByText("Illumination & Release");
    for (const pos of SPREAD_REGISTRY["full-moon"].positions) {
      expect(screen.getByText(pos.label)).toBeInTheDocument();
    }
  });

  it("renders 6 cards", async () => {
    stubRoute("full-moon", "2026-06-30");
    await screen.findByText("Illumination & Release");
    expect(screen.getAllByTestId("tarot-card")).toHaveLength(6);
  });
});

describe("spread.$type.$date — sunday-weekly", () => {
  it("renders the spread name", async () => {
    stubRoute("sunday-weekly", "2026-06-14");
    expect(await screen.findByText("Mind · Body · Spirit · Action")).toBeInTheDocument();
  });

  it("renders all 4 position labels", async () => {
    stubRoute("sunday-weekly", "2026-06-14");
    await screen.findByText("Mind · Body · Spirit · Action");
    for (const pos of SPREAD_REGISTRY["sunday-weekly"].positions) {
      expect(screen.getByText(pos.label)).toBeInTheDocument();
    }
  });
});
