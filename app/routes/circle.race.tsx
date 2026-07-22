import { Link, redirect } from "react-router";
import { ArrowRight, UsersThree } from "@phosphor-icons/react";
import type { Route } from "./+types/circle.race";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { RaceChart, raceRunnerColor } from "../components/RaceChart";
import { getCircleRace } from "../lib/race";
import type { RaceRunner } from "../lib/race";

export async function loader({ context }: Route.LoaderArgs) {
  const viewer = context.user;
  if (!viewer) return redirect("/");

  if (viewer.isAnonymous) {
    return { state: "anon" as const };
  }

  const race = await getCircleRace(viewer.id);
  return { state: "ready" as const, race };
}

export function meta() {
  return [
    { title: "The Race — Arkhana" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

export default function CircleRace({ loaderData }: Route.ComponentProps) {
  if (loaderData.state === "anon") {
    return (
      <DirectionalTransition>
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md text-center space-y-6">
            <UsersThree weight="light" size={48} className="mx-auto opacity-50" aria-hidden />
            <h1 className="text-3xl font-light text-primary font-serif">The race awaits</h1>
            <p className="type-body-serif text-muted-foreground">
              Create an account to follow other readers and watch your collections
              grow side by side.
            </p>
            <Link
              to="/auth/signup"
              className="inline-flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase border border-primary text-primary transition-opacity hover:opacity-80"
            >
              Sign up <ArrowRight weight="light" size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </DirectionalTransition>
    );
  }

  const { race } = loaderData;
  const anyPulls = race.runners.some((r) => r.pulls.length > 0);
  const alone = race.runners.length <= 1;

  // Colors must mirror RaceChart's assignment: viewer in ink, then slots in
  // the runners' (alphabetical) order.
  const colorById = new Map<string, string>();
  {
    let slot = 0;
    for (const r of race.runners) {
      colorById.set(r.id, raceRunnerColor(r, r.isViewer ? -1 : slot++));
    }
  }

  const standings = [...race.runners].sort(
    (a, b) => b.total - a.total || b.pullDays - a.pullDays || a.handle.localeCompare(b.handle)
  );

  return (
    <DirectionalTransition>
      <div className="min-h-screen">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
          <div className="text-center space-y-3">
            <p className="type-label">Your Circle</p>
            <h1 className="type-page-title text-3xl">The Race</h1>
            <p className="type-body-serif text-muted-foreground max-w-md mx-auto">
              Seventy-eight cards. Every reader walks their own road — this is how
              far each of you has come.
            </p>
          </div>

          {!anyPulls ? (
            <div className="text-center py-12 space-y-6 border border-border bg-card max-w-xl mx-auto">
              <p className="type-body-serif">The race begins with a single card.</p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase border border-primary text-primary transition-opacity hover:opacity-80"
              >
                Draw today's card <ArrowRight weight="light" size={14} aria-hidden />
              </Link>
            </div>
          ) : (
            <>
              <section className="relative border border-border bg-card text-card-foreground p-4 sm:p-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 90% 55% at 50% 0%, color-mix(in srgb, var(--accent) 7%, transparent), transparent)",
                  }}
                />
                <RaceChart race={race} />
                <p className="type-ghost mt-4">
                  Dots mark rarity of each day's pull · ◆ weekly spread · grey dots are
                  missed days · radiant pulls shimmer
                </p>
              </section>

              <section className="max-w-3xl mx-auto space-y-4">
                <h2 className="type-label text-center">The Standings</h2>
                <div className="border border-border bg-card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-border">
                        <th scope="col" className="px-4 py-3 type-ghost font-normal w-10">#</th>
                        <th scope="col" className="px-4 py-3 type-ghost font-normal">Reader</th>
                        <th scope="col" className="px-4 py-3 type-ghost font-normal">Collected</th>
                        <th scope="col" className="px-4 py-3 type-ghost font-normal hidden sm:table-cell">Pull days</th>
                        <th scope="col" className="px-4 py-3 type-ghost font-normal hidden sm:table-cell">Days on road</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((runner, idx) => (
                        <StandingRow
                          key={runner.id}
                          rank={ROMAN[idx] ?? String(idx + 1)}
                          runner={runner}
                          color={colorById.get(runner.id) ?? "var(--ghost-foreground)"}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {alone && (
                <div className="text-center py-10 space-y-5 border border-border bg-card max-w-xl mx-auto">
                  <UsersThree weight="light" size={36} className="mx-auto opacity-50" aria-hidden />
                  <p className="type-body-serif">
                    A race of one is just a walk. Follow other readers to see their
                    roads beside yours.
                  </p>
                  <Link
                    to="/circle/people"
                    className="inline-flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase border border-primary text-primary transition-opacity hover:opacity-80"
                  >
                    Find readers <ArrowRight weight="light" size={14} aria-hidden />
                  </Link>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </DirectionalTransition>
  );
}

function StandingRow({
  rank,
  runner,
  color,
}: {
  rank: string;
  runner: RaceRunner;
  color: string;
}) {
  const daysOnRoad = runner.startIndex >= 0 ? runner.endIndex - runner.startIndex + 1 : 0;
  const name = runner.isViewer ? "You" : `@${runner.handle}`;
  return (
    <tr
      className="border-b border-border last:border-b-0"
      style={runner.isViewer ? { background: "color-mix(in srgb, var(--muted) 45%, transparent)" } : undefined}
    >
      <td className="px-4 py-3 font-serif text-muted-foreground">{rank}</td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="inline-block w-3.5 h-0.5" style={{ background: color }} />
          {runner.username && !runner.isViewer ? (
            <Link
              to={`/u/${runner.username}`}
              className="text-foreground hover:text-primary transition-colors"
            >
              {name}
            </Link>
          ) : (
            <span className="text-foreground">{name}</span>
          )}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-3">
          <span className="tabular-nums text-foreground font-medium whitespace-nowrap">
            {runner.total}
            <span className="text-ghost-foreground font-normal"> / 78</span>
          </span>
          <span
            aria-hidden
            className="hidden md:inline-block h-1 w-24 shrink-0"
            style={{ background: "color-mix(in srgb, var(--border) 55%, transparent)" }}
          >
            <span
              className="block h-full"
              style={{ width: `${Math.round((runner.total / 78) * 100)}%`, background: color }}
            />
          </span>
        </span>
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground hidden sm:table-cell">
        {runner.pullDays || "—"}
      </td>
      <td className="px-4 py-3 tabular-nums text-muted-foreground hidden sm:table-cell">
        {daysOnRoad || "—"}
      </td>
    </tr>
  );
}
