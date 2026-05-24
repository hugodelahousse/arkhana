import { redirect, useFetcher } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { startTransition } from "react";
import { addTransitionType } from "react";
import type { Route } from "./+types/home";
import { Link, useNavigate } from "react-router";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { getTodayPull, getRecentPulls, getUniqueCardCount, dailyPull } from "../lib/pull";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription, cardSlug, type Rarity } from "../lib/cards";
import { useAutoReveal } from "../lib/useAutoReveal";
import { todayUTC } from "../lib/utils";
import { config } from "../../config/index.js";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { ShareButton } from "../components/ShareButton";

export async function loader({ context, request }: Route.LoaderArgs) {
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
      origin: new URL(request.url).origin,
    };
  }

  const userId = context.user.id;
  const todayStr = todayUTC();
  const [todayPull, recentPulls, totalUnique] = await Promise.all([
    getTodayPull(userId, todayStr),
    getRecentPulls(userId, 5),
    getUniqueCardCount(userId),
  ]);

  const requestOrigin = new URL(request.url).origin;
  return { user: context.user, todayPull, recentPulls, totalUnique, origin: requestOrigin };
}

export async function action({ context }: Route.ActionArgs) {
  if (!context.user) return redirect("/");
  const result = await dailyPull(context.user.id);
  return result;
}

export function meta({ data }: Route.MetaArgs) {
  const origin = data?.origin ?? "";
  return [
    { title: "Arkhana" },
    { name: "description", content: "Daily Tarot · One card. Every day. Uncover your archive." },
    { property: "og:title", content: "Arkhana" },
    { property: "og:description", content: "Daily Tarot · One card. Every day. Uncover your archive." },
    { property: "og:image", content: `${origin}/api/og.png?type=app` },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Arkhana" },
    { name: "twitter:description", content: "Daily Tarot · One card. Every day." },
    { name: "twitter:image", content: `${origin}/api/og.png?type=app` },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
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

  function navigateToCard(slug: string) {
    startTransition(() => {
      addTransitionType("nav-forward");
      navigate(`/collection/${slug}`);
    });
  }

  return (
    <DirectionalTransition>
      <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
        <Nav userName={user.name} isAnonymous={user.isAnonymous} />
        <main className="max-w-2xl mx-auto px-6 py-12 space-y-12">

          <section className="space-y-6 text-center">
            <h2
              className="text-sm sm:text-xs tracking-widest uppercase opacity-50"
              style={{ color: "var(--color-text-primary)" }}
            >
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
                        className="text-xs tracking-widest uppercase"
                        style={{ color: `var(--color-rarity-${rarityLabel})` }}
                        aria-label={[RARITY_LABELS[result.rarityScore], result.isRadiant ? "Radiant" : null, result.isReversed ? "Reversed" : null].filter(Boolean).join(", ")}
                      >
                        <span aria-hidden="true">
                          {RARITY_LABELS[result.rarityScore]}
                          {result.isRadiant && " ✦"}
                          {result.isReversed && " · Reversed"}
                        </span>
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
                      <div className="flex items-center justify-center gap-6 pt-2">
                        <a
                          href={`/collection/${cardSlug(result.card)}`}
                          onClick={(e) => { e.preventDefault(); navigateToCard(cardSlug(result.card)); }}
                          className="text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          Card history →
                        </a>
                        <ShareButton
                          title={`${result.card.name} — Arkhana`}
                          url={`/share/${result.pullId}`}
                          text={`I drew ${result.card.name} (${RARITY_LABELS[result.rarityScore]}) on Arkhana.`}
                          label="Share pull"
                        />
                      </div>
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
                    className="text-xs tracking-widest uppercase"
                    style={{ color: `var(--color-rarity-${RARITY_LABELS[todayPull.rarityScore]?.toLowerCase()})` }}
                    aria-label={[RARITY_LABELS[todayPull.rarityScore], todayPull.isRadiant ? "Radiant" : null, todayPull.isReversed ? "Reversed" : null].filter(Boolean).join(", ")}
                  >
                    <span aria-hidden="true">
                      {RARITY_LABELS[todayPull.rarityScore]}
                      {todayPull.isRadiant && " ✦"}
                      {todayPull.isReversed && " · Reversed"}
                    </span>
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
                  <ShareButton
                    title={`${todayCard.name} — Arkhana`}
                    url={`/share/${todayPull.id}`}
                    text={`I drew ${todayCard.name} (${RARITY_LABELS[todayPull.rarityScore]}) on Arkhana.`}
                    label="Share pull"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <p
                  className="text-lg opacity-60"
                  style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                >
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

          {!result && (
            <section
              className="flex justify-center gap-12 py-6 border-t border-b"
              style={{ borderColor: "var(--color-bg-elevated)" }}
            >
              <div className="text-center">
                <p className="whitespace-nowrap" style={{ fontFamily: "var(--font-serif)" }}>
                  <span className="text-2xl" style={{ color: "var(--color-text-muted)" }}>{totalUnique}</span>
                  <span className="text-base opacity-50" style={{ color: "var(--color-text-muted)" }}>/78</span>
                  <span className="text-xs tracking-widest uppercase opacity-40 ml-2" style={{ color: "var(--color-text-primary)" }}>discovered</span>
                </p>
              </div>
            </section>
          )}

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
                  const slug = cardSlug(CARD_BY_ID[pull.cardId]);
                  return (
                    <a
                      key={pull.id}
                      href={`/collection/${slug}`}
                      onClick={(e) => { e.preventDefault(); navigateToCard(slug); }}
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
                        aria-label={[RARITY_LABELS[pull.rarityScore], pull.isRadiant ? "Radiant" : null].filter(Boolean).join(", ")}
                      >
                        <span aria-hidden="true">
                          {RARITY_LABELS[pull.rarityScore]}
                          {pull.isRadiant && " ✦"}
                        </span>
                      </span>
                    </a>
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
    </DirectionalTransition>
  );
}
