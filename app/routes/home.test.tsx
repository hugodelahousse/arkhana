// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { createRoutesStub } from "react-router";
import Home from "./home";
import { SPREAD_REGISTRY } from "../lib/spreads";
import type { LunarMonthInfo } from "../lib/moonphase";

vi.mock("motion/react", () => import("../test/motionMock"));
vi.mock("../../config/index.js", () => ({
  config: {
    betterAuthUrl: "http://localhost:3000",
    nodeEnv: "test",
    vapidPublicKey: undefined,
    vapidPrivateKey: undefined,
    vapidSubject: "",
  },
}));
vi.mock("../components/DirectionalTransition", () => ({
  DirectionalTransition: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock("../components/MoonCycle", () => ({ MoonCycle: () => null }));
vi.mock("../components/StreakMilestone", () => ({ StreakMilestone: () => null }));
vi.mock("../components/Landing", () => ({ Landing: () => null }));
vi.mock("../components/JsonLd", () => ({ JsonLd: () => null }));
vi.mock("../components/TarotCard", () => ({
  TarotCard: ({ card }: { card: { name: string } }) =>
    React.createElement("div", { "data-testid": "tarot-card" }, card.name),
}));
vi.mock("../lib/spread-pull", () => ({
  getTodaySpread: vi.fn(),
  drawSpread: vi.fn(),
  getSpreadId: vi.fn(),
}));
vi.mock("../lib/pull", () => ({
  getTodayPull: vi.fn(),
  getRecentPulls: vi.fn(),
  getUniqueCardCount: vi.fn(),
  dailyPull: vi.fn(),
  getPullDates: vi.fn(),
}));
vi.mock("../lib/streak", () => ({
  getStreak: vi.fn(),
  initStreakFromHistory: vi.fn(),
  updateStreak: vi.fn(),
}));

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  username: "tester",
  timezone: "UTC",
};

const mockLunarMonthInfo: LunarMonthInfo = {
  todayLunarIndex: 0,
  lunarMonthLength: 29,
  pulledDayIndices: [],
};

function baseLoader(overrides: Record<string, unknown> = {}) {
  return {
    user: mockUser,
    todaySpreadTypeId: null as string | null,
    todaySpreadCards: null,
    todaySpreadId: null,
    spreadDef: null,
    todayPull: null,
    recentPulls: [],
    totalUnique: 0,
    todayStr: "2026-06-15",
    origin: "",
    streak: null,
    lunarMonthInfo: mockLunarMonthInfo,
    previousPullDate: null,
    ...overrides,
  };
}

function spreadLoader(spreadTypeId: string) {
  const spread = SPREAD_REGISTRY[spreadTypeId];
  return baseLoader({
    todaySpreadTypeId: spreadTypeId,
    todaySpreadCards: null, // not yet drawn — shows intro
    todaySpreadId: null,
    spreadDef: {
      name: spread.name,
      subtitle: spread.subtitle,
      description: spread.description,
      positions: spread.positions,
    },
  });
}

function renderHome(loaderData: ReturnType<typeof baseLoader>) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: Home,
      loader: () => loaderData,
    },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("Home — regular day (no spread)", () => {
  it("shows the daily draw section", async () => {
    renderHome(baseLoader());
    expect(await screen.findByText("Today")).toBeInTheDocument();
  });

  it("does not show any spread name", async () => {
    renderHome(baseLoader());
    await screen.findByText("Today");
    expect(screen.queryByText("Seeds of Intention")).not.toBeInTheDocument();
    expect(screen.queryByText("Illumination & Release")).not.toBeInTheDocument();
    expect(screen.queryByText("Mind · Body · Spirit · Action")).not.toBeInTheDocument();
  });
});

describe("Home — new moon day", () => {
  it("shows the new moon spread intro", async () => {
    renderHome(spreadLoader("new-moon"));
    expect(await screen.findByText("Seeds of Intention")).toBeInTheDocument();
  });

  it("shows the subtitle", async () => {
    renderHome(spreadLoader("new-moon"));
    await screen.findByText("Seeds of Intention");
    expect(screen.getByText("A reading for the new moon")).toBeInTheDocument();
  });

  it("shows all 5 position labels", async () => {
    renderHome(spreadLoader("new-moon"));
    await screen.findByText("Seeds of Intention");
    for (const pos of SPREAD_REGISTRY["new-moon"].positions) {
      expect(screen.getByText(pos.label)).toBeInTheDocument();
    }
  });

  it("shows Begin the reading button", async () => {
    renderHome(spreadLoader("new-moon"));
    await screen.findByText("Seeds of Intention");
    expect(screen.getByRole("button", { name: /begin the reading/i })).toBeInTheDocument();
  });

  it("does not show the daily draw section", async () => {
    renderHome(spreadLoader("new-moon"));
    await screen.findByText("Seeds of Intention");
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });
});

describe("Home — full moon day", () => {
  it("shows the full moon spread intro", async () => {
    renderHome(spreadLoader("full-moon"));
    expect(await screen.findByText("Illumination & Release")).toBeInTheDocument();
  });

  it("shows the subtitle", async () => {
    renderHome(spreadLoader("full-moon"));
    await screen.findByText("Illumination & Release");
    expect(screen.getByText("A reading for the full moon")).toBeInTheDocument();
  });

  it("shows all 6 position labels", async () => {
    renderHome(spreadLoader("full-moon"));
    await screen.findByText("Illumination & Release");
    for (const pos of SPREAD_REGISTRY["full-moon"].positions) {
      expect(screen.getByText(pos.label)).toBeInTheDocument();
    }
  });

  it("does not show the daily draw section", async () => {
    renderHome(spreadLoader("full-moon"));
    await screen.findByText("Illumination & Release");
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });
});

describe("Home — sunday weekly", () => {
  it("shows the sunday spread intro", async () => {
    renderHome(spreadLoader("sunday-weekly"));
    expect(await screen.findByText("Mind · Body · Spirit · Action")).toBeInTheDocument();
  });

  it("shows the subtitle", async () => {
    renderHome(spreadLoader("sunday-weekly"));
    await screen.findByText("Mind · Body · Spirit · Action");
    expect(screen.getByText("A reading for the week ahead")).toBeInTheDocument();
  });

  it("does not show the daily draw section", async () => {
    renderHome(spreadLoader("sunday-weekly"));
    await screen.findByText("Mind · Body · Spirit · Action");
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });
});
