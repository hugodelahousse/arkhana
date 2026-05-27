import { redirect } from "react-router";
import { startTransition, useState } from "react";
import { addTransitionType } from "react";
import type { Route } from "./+types/streak";
import { Link, useNavigate } from "react-router";
import { Moon, MoonStars, Sparkle, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { Nav } from "../components/layout/nav";
import { MoonCycle } from "../components/MoonCycle";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { getStreak } from "../lib/streak";
import { getPullDates } from "../lib/pull";
import {
  getMoonAge,
  getLunarMonthInfo,
  moonIlluminatedPath,
  SYNODIC_MONTH_DAYS,
  MS_PER_DAY,
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

interface LunarMonth {
  newMoonDate: string; // ISO date the new moon fell on
  days: LunarDay[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildLunarCalendar(
  today: string,
  pullDateSet: Set<string>,
  count: number
): LunarMonth[] {
  const todayDate = new Date(today + "T12:00:00Z");
  const age = getMoonAge(todayDate);
  const currentNewMoonMs = todayDate.getTime() - age * MS_PER_DAY;

  const months: LunarMonth[] = [];

  for (let i = 0; i < count; i++) {
    const newMoonMs = currentNewMoonMs - i * SYNODIC_MONTH_DAYS * MS_PER_DAY;
    const nextNewMoonMs = newMoonMs + SYNODIC_MONTH_DAYS * MS_PER_DAY;

    const nmDate = new Date(newMoonMs);
    const startDt = DateTime.utc(
      nmDate.getUTCFullYear(),
      nmDate.getUTCMonth() + 1,
      nmDate.getUTCDate()
    );

    const nnmDate = new Date(nextNewMoonMs);
    const endDt = DateTime.utc(
      nnmDate.getUTCFullYear(),
      nnmDate.getUTCMonth() + 1,
      nnmDate.getUTCDate()
    );

    const daysInMonth = Math.max(29, Math.min(30, Math.round(endDt.diff(startDt, "days").days)));
    const newMoonDateStr = startDt.toISODate()!;

    // Skip months that haven't started yet
    if (newMoonDateStr > today) continue;

    const days: LunarDay[] = [];
    for (let d = 0; d < daysInMonth; d++) {
      const dt = startDt.plus({ days: d });
      const dateStr = dt.toISODate()!;
      const lunarAge = getMoonAge(dt.toJSDate());

      days.push({
        date: dateStr,
        lunarAge,
        pulled: pullDateSet.has(dateStr),
        isToday: dateStr === today,
        isFuture: dateStr > today,
      });
    }

    months.push({ newMoonDate: newMoonDateStr, days });
  }

  return months;
}

function formatLunarMonthLabel(newMoonDate: string, days: LunarDay[]): string {
  const last = days[days.length - 1];
  const start = DateTime.fromISO(newMoonDate, { zone: "utc" });
  const end = DateTime.fromISO(last.date, { zone: "utc" });
  if (start.year === end.year && start.month === end.month) {
    return `${start.toFormat("MMM d")}–${end.toFormat("d, yyyy")}`;
  }
  if (start.year === end.year) {
    return `${start.toFormat("MMM d")} – ${end.toFormat("MMM d, yyyy")}`;
  }
  return `${start.toFormat("MMM d, yyyy")} – ${end.toFormat("MMM d, yyyy")}`;
}

// ─── SVG Moon Phase Glyph ─────────────────────────────────────────────────────

function MoonGlyph({ age }: { age: number }) {
  const path = moonIlluminatedPath(age);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* Disc outline — always present, faint */}
      <circle cx={50} cy={50} r={45} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.25} />
      {path === "new" ? null : path === "full" ? (
        <circle cx={50} cy={50} r={45} fill="currentColor" />
      ) : (
        <path d={path} fill="currentColor" />
      )}
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
  const calendarMonths = buildLunarCalendar(today, pullDateSet, 6);
  const totalPulls = pullDates.length;

  const [activeMonth, setActiveMonth] = useState(0);
  const [slideDir, setSlideDir] = useState(0);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.16 } }),
  };

  function goNewer() {
    if (activeMonth > 0) { setSlideDir(1); setActiveMonth((m) => m - 1); }
  }
  function goOlder() {
    if (activeMonth < calendarMonths.length - 1) { setSlideDir(-1); setActiveMonth((m) => m + 1); }
  }

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
            <p className="text-xs tracking-widest uppercase opacity-30 text-muted-foreground">
              Practice
            </p>
            <h1 className="text-3xl font-light tracking-wide text-primary font-serif">
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
                  <p className="text-sm opacity-60 text-muted-foreground font-serif">
                    Day {todayLunarIndex + 1} of the moon · {currentStreak} day streak
                  </p>
                  {graceRemaining > 0 && (
                    <p className="text-xs opacity-25 text-muted-foreground">
                      {graceRemaining === 2 ? "Two grace nights remain" : "One grace night remains"} this cycle
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm opacity-40 text-muted-foreground font-serif">
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
                <p className="text-xs tracking-widest uppercase opacity-30 text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Milestones */}
          {longestStreak > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs tracking-widest uppercase opacity-30 text-muted-foreground">
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
                      className="flex flex-col items-center gap-2.5 flex-1 py-5 border rounded-sm"
                      style={{
                        borderColor: reached
                          ? "var(--accent)"
                          : "var(--border)",
                        opacity: reached ? 1 : 0.3,
                        color: reached
                          ? "var(--accent)"
                          : "var(--muted-foreground)",
                      }}
                    >
                      <Icon weight="thin" size={22} aria-hidden />
                      <p className="text-xs font-light font-serif text-muted-foreground opacity-70">
                        {days}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Lunar calendar */}
          {calendarMonths.length > 0 && (() => {
            const month = calendarMonths[activeMonth];
            const pulledCount = month.days.filter((d) => !d.isFuture && d.pulled).length;
            const totalPast = month.days.filter((d) => !d.isFuture).length;
            return (
              <section className="space-y-4">
                <h2 className="text-xs tracking-widest uppercase opacity-30 text-muted-foreground">
                  Practice history
                </h2>

                {/* Navigation row */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={goOlder}
                    disabled={activeMonth >= calendarMonths.length - 1}
                    className="opacity-40 hover:opacity-80 disabled:opacity-10 transition-opacity"
                    aria-label="Previous month"
                  >
                    <CaretLeft weight="thin" size={16} />
                  </button>
                  <div className="flex-1 flex items-baseline justify-between min-w-0">
                    <p className="text-xs opacity-30 text-muted-foreground font-serif truncate">
                      {formatLunarMonthLabel(month.newMoonDate, month.days)}
                    </p>
                    <p className="text-xs opacity-20 text-muted-foreground tabular-nums ml-3 shrink-0">
                      {pulledCount}/{totalPast}
                    </p>
                  </div>
                  <button
                    onClick={goNewer}
                    disabled={activeMonth === 0}
                    className="opacity-40 hover:opacity-80 disabled:opacity-10 transition-opacity"
                    aria-label="Next month"
                  >
                    <CaretRight weight="thin" size={16} />
                  </button>
                </div>

                {/* Animated grid */}
                <div className="overflow-hidden">
                  <AnimatePresence custom={slideDir} mode="wait" initial={false}>
                    <motion.div
                      key={month.newMoonDate}
                      custom={slideDir}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${month.days.length}, 1fr)`,
                          gap: "2px",
                        }}
                      >
                        {month.days.map((day) => (
                          <LunarDayCell key={day.date} day={day} />
                        ))}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </section>
            );
          })()}

          {currentStreak === 0 && (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm opacity-40 text-muted-foreground font-serif">
                Your lunar practice hasn't begun yet.
              </p>
              <Link
                to="/"
                onClick={(e) => { e.preventDefault(); goBack(); }}
                className="inline-flex items-center gap-2 text-xs tracking-widest uppercase opacity-50 hover:opacity-80 transition-opacity text-muted-foreground"
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

function LunarDayCell({ day }: { day: LunarDay }) {
  const isToday = day.isToday;
  const isFuture = day.isFuture;

  let color: string;
  let opacity: number;
  let filter: string | undefined;

  if (isToday && day.pulled) {
    color = "var(--accent)";
    opacity = 1;
    filter = "drop-shadow(0 0 3px var(--accent))";
  } else if (isToday) {
    color = "var(--muted-foreground)";
    opacity = 0.6;
    filter = "drop-shadow(0 0 2px var(--muted-foreground))";
  } else if (isFuture) {
    color = "var(--muted-foreground)";
    opacity = 0.08;
  } else if (day.pulled) {
    color = "var(--muted-foreground)";
    opacity = 0.75;
  } else {
    color = "var(--muted-foreground)";
    opacity = 0.15;
  }

  return (
    <div
      title={day.date}
      className="aspect-square"
      style={{ color, opacity, filter }}
    >
      <MoonGlyph age={day.lunarAge} />
    </div>
  );
}
