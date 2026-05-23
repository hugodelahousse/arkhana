import { redirect, useSubmit, useNavigation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Nav } from "../components/layout/nav";
import { LandingPage } from "../components/LandingPage";
import { TarotCard } from "../components/TarotCard";
import { getTodayPull, getRecentPulls, getUniqueCardCount, dailyPull } from "../lib/pull";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription, cardSlug, type Rarity } from "../lib/cards";
import { useAutoReveal } from "../lib/useAutoReveal";
import { todayUTC } from "../lib/utils";
import { createHmac } from "node:crypto";
import { config } from "../../config/index.js";

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) {
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

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();

  if (form.get("_action") === "auth") {
    const email = String(form.get("email") || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { authError: "Please enter a valid email." };
    }

    const name = email.split("@")[0];
    // Passwordless UX: derive a per-user password via HMAC so it's not guessable.
    // Proper fix: migrate to better-auth magic links once SMTP is configured.
    const password = createHmac("sha256", config.betterAuthSecret)
      .update(email)
      .digest("hex");
    const origin = new URL(config.betterAuthUrl).origin;
    const headers = { "content-type": "application/json", origin };

    // Try sign-up first (no-ops if user already exists), then sign-in
    await fetch(
      new URL("/api/auth/sign-up/email", config.betterAuthUrl).toString(),
      { method: "POST", headers, body: JSON.stringify({ name, email, password }) }
    );

    const signInRes = await fetch(
      new URL("/api/auth/sign-in/email", config.betterAuthUrl).toString(),
      { method: "POST", headers, body: JSON.stringify({ email, password }) }
    );

    if (!signInRes.ok) {
      return { authError: "Something went wrong. Please try again." };
    }

    const setCookie = signInRes.headers.get("set-cookie");
    return redirect("/", { headers: setCookie ? { "set-cookie": setCookie } : {} });
  }

  if (!context.user) return redirect("/");
  const result = await dailyPull(context.user.id);
  return result;
}

export function meta() {
  return [{ title: "Arkhana" }];
}

export default function Home({ loaderData, actionData }: Route.ComponentProps) {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isPulling = navigation.state === "submitting" && !navigation.formData?.get("_action");
  const result = actionData && "card" in actionData ? actionData : null;
  const rarityLabel = result ? RARITY_LABELS[result.rarityScore]?.toLowerCase() : null;
  const [revealed, revealNow] = useAutoReveal(!!result, 600);

  if (!loaderData.user) {
    const authError =
      actionData && "authError" in actionData
        ? (actionData as { authError: string }).authError
        : null;
    return <LandingPage authError={authError} />;
  }

  const { user, todayPull, recentPulls, totalUnique } = loaderData;

  const todayCard = todayPull ? CARD_BY_ID[todayPull.cardId] : null;

  return (
    <div className="min-h-screen bg-base">
      <Nav userName={user.name} />
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
                  onReveal={() => submit({}, { method: "post" })}
                  size="lg"
                  showHint={!isPulling}
                />
              </div>
            </div>
          )}
        </section>

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
