import { redirect, Link } from "react-router";
import type { Route } from "./+types/dashboard";
import { Nav } from "../components/layout/nav";
import { getUserCards } from "../lib/pull";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription } from "../lib/cards";
import { todayUTC } from "../lib/utils";

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) return redirect("/auth/signin");
  const userId = context.user.id;

  const todayStr = todayUTC();
  const allPulls = await getUserCards(userId);
  const todayPull = allPulls.find((p) => p.pullDate === todayStr) ?? null;
  const recentPulls = [...allPulls].reverse().slice(0, 5);

  return {
    user: context.user,
    todayPull,
    recentPulls,
    totalUnique: new Set(allPulls.map((p) => p.cardId)).size,
  };
}

export function meta() {
  return [{ title: "Dashboard — Arkhana" }];
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user, todayPull, recentPulls, totalUnique } = loaderData;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
      <Nav userName={user.name} />
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-12">
        {/* Today's pull */}
        <section className="space-y-6 text-center">
          <h2
            className="text-xs tracking-widest uppercase opacity-50"
            style={{ color: "var(--color-text-primary)" }}
          >
            Today
          </h2>

          {todayPull ? (
            <div className="space-y-4">
              <Link to="/pull">
                <CardPreview pull={todayPull} />
              </Link>
              <p className="text-xs tracking-widest uppercase opacity-40" style={{ color: "var(--color-text-primary)" }}>
                Already drawn today
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <p
                className="text-lg opacity-60"
                style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
              >
                The cards await your question.
              </p>
              <Link
                to="/pull"
                className="inline-block py-3 px-10 border tracking-widest text-sm uppercase transition-opacity hover:opacity-90"
                style={{
                  borderColor: "var(--color-border-default)",
                  color: "var(--color-text-muted)",
                }}
              >
                Draw
              </Link>
            </div>
          )}
        </section>

        {/* Stats */}
        <section
          className="flex justify-center gap-12 py-6 border-t border-b"
          style={{ borderColor: "var(--color-bg-elevated)" }}
        >
          <div className="text-center space-y-1">
            <p className="text-2xl" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}>
              {totalUnique}
            </p>
            <p className="text-xs tracking-widest uppercase opacity-40" style={{ color: "var(--color-text-primary)" }}>
              of 78 discovered
            </p>
          </div>
        </section>

        {/* Recent pulls */}
        {recentPulls.length > 0 && (
          <section className="space-y-4">
            <h2
              className="text-xs tracking-widest uppercase opacity-50"
              style={{ color: "var(--color-text-primary)" }}
            >
              Recent
            </h2>
            <div className="space-y-2">
              {recentPulls.map((pull) => {
                const card = CARD_BY_ID[pull.cardId];
                return (
                  <Link
                    key={pull.id}
                    to={`/card/${pull.cardId}`}
                    className="flex items-center justify-between py-3 border-b opacity-70 hover:opacity-100 transition-opacity"
                    style={{ borderColor: "var(--color-bg-elevated)" }}
                  >
                    <span style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}>
                      {card?.name ?? "Unknown"}
                      {pull.isReversed && (
                        <span className="ml-2 text-xs opacity-50">(reversed)</span>
                      )}
                    </span>
                    <span
                      className="text-xs tracking-widest"
                      style={{ color: `var(--color-rarity-${RARITY_LABELS[pull.rarityScore]?.toLowerCase()})` }}
                    >
                      {RARITY_LABELS[pull.rarityScore]}
                      {pull.isRadiant && " ✦"}
                    </span>
                  </Link>
                );
              })}
            </div>
            <Link
              to="/collection"
              className="block text-center text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity pt-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              View all →
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}

function CardPreview({
  pull,
}: {
  pull: {
    cardId: number;
    rarityScore: number;
    isRadiant: boolean;
    isReversed: boolean;
  };
}) {
  const card = CARD_BY_ID[pull.cardId];
  const rarityLabel = RARITY_LABELS[pull.rarityScore]?.toLowerCase();
  const description = card
    ? getCardDescription(card, pull.rarityScore, pull.isReversed)
    : "";

  return (
    <div
      className={`mx-auto max-w-xs p-8 border space-y-4 ${pull.isRadiant ? "is-radiant" : ""}`}
      style={{
        borderColor: `var(--color-rarity-${rarityLabel})`,
        background: "var(--color-bg-surface)",
      }}
    >
      <p
        className="text-xs tracking-widest uppercase"
        style={{ color: `var(--color-rarity-${rarityLabel})` }}
      >
        {RARITY_LABELS[pull.rarityScore]}
        {pull.isRadiant && " ✦"}
        {pull.isReversed && " · Reversed"}
      </p>
      <h3
        className="text-2xl font-light"
        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
      >
        {card?.name}
      </h3>
      <p
        className="text-sm leading-relaxed opacity-80"
        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
      >
        {description}
      </p>
    </div>
  );
}
