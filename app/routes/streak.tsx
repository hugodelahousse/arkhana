import { redirect } from "react-router";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  getLunarMonthsInfo,
  type LunarMonthDetail,
} from "../lib/moonphase";
import { todayForUser } from "../lib/utils";
import { DateTime } from "luxon";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_BACK = 6;

function formatMonthRange(month: LunarMonthDetail): string {
  const start = DateTime.fromISO(month.startDate, { zone: "utc" });
  const end = DateTime.fromISO(month.endDate, { zone: "utc" });

  if (start.hasSame(end, "month")) {
    return `${start.toFormat("MMM d")}–${end.toFormat("d, yyyy")}`;
  }
  if (start.hasSame(end, "year")) {
    return `${start.toFormat("MMM d")} – ${end.toFormat("MMM d, yyyy")}`;
  }
  return `${start.toFormat("MMM d, yyyy")} – ${end.toFormat("MMM d, yyyy")}`;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");

  const userId = context.user.id;
  const today = todayForUser(context.user.timezone);
  const todayDt = DateTime.fromISO(today, { zone: "utc" }).set({ hour: 12 });

  const [streakState, pullDates] = await Promise.all([
    getStreak(userId),
    getPullDates(userId),
  ]);
  const currentStreak = streakState?.currentStreak ?? 0;
  const lunarMonths = getLunarMonthsInfo(todayDt, pullDates, MONTHS_BACK, currentStreak);

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
    lunarMonths,
    today,
  };
}

export function meta() {
  return [{ title: "Moon Cycle — Arkhana" }];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StreakPage({ loaderData }: Route.ComponentProps) {
  const { user, streakState, pullDates, lunarMonths } = loaderData;
  const navigate = useNavigate();

  const { currentStreak, longestStreak, graceNightsUsed } = streakState;
  const graceRemaining = 2 - graceNightsUsed;
  const totalPulls = pullDates.length;

  const currentMonth = lunarMonths[lunarMonths.length - 1];
  const todayLunarIndex = currentMonth?.todayLunarIndex ?? 0;

  const [activeIndex, setActiveIndex] = useState(lunarMonths.length - 1);
  const activeMonth = lunarMonths[activeIndex];
  const isCurrentMonth = activeIndex === lunarMonths.length - 1;

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

          {/* Lunar ring carousel */}
          <div className="space-y-5">
            <MoonCycleCarousel
              months={lunarMonths}
              currentStreak={currentStreak}
              onActiveChange={setActiveIndex}
            />

            <div className="text-center space-y-2">
              {/* Dot indicators */}
              <div className="flex gap-1.5 justify-center">
                {lunarMonths.map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: i === activeIndex ? "var(--accent)" : "var(--muted-foreground)",
                      opacity: i === activeIndex ? 1 : 0.2,
                      transform: i === activeIndex ? "scale(1.3)" : "scale(1)",
                    }}
                  />
                ))}
              </div>

              {/* Month info */}
              {activeMonth && (
                <div className="space-y-1">
                  <p className="type-caption font-serif">
                    {formatMonthRange(activeMonth)}
                  </p>
                  {isCurrentMonth && currentStreak > 0 ? (
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
                  ) : isCurrentMonth ? (
                    <p className="type-body-serif">
                      Pull your first card to begin
                    </p>
                  ) : (
                    <p className="type-body-serif">
                      {activeMonth.pulledDayIndices.length} of {activeMonth.lunarMonthLength} days practiced
                    </p>
                  )}
                </div>
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

// ─── Carousel ─────────────────────────────────────────────────────────────────

function MoonCycleCarousel({
  months,
  currentStreak,
  onActiveChange,
}: {
  months: LunarMonthDetail[];
  currentStreak: number;
  onActiveChange: (index: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reversed array so that with dir="rtl", the visual order is
  // [oldest → current] left to right, and scrollLeft=0 shows the
  // right edge (current month). No JS scroll positioning needed.
  const carousel = useMemo(() => [...months].reverse(), [months]);

  const detectActive = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const center = box.left + box.width / 2;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const child = (el.children[i] as HTMLElement).getBoundingClientRect();
      const dist = Math.abs(center - (child.left + child.width / 2));
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    onActiveChange(months.length - 1 - closest);
  }, [months.length, onActiveChange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;
    function onScroll() {
      clearTimeout(timer);
      timer = setTimeout(detectActive, 80);
    }

    el.addEventListener("scrollend", detectActive);
    el.addEventListener("scroll", onScroll);
    return () => {
      el.removeEventListener("scrollend", detectActive);
      el.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, [detectActive]);

  return (
    <div
      ref={scrollRef}
      dir="rtl"
      className="flex overflow-x-auto snap-x snap-mandatory"
      style={{ scrollbarWidth: "none" }}
    >
      {carousel.map((month, ci) => {
        const isCurrentMonth = ci === 0;
        const pulledCount = month.pulledDayIndices.length;
        return (
          <div
            key={month.newMoonDate}
            dir="ltr"
            className="snap-center shrink-0 w-full flex justify-center"
          >
            <MoonCycle
              currentStreak={isCurrentMonth ? currentStreak : pulledCount}
              todayLunarIndex={month.todayLunarIndex}
              lunarMonthLength={month.lunarMonthLength}
              pulledDayIndices={month.pulledDayIndices}
              graceDayIndices={month.graceDayIndices}
              streakDayIndices={month.streakDayIndices}
              size="lg"
            />
          </div>
        );
      })}
    </div>
  );
}
