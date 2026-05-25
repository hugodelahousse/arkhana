import { redirect } from "react-router";
import { startTransition } from "react";
import { addTransitionType } from "react";
import type { Route } from "./+types/streak";
import { Link, useNavigate } from "react-router";
import { Moon, MoonStars, Sparkle } from "@phosphor-icons/react";
import { Nav } from "../components/layout/nav";
import { MoonCycle } from "../components/MoonCycle";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { getStreak } from "../lib/streak";
import { getDailyPullHistory } from "../lib/pull";
import { getCurrentMoonPhase } from "../lib/moonphase";
import { todayUTC } from "../lib/utils";
import { DateTime } from "luxon";

const CYCLES_TO_SHOW = 6;
const CYCLE_DAYS = 28;

interface DayCell {
  date: string;
  pulled: boolean;
  isToday: boolean;
  isFuture: boolean;
  moonEmoji: string | null; // only at key lunar moments
}

interface CycleRow {
  cycleNumber: number;
  startDate: string;
  days: DayCell[];
}

function buildCalendar(
  cycleStartDate: string,
  currentStreak: number,
  pullDateSet: Set<string>,
  today: string
): CycleRow[] {
  const cycles: CycleRow[] = [];
  const anchor = DateTime.fromISO(cycleStartDate, { zone: "utc" });

  for (let c = 0; c < CYCLES_TO_SHOW; c++) {
    const cycleStart = anchor.minus({ days: c * CYCLE_DAYS });
    const cycleNumber = Math.ceil(currentStreak / CYCLE_DAYS) - c;
    const days: DayCell[] = [];

    for (let d = 0; d < CYCLE_DAYS; d++) {
      const dt = cycleStart.plus({ days: d });
      const date = dt.toISODate()!;
      const jsDate = dt.toJSDate();

      const { phase } = getCurrentMoonPhase(jsDate);
      let moonEmoji: string | null = null;
      if (phase === "New Moon") moonEmoji = "🌑";
      else if (phase === "Full Moon") moonEmoji = "🌕";

      days.push({
        date,
        pulled: pullDateSet.has(date),
        isToday: date === today,
        isFuture: date > today,
        moonEmoji,
      });
    }

    if (cycleNumber > 0) {
      cycles.push({ cycleNumber, startDate: cycleStart.toISODate()!, days });
    }
  }

  return cycles;
}

function formatCycleLabel(startDate: string): string {
  const start = DateTime.fromISO(startDate, { zone: "utc" });
  const end = start.plus({ days: CYCLE_DAYS - 1 });
  if (start.month === end.month) {
    return `${start.toFormat("MMM d")}–${end.toFormat("d, yyyy")}`;
  }
  return `${start.toFormat("MMM d")} – ${end.toFormat("MMM d, yyyy")}`;
}

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");

  const userId = context.user.id;
  const today = todayUTC();

  const [streakState, pullHistory] = await Promise.all([
    getStreak(userId),
    getDailyPullHistory(userId),
  ]);

  const pullDates = pullHistory.map((p) => p.pullDate);

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
    today,
  };
}

export function meta() {
  return [{ title: "Moon Cycle — Arkhana" }];
}

export default function StreakPage({ loaderData }: Route.ComponentProps) {
  const { user, streakState, pullDates, today } = loaderData;
  const navigate = useNavigate();

  const { currentStreak, longestStreak, graceNightsUsed, cycleStartDate } = streakState;
  const cyclePos = currentStreak === 0 ? 0 : ((currentStreak - 1) % 28) + 1;
  const graceRemaining = 2 - graceNightsUsed;

  const pullDateSet = new Set(pullDates);

  // Determine anchor: use cycleStartDate if it exists, otherwise today
  const anchor = cycleStartDate ?? today;
  const calendarCycles = currentStreak > 0 ? buildCalendar(anchor, currentStreak, pullDateSet, today) : [];

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
            <p className="text-xs tracking-widest uppercase opacity-30 text-secondary">
              Practice
            </p>
            <h1 className="text-3xl font-light tracking-wide text-primary font-serif">
              Moon Cycle
            </h1>
          </div>

          {/* Big wheel */}
          <div className="flex flex-col items-center gap-6">
            <MoonCycle currentStreak={currentStreak} size="lg" />

            <div className="text-center space-y-1">
              {currentStreak > 0 ? (
                <>
                  <p className="text-sm opacity-60 text-secondary font-serif">
                    Day {cyclePos} of 28
                    {cyclePos === 28 ? " · Cycle complete" : ""}
                  </p>
                  {graceRemaining > 0 && (
                    <p className="text-xs opacity-25 text-secondary">
                      {graceRemaining === 2 ? "Two grace nights remain" : "One grace night remains"} this cycle
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm opacity-40 text-secondary font-serif">
                  Pull your first card to begin
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-px bg-elevated rounded-sm overflow-hidden">
            {[
              { label: "Current", value: currentStreak },
              { label: "Longest", value: longestStreak },
              { label: "Total pulls", value: totalPulls },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface px-4 py-5 text-center space-y-1">
                <p
                  className="text-2xl font-light font-serif"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {value}
                </p>
                <p className="text-xs tracking-widest uppercase opacity-30 text-secondary">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Milestones */}
          {longestStreak > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs tracking-widest uppercase opacity-30 text-secondary">
                Milestones
              </h2>
              <div className="flex gap-3">
                {([
                  { days: 7,   Icon: Moon,       label: "Seven days" },
                  { days: 28,  Icon: MoonStars,  label: "Full cycle" },
                  { days: 100, Icon: Sparkle,    label: "Hundred days" },
                ] as const).map(({ days, Icon, label }) => {
                  const reached = longestStreak >= days;
                  return (
                    <div
                      key={days}
                      className="flex flex-col items-center gap-2.5 flex-1 py-5 border rounded-sm transition-opacity"
                      style={{
                        borderColor: reached
                          ? "var(--color-rarity-mystic)"
                          : "var(--color-border-default)",
                        opacity: reached ? 1 : 0.3,
                        color: reached ? "var(--color-rarity-mystic)" : "var(--color-text-secondary)",
                      }}
                    >
                      <Icon weight="thin" size={22} aria-hidden />
                      <p className="text-xs font-light font-serif text-secondary opacity-70">
                        {days}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Calendar grid */}
          {calendarCycles.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xs tracking-widest uppercase opacity-30 text-secondary">
                Practice history
              </h2>
              <div className="space-y-5">
                {calendarCycles.map((cycle) => (
                  <CycleRow key={cycle.cycleNumber} cycle={cycle} today={today} />
                ))}
              </div>
            </section>
          )}

          {currentStreak === 0 && (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm opacity-40 text-secondary font-serif">
                Your lunar practice hasn't begun yet.
              </p>
              <Link
                to="/"
                onClick={(e) => { e.preventDefault(); goBack(); }}
                className="inline-flex items-center gap-2 text-xs tracking-widest uppercase opacity-50 hover:opacity-80 transition-opacity text-secondary"
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

function CycleRow({ cycle, today }: { cycle: CycleRow; today: string }) {
  const label = formatCycleLabel(cycle.startDate);
  const pulledInCycle = cycle.days.filter((d) => d.pulled).length;
  const isCurrentCycle = cycle.days.some((d) => d.isToday);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-xs opacity-30 text-secondary font-serif">{label}</p>
        <p className="text-xs opacity-20 text-secondary tabular-nums">
          {pulledInCycle}/{cycle.days.filter((d) => !d.isFuture).length}
        </p>
      </div>
      {/* 7-column grid: 4 rows of 7 days — avoids flex-wrap hanging on mobile */}
      <div className="grid grid-cols-7 gap-[3px]">
        {cycle.days.map((day) => (
          <DayDot key={day.date} day={day} isCurrentCycle={isCurrentCycle} />
        ))}
      </div>
    </div>
  );
}

function DayDot({ day, isCurrentCycle }: { day: DayCell; isCurrentCycle: boolean }) {
  let fill: string;
  let opacity: number;
  let ring = false;

  if (day.isToday) {
    fill = day.pulled ? "var(--color-rarity-mystic)" : "transparent";
    opacity = 1;
    ring = true;
  } else if (day.isFuture) {
    fill = "transparent";
    opacity = 0.12;
    ring = true;
  } else if (day.pulled) {
    fill = "var(--color-text-secondary)";
    opacity = isCurrentCycle ? 0.75 : 0.45;
  } else {
    fill = "var(--color-bg-elevated)";
    opacity = isCurrentCycle ? 0.4 : 0.2;
  }

  // Square cell, circle fills ~60% of the cell width
  return (
    <span
      title={day.date + (day.moonEmoji ? ` ${day.moonEmoji}` : "")}
      className="relative flex items-center justify-center aspect-square"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 10 10"
        aria-hidden
      >
        <circle
          cx={5}
          cy={5}
          r={ring ? 3 : 3.5}
          fill={fill}
          stroke={ring ? (day.isToday ? "var(--color-rarity-mystic)" : "var(--color-text-secondary)") : "none"}
          strokeWidth={ring ? 1 : 0}
          opacity={opacity}
        />
      </svg>
      {day.moonEmoji && (
        <span
          className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ fontSize: 7, opacity: 0.5, lineHeight: 1 }}
          aria-hidden
        >
          {day.moonEmoji}
        </span>
      )}
    </span>
  );
}
