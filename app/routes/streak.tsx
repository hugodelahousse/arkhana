import { redirect } from "react-router";
import { startTransition, useEffect, useRef, useState } from "react";
import { addTransitionType } from "react";
import type { Route } from "./+types/streak";
import { Link, useNavigate } from "react-router";
import { Moon, MoonStars, Sparkle } from "@phosphor-icons/react";
import { Nav } from "../components/layout/nav";
import { MoonCycle } from "../components/MoonCycle";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { getStreak } from "../lib/streak";
import { getPullDates } from "../lib/pull";
import {
  getMoonAge,
  getLunarMonthInfo,
  moonPhaseIconPath,
  moonPhaseOutlineOpacity,
  SYNODIC_MONTH_DAYS,
} from "../lib/moonphase";
import { todayUTC } from "../lib/utils";
import { DateTime } from "luxon";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LunarDay {
  date: string;
  lunarAge: number; // 0–29.5, used to render the moon phase glyph
  pulled: boolean;
  isToday: boolean;
  isFuture: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HISTORY_ROWS = 5;
const HISTORY_LOOKBACK_DAYS = 365;
const HISTORY_DAYS = Math.ceil(HISTORY_LOOKBACK_DAYS / HISTORY_ROWS) * HISTORY_ROWS;

function buildLunarHistory(
  today: string,
  pullDateSet: Set<string>,
  dayCount: number
): LunarDay[] {
  const end = DateTime.fromISO(today, { zone: "utc" });
  const start = end.minus({ days: dayCount - 1 });
  const days: LunarDay[] = [];

  for (let i = 0; i < dayCount; i++) {
    const dt = start.plus({ days: i });
    const date = dt.toISODate()!;

    days.push({
      date,
      lunarAge: getMoonAge(dt.toJSDate()),
      pulled: pullDateSet.has(date),
      isToday: date === today,
      isFuture: false,
    });
  }

  return days;
}

function formatHistoryRange(start: DateTime, end: DateTime) {
  if (start.hasSame(end, "year")) {
    return `${start.toFormat("MMM d")} – ${end.toFormat("MMM d, yyyy")}`;
  }

  return `${start.toFormat("MMM d, yyyy")} – ${end.toFormat("MMM d, yyyy")}`;
}

// ─── SVG Moon Phase Glyph ─────────────────────────────────────────────────────

function MoonGlyph({ age, active = false }: { age: number; active?: boolean }) {
  const phase = age / SYNODIC_MONTH_DAYS;
  const path = moonPhaseIconPath(phase);
  const outlineOpacity = moonPhaseOutlineOpacity(phase);
  const litFill = active ? "currentColor" : "var(--moon-phase-lit)";
  const shadowFill = active ? "var(--moon-phase-active-shadow)" : "currentColor";

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      aria-hidden
      style={{ display: "block" }}
    >
      <circle
        cx={50}
        cy={50}
        r={45}
        fill={shadowFill}
        stroke={shadowFill}
        strokeWidth={5}
        opacity="var(--moon-phase-shadow-opacity)"
      />
      {path === "full" ? (
        <circle cx={50} cy={50} r={45} fill={litFill} />
      ) : path !== "new" ? (
        <path d={path} fill={litFill} />
      ) : null}
      <circle
        cx={50}
        cy={50}
        r={45}
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        opacity={outlineOpacity}
        filter={active ? "drop-shadow(0 0 12px currentColor)" : undefined}
      />
    </svg>
  );
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");

  const userId = context.user.id;
  const today = todayUTC();
  const todayDate = new Date(today + "T12:00:00Z");

  const [streakState, pullDates] = await Promise.all([
    getStreak(userId),
    getPullDates(userId),
  ]);
  const lunarMonthInfo = getLunarMonthInfo(todayDate, pullDates);

  return {
    user: context.user,
    streakState: streakState ?? {
      currentStreak: 0,
      longestStreak: 0,
      lastPullDate: null,
      cycleStartDate: null,
      graceNightsUsed: 0,
    },
    pullDates,
    lunarMonthInfo,
    today,
  };
}

export function meta() {
  return [{ title: "Moon Cycle — Arkhana" }];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StreakPage({ loaderData }: Route.ComponentProps) {
  const { user, streakState, pullDates, lunarMonthInfo, today } = loaderData;
  const navigate = useNavigate();

  const { currentStreak, longestStreak, graceNightsUsed } = streakState;
  const { todayLunarIndex, lunarMonthLength, pulledDayIndices } = lunarMonthInfo;
  const graceRemaining = 2 - graceNightsUsed;

  const pullDateSet = new Set(pullDates);
  const historyDays = buildLunarHistory(today, pullDateSet, HISTORY_DAYS);
  const totalPulls = pullDates.length;

  function goBack() {
    startTransition(() => {
      addTransitionType("nav-back");
      navigate("/");
    });
  }

  return (
    <DirectionalTransition>
      <div className="min-h-screen">
        <Nav userName={user.name} isAnonymous={user.isAnonymous} />
        <main className="max-w-xl mx-auto px-6 py-8 sm:py-14 space-y-14">

          {/* Header */}
          <div className="text-center space-y-2">
            <p className="type-label">
              Practice
            </p>
            <h1 className="type-page-title text-3xl">
              Moon Cycle
            </h1>
          </div>

          {/* Lunar ring */}
          <div className="flex flex-col items-center gap-6">
            <MoonCycle
              currentStreak={currentStreak}
              todayLunarIndex={todayLunarIndex}
              lunarMonthLength={lunarMonthLength}
              pulledDayIndices={pulledDayIndices}
              size="lg"
            />

            <div className="text-center space-y-1">
              {currentStreak > 0 ? (
                <>
                  <p className="type-body-serif">
                    Day {todayLunarIndex + 1} of the moon · {currentStreak} day streak
                  </p>
                  {graceRemaining > 0 && (
                    <p className="text-xs text-ghost-foreground">
                      {graceRemaining === 2 ? "Two grace nights remain" : "One grace night remains"} this cycle
                    </p>
                  )}
                </>
              ) : (
                <p className="type-body-serif">
                  Pull your first card to begin
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-px bg-muted rounded-sm overflow-hidden">
            {[
              { label: "Streak", value: currentStreak },
              { label: "Longest", value: longestStreak },
              { label: "Total", value: totalPulls },
            ].map(({ label, value }) => (
              <div key={label} className="bg-card px-4 py-5 text-center space-y-1">
                <p
                  className="text-2xl font-light font-serif text-muted-foreground"
                >
                  {value}
                </p>
                <p className="type-label">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Milestones */}
          {longestStreak > 0 && (
            <section className="space-y-4">
              <h2 className="type-label">
                Milestones
              </h2>
              <div className="flex gap-3">
                {([
                  { days: 7,   Icon: Moon,      label: "Seven days" },
                  { days: 28,  Icon: MoonStars, label: "Full cycle" },
                  { days: 100, Icon: Sparkle,   label: "Hundred days" },
                ] as const).map(({ days, Icon, label: _label }) => {
                  const reached = longestStreak >= days;
                  return (
                    <div
                      key={days}
                      className="flex flex-col items-center gap-2.5 flex-1 py-5 border rounded-sm transition-colors"
                      style={{
                        borderColor: reached
                          ? "color-mix(in srgb, var(--accent) 72%, var(--border))"
                          : "color-mix(in srgb, var(--muted-foreground) 35%, var(--border))",
                        background: reached
                          ? "color-mix(in srgb, var(--accent) 9%, var(--card))"
                          : "color-mix(in srgb, var(--muted-foreground) 4%, transparent)",
                        color: reached
                          ? "var(--accent)"
                          : "var(--muted-foreground)",
                        boxShadow: reached
                          ? "0 0 20px color-mix(in srgb, var(--accent) 14%, transparent)"
                          : "inset 0 1px 0 color-mix(in srgb, var(--foreground) 5%, transparent)",
                      }}
                    >
                      <Icon
                        weight={reached ? "light" : "thin"}
                        size={24}
                        aria-hidden
                        style={{
                          opacity: reached ? 1 : 0.68,
                          filter: reached ? "drop-shadow(0 0 8px var(--accent))" : undefined,
                        }}
                      />
                      <p
                        className="text-xs font-light font-serif"
                        style={{ color: reached ? "var(--accent-text)" : "var(--faint-foreground)" }}
                      >
                        {days}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <PracticeHistory days={historyDays} />

          {currentStreak === 0 && (
            <div className="text-center py-8 space-y-4">
              <p className="type-body-serif">
                Your lunar practice hasn't begun yet.
              </p>
              <Link
                to="/"
                onClick={(e) => { e.preventDefault(); goBack(); }}
                className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-faint-foreground hover:opacity-80 transition-opacity"
              >
                Draw today's card
              </Link>
            </div>
          )}

        </main>
      </div>
    </DirectionalTransition>
  );
}

// ─── Calendar cell ────────────────────────────────────────────────────────────

function PracticeHistory({ days }: { days: LunarDay[] }) {
  const [visibleRange, setVisibleRange] = useState(() => ({
    firstDate: days[0]?.date ?? null,
    lastDate: days.at(-1)?.date ?? null,
  }));

  if (days.length === 0 || !visibleRange.firstDate || !visibleRange.lastDate) {
    return null;
  }

  const rangeStart = DateTime.fromISO(visibleRange.firstDate, { zone: "utc" });
  const rangeEnd = DateTime.fromISO(visibleRange.lastDate, { zone: "utc" });

  return (
    <section className="space-y-4">
      <h2 className="type-label">
        Practice history
      </h2>

      <div>
        <p className="type-caption font-serif truncate">
          {formatHistoryRange(rangeStart, rangeEnd)}
        </p>
      </div>

      <LunarHistoryGrid days={days} onVisibleRangeChange={setVisibleRange} />
    </section>
  );
}

function LunarHistoryGrid({
  days,
  onVisibleRangeChange,
}: {
  days: LunarDay[];
  onVisibleRangeChange: (range: { firstDate: string; lastDate: string }) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const grid = gridRef.current;
    if (!viewport || !grid) return;

    function updateVisibleRange() {
      const viewportBounds = viewport.getBoundingClientRect();
      const visibleCells = Array.from(
        grid.querySelectorAll<HTMLElement>("[data-history-date]")
      ).filter((cell) => {
        const cellBounds = cell.getBoundingClientRect();
        return cellBounds.right > viewportBounds.left && cellBounds.left < viewportBounds.right;
      });

      const firstDate = visibleCells[0]?.dataset.historyDate;
      const lastDate = visibleCells.at(-1)?.dataset.historyDate;
      if (firstDate && lastDate) {
        onVisibleRangeChange({ firstDate, lastDate });
      }
    }

    updateVisibleRange();

    const resizeObserver = new ResizeObserver(updateVisibleRange);
    resizeObserver.observe(viewport);
    resizeObserver.observe(grid);

    return () => resizeObserver.disconnect();
  }, [days, onVisibleRangeChange]);

  return (
    <div ref={viewportRef} className="flex justify-end overflow-hidden">
      <div
        ref={gridRef}
        className="w-max shrink-0"
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gridTemplateRows: `repeat(${HISTORY_ROWS}, clamp(8px, 1.9vw, 12px))`,
          gridAutoColumns: "clamp(8px, 1.9vw, 12px)",
          gap: "clamp(3px, 0.65vw, 4px)",
        }}
      >
        {days.map((day) => (
          <LunarDayCell key={day.date} day={day} />
        ))}
      </div>
    </div>
  );
}

function LunarDayCell({ day }: { day: LunarDay }) {
  const isToday = day.isToday;
  const isFuture = day.isFuture;

  let color: string;
  let opacity: number;

  if (isToday && day.pulled) {
    color = "var(--moon-phase-active)";
    opacity = 1;
  } else if (isToday) {
    color = "var(--muted-foreground)";
    opacity = 0.78;
  } else if (isFuture) {
    color = "var(--muted-foreground)";
    opacity = 0.16;
  } else if (day.pulled) {
    color = "var(--muted-foreground)";
    opacity = 0.9;
  } else {
    color = "var(--muted-foreground)";
    opacity = 0.28;
  }

  return (
    <div
      title={day.date}
      data-history-date={day.date}
      className="relative aspect-square"
      style={{ color, opacity }}
    >
      <div className="relative">
        <MoonGlyph age={day.lunarAge} active={isToday} />
      </div>
    </div>
  );
}
