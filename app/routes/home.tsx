import { redirect, useFetcher } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { getTodayPull, getRecentPulls, getUniqueCardCount, dailyPull } from "../lib/pull";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription, cardSlug, type Rarity } from "../lib/cards";
import { useAutoReveal } from "../lib/useAutoReveal";
import { todayUTC } from "../lib/utils";
import { config } from "../../config/index.js";

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) {
    const origin = new URL(config.betterAuthUrl).origin;
    const anonRes = await fetch(
      new URL("/api/auth/sign-in/anonymous", config.betterAuthUrl).toString(),
      { method: "POST", headers: { "content-type": "application/json", origin } }
    );
    if (anonRes.ok) {
      const setCookie = anonRes.headers.get("set-cookie");
      if (setCookie) throw redirect("/", { headers: { "set-cookie": setCookie } });
    }
    // Fallback: anonymous sign-in failed (e.g. DB unavailable)
    return {
      user: null as null,
      todayPull: null as Awaited<ReturnType<typeof getTodayPull>> | null,
      recentPulls: [] as Awaited<ReturnType<typeof getRecentPulls>>,
      totalUnique: 0,
    };
  }

  const userId = context.user.id;
  const todayStr = todayUTC();
  const [todayPull, recentPulls, totalUnique] = await Promise.all([
    getTodayPull(userId, todayStr),
    getRecentPulls(userId, 5),
    getUniqueCardCount(userId),
  ]);

  return { user: context.user, todayPull, recentPulls, totalUnique };
}

export async function action({ context }: Route.ActionArgs) {
  if (!context.user) return redirect("/");
  const result = await dailyPull(context.user.id);
  return result;
}

export function meta() {
  return [{ title: "Arkhana" }];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const isPulling = fetcher.state === "submitting";
  const result = fetcher.data && "card" in fetcher.data ? fetcher.data : null;
  const rarityLabel = result ? RARITY_LABELS[result.rarityScore]?.toLowerCase() : null;
  const [revealed, revealNow] = useAutoReveal(!!result, 600);

  if (!loaderData.user) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <p className="text-sm opacity-40 tracking-widest uppercase">The archive stirs…</p>
      </div>
    );
  }

  const { user, todayPull, recentPulls, totalUnique } = loaderData;

  const todayCard = todayPull ? CARD_BY_ID[todayPull.cardId] : null;

  return (
    <div className="min-h-screen bg-base">
      <Nav userName={user.name} isAnonymous={user.isAnonymous} />
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-12">

        <section className="space-y-6 text-center">
          <h2 className="text-sm sm:text-xs tracking-widest uppercase opacity-50">
            Today
          </h2>

          {result ? (
            <div className="space-y-10">
              <div className="flex justify-center pb-4">
                <TarotCard
                  card={result.card}
                  rarityScore={result.rarityScore as Rarity}
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
                      className={`text-xs tracking-widest uppercase text-rarity-${rarityLabel}`}
                    >
                      {RARITY_LABELS[result.rarityScore]}
                      {result.isRadiant && " ✦"}
                      {result.isReversed && " · Reversed"}
                    </p>
                    <h2 className="text-3xl font-light tracking-wide">
                      {result.card.name}
                    </h2>
                    <div
                      className={`w-8 h-px mx-auto opacity-50 bg-rarity-${rarityLabel}`}
                    />
                    <p className="text-sm leading-relaxed max-w-xs mx-auto opacity-85">
                      {getCardDescription(result.card, result.rarityScore, result.isReversed)}
                    </p>
                    <Link
                      to={`/collection/${cardSlug(result.card)}`}
                      className="block text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity pt-2"
                    >
                      Card history →
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : todayPull && todayCard ? (
            <div className="space-y-6">
              <div className="flex justify-center">
                <TarotCard
                  card={todayCard}
                  rarityScore={todayPull.rarityScore as Rarity}
                  isReversed={todayPull.isReversed}
                  isRadiant={todayPull.isRadiant}
                  revealed={true}
                  size="lg"
                />
              </div>
              <div className="space-y-2">
                <p
                  className={`text-xs tracking-widest uppercase text-rarity-${RARITY_LABELS[todayPull.rarityScore]?.toLowerCase()}`}
                >
                  {RARITY_LABELS[todayPull.rarityScore]}
                  {todayPull.isRadiant && " ✦"}
                  {todayPull.isReversed && " · Reversed"}
                </p>
                <p className="text-xl font-light">
                  {todayCard.name}
                </p>
                <p className="text-sm leading-relaxed max-w-xs mx-auto opacity-70">
                  {getCardDescription(todayCard, todayPull.rarityScore, todayPull.isReversed)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-lg opacity-60">
                {isPulling ? "The fates are turning…" : "The cards await your question."}
              </p>
              <div className={`flex justify-center ${isPulling ? "animate-pulse pointer-events-none" : ""}`}>
                <TarotCard
                  card={CARD_BY_ID[0]}
                  rarityScore={1}
                  isReversed={false}
                  isRadiant={false}
                  revealed={false}
                  onReveal={() => fetcher.submit({ _action: "pull" }, { method: "post" })}
                  size="lg"
                  showHint={!isPulling}
                />
              </div>
            </div>
          )}
        </section>

        {user.isAnonymous && !result && (
          <section className="border border-border/50 px-6 py-5 space-y-4 text-center">
            <div className="space-y-1">
              <p className="text-xs tracking-widest uppercase opacity-40">Your reading is ephemeral</p>
              <p className="text-sm opacity-60">Sign up to preserve your collection &amp; streak</p>
            </div>
            <div className="flex items-center justify-center gap-6">
              <Link
                to="/auth/signup"
                className="px-5 py-2 text-xs tracking-widest uppercase border border-border hover:opacity-90 transition-opacity"
              >
                Create account
              </Link>
              <Link
                to="/auth/signin"
                className="text-xs tracking-widest uppercase opacity-50 hover:opacity-90 transition-opacity"
              >
                Sign in
              </Link>
            </div>
          </section>
        )}

        {!result && (
          <section className="flex justify-center gap-12 py-6 border-t border-b border-elevated">
            <div className="text-center space-y-1">
              <p className="text-2xl text-muted">
                {totalUnique}
              </p>
              <p className="text-xs tracking-widest uppercase opacity-40">
                of 78 discovered
              </p>
            </div>
          </section>
        )}

        {!result && recentPulls.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs tracking-widest uppercase opacity-50">
              Recent
            </h2>
            <div className="space-y-2">
              {recentPulls.map((pull) => {
                const card = CARD_BY_ID[pull.cardId];
                return (
                  <Link
                    key={pull.id}
                    to={`/collection/${cardSlug(CARD_BY_ID[pull.cardId])}`}
                    className="flex items-center justify-between py-3 border-b border-elevated opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <span>
                      {card?.name ?? "Unknown"}
                      {pull.isReversed && (
                        <span className="ml-2 text-xs opacity-50">(reversed)</span>
                      )}
                    </span>
                    <span
                      className={`text-xs tracking-widest text-rarity-${RARITY_LABELS[pull.rarityScore]?.toLowerCase()}`}
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
            >
              View all →
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
