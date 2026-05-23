import { redirect, useSubmit } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { getUserCards, dailyPull } from "../lib/pull";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription } from "../lib/cards";
import { useAutoReveal } from "../lib/useAutoReveal";
import { todayUTC } from "../lib/utils";

type UserCard = Awaited<ReturnType<typeof getUserCards>>[number];

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) {
    return {
      user: null as null,
      todayPull: null as UserCard | null,
      recentPulls: [] as UserCard[],
      totalUnique: 0,
    };
  }

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

export async function action({ context }: Route.ActionArgs) {
  if (!context.user) return redirect("/auth/signin");
  const result = await dailyPull(context.user.id);
  return result;
}

export function meta() {
  return [{ title: "Arkhana" }];
}

export default function Home({ loaderData, actionData }: Route.ComponentProps) {
  const submit = useSubmit();
  const result = actionData;
  const rarityLabel = result ? RARITY_LABELS[result.rarityScore]?.toLowerCase() : null;
  const [revealed, revealNow] = useAutoReveal(!!result, 600);

  if (!loaderData.user) {
    return <LandingPage />;
  }

  const { user, todayPull, recentPulls, totalUnique } = loaderData;

  const todayCard = todayPull ? CARD_BY_ID[todayPull.cardId] : null;

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

          {result ? (
            // Just drew — show card with flip-reveal animation
            <div className="space-y-10">
              <div className="flex justify-center" style={{ paddingBottom: "1rem" }}>
                <TarotCard
                  card={result.card}
                  rarityScore={result.rarityScore as 1 | 2 | 3 | 4 | 5}
                  isReversed={result.isReversed}
                  isRadiant={result.isRadiant}
                  revealed={revealed}
                  onReveal={revealNow}
                  size="lg"
                  showHint={!revealed}
                />
              </div>
              <AnimatePresence>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="space-y-5"
                  >
                    <p
                      className="text-xs tracking-widest uppercase"
                      style={{ color: `var(--color-rarity-${rarityLabel})` }}
                    >
                      {RARITY_LABELS[result.rarityScore]}
                      {result.isRadiant && " ✦"}
                      {result.isReversed && " · Reversed"}
                    </p>
                    <h2
                      className="text-3xl font-light tracking-wide"
                      style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                    >
                      {result.card.name}
                    </h2>
                    <div
                      className="w-8 h-px mx-auto"
                      style={{ background: `var(--color-rarity-${rarityLabel})`, opacity: 0.5 }}
                    />
                    <p
                      className="text-sm leading-relaxed max-w-xs mx-auto"
                      style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)", opacity: 0.85 }}
                    >
                      {getCardDescription(result.card, result.rarityScore, result.isReversed)}
                    </p>
                    <Link
                      to={`/card/${result.card.id}`}
                      className="block text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity pt-2"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      Card history →
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : todayPull && todayCard ? (
            // Already pulled today (page load) — show card revealed
            <div className="space-y-6">
              <div className="flex justify-center">
                <TarotCard
                  card={todayCard}
                  rarityScore={todayPull.rarityScore as 1 | 2 | 3 | 4 | 5}
                  isReversed={todayPull.isReversed}
                  isRadiant={todayPull.isRadiant}
                  revealed={true}
                  size="lg"
                />
              </div>
              <div className="space-y-2">
                <p
                  className="text-xs tracking-widest uppercase"
                  style={{ color: `var(--color-rarity-${RARITY_LABELS[todayPull.rarityScore]?.toLowerCase()})` }}
                >
                  {RARITY_LABELS[todayPull.rarityScore]}
                  {todayPull.isRadiant && " ✦"}
                  {todayPull.isReversed && " · Reversed"}
                </p>
                <p
                  className="text-xl font-light"
                  style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                >
                  {todayCard.name}
                </p>
                <p
                  className="text-sm leading-relaxed max-w-xs mx-auto opacity-70"
                  style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                >
                  {getCardDescription(todayCard, todayPull.rarityScore, todayPull.isReversed)}
                </p>
              </div>
            </div>
          ) : (
            // No pull yet — show face-down card, click to draw
            <div className="space-y-6">
              <p
                className="text-lg opacity-60"
                style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
              >
                The cards await your question.
              </p>
              <div className="flex justify-center">
                <TarotCard
                  card={CARD_BY_ID[0]}
                  rarityScore={1}
                  isReversed={false}
                  isRadiant={false}
                  revealed={false}
                  onReveal={() => submit({}, { method: "post" })}
                  size="lg"
                  showHint={true}
                />
              </div>
            </div>
          )}
        </section>

        {/* Stats */}
        {!result && (
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
        )}

        {/* Recent pulls */}
        {!result && recentPulls.length > 0 && (
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

function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-8">
        <div className="space-y-3">
          <h1
            className="text-6xl font-light tracking-widest"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}
          >
            ARKHANA
          </h1>
          <p
            className="text-lg tracking-wide"
            style={{ color: "var(--color-text-primary)", opacity: 0.7 }}
          >
            One card. Every day. A reckoning.
          </p>
        </div>

        <div
          className="w-px h-16 mx-auto"
          style={{ background: "var(--color-border-default)" }}
        />

        <div className="flex flex-col gap-4">
          <Link
            to="/auth/signup"
            className="block w-full py-3 px-6 text-center tracking-widest text-sm uppercase border transition-colors hover:opacity-90"
            style={{
              borderColor: "var(--color-border-default)",
              color: "var(--color-text-muted)",
            }}
          >
            Begin
          </Link>
          <Link
            to="/auth/signin"
            className="block w-full py-3 px-6 text-center tracking-widest text-sm uppercase opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: "var(--color-text-primary)" }}
          >
            Return
          </Link>
        </div>
      </div>
    </main>
  );
}
