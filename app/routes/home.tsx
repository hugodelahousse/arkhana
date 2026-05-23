import { redirect, useSubmit, Form } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import type { Route } from "./+types/home";
import { Link } from "react-router";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { getUserCards, dailyPull } from "../lib/pull";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription, cardSlug } from "../lib/cards";
import { useAutoReveal } from "../lib/useAutoReveal";
import { todayUTC } from "../lib/utils";
import { config } from "../../config/index.js";
import { cardImageUrl } from "../lib/cardImages";

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

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();

  if (form.get("_action") === "auth") {
    const email = String(form.get("email") || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { authError: "Please enter a valid email." };
    }

    const name = email.split("@")[0];
    const password = email + "|" + config.betterAuthSecret;
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
    <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
      <Nav userName={user.name} />
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-12">

        {/* Today's pull */}
        <section className="space-y-6 text-center">
          <h2
            className="text-sm sm:text-xs tracking-widest uppercase opacity-50"
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
                      to={`/collection/${cardSlug(result.card)}`}
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
                    to={`/collection/${cardSlug(CARD_BY_ID[pull.cardId])}`}
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

const SHOWCASE_CARDS = [0, 2, 9, 10, 12, 13, 15, 16, 18, 21];

function randomRarity(): 1 | 2 | 3 | 4 | 5 {
  const r = Math.random();
  if (r < 0.3) return 1;
  if (r < 0.55) return 2;
  if (r < 0.8) return 3;
  if (r < 0.93) return 4;
  return 5;
}

function LandingPage({ authError }: { authError?: string | null }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [rarity, setRarity] = useState<1 | 2 | 3 | 4 | 5>(() => randomRarity());
  const [isRadiant, setIsRadiant] = useState(false);

  useEffect(() => {
    SHOWCASE_CARDS.forEach((id) => {
      const img = new Image();
      img.src = cardImageUrl(id);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    function scheduleReveal() {
      if (cancelled) return;
      setTimeout(() => {
        if (cancelled) return;
        setRevealed(true);
        scheduleHide();
      }, 1000);
    }

    function scheduleHide() {
      if (cancelled) return;
      setTimeout(() => {
        if (cancelled) return;
        setRevealed(false);
        setTimeout(() => {
          if (cancelled) return;
          setCardIndex((i) => (i + 1) % SHOWCASE_CARDS.length);
          setRarity(randomRarity());
          setIsRadiant(Math.random() < 0.15);
          scheduleReveal();
        }, 900);
      }, 5000);
    }

    scheduleReveal();
    return () => { cancelled = true; };
  }, []);

  const cardId = SHOWCASE_CARDS[cardIndex];

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-8 text-center">
      <div className="max-w-md w-full space-y-6 sm:space-y-10">
        <h1
          className="text-4xl sm:text-6xl font-light tracking-widest"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}
        >
          ARKHANA
        </h1>

        <div className="flex justify-center">
          <TarotCard
            card={CARD_BY_ID[cardId]}
            rarityScore={rarity}
            isReversed={false}
            isRadiant={isRadiant}
            revealed={revealed}
            size="lg"
          />
        </div>

        <p
          className="text-base sm:text-lg tracking-wide"
          style={{
            color: "var(--color-text-primary)",
            opacity: 0.6,
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
          }}
        >
          What will be your fate today?
        </p>

        <Form method="post" className="space-y-3">
          <input type="hidden" name="_action" value="auth" />
          {authError && (
            <p className="text-sm" style={{ color: "var(--color-rarity-arcane)" }}>
              {authError}
            </p>
          )}
          <div className="flex gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="your@email.com"
              autoComplete="email"
              className="flex-1 bg-transparent border px-4 py-3 text-sm outline-none opacity-60 focus:opacity-100 placeholder:opacity-30"
              style={{
                borderColor: "var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}
            />
            <button
              type="submit"
              className="px-6 py-3 text-sm tracking-widest uppercase border transition-opacity hover:opacity-90"
              style={{
                borderColor: "var(--color-border-default)",
                color: "var(--color-text-muted)",
              }}
            >
              Enter
            </button>
          </div>
        </Form>
      </div>
    </main>
  );
}
