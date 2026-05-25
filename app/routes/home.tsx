import { useState, useEffect, startTransition } from "react";
import { redirect, useFetcher, data as routeData } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { addTransitionType } from "react";
import type { Route } from "./+types/home";
import { Link, useNavigate } from "react-router";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { SpreadSummaryGrid } from "../components/SpreadSummaryGrid";
import { getTodayPull, getRecentPulls, getUniqueCardCount, dailyPull } from "../lib/pull";
import { getTodaySpread, drawSpread, getSpreadId } from "../lib/spread-pull";
import type { SpreadCardResult } from "../lib/spread-pull";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription, cardSlug, type Rarity } from "../lib/cards";
import { getSpreadType } from "../lib/spreads";
import { useAutoReveal } from "../lib/useAutoReveal";
import { DateTime } from "luxon";
import { todayUTC, getOrigin } from "../lib/utils";
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
    return {
      user: null as null,
      todayPull: null as Awaited<ReturnType<typeof getTodayPull>> | null,
      recentPulls: [] as Awaited<ReturnType<typeof getRecentPulls>>,
      totalUnique: 0,
      isSundayToday: false,
      sundaySpread: null as SpreadCardResult[] | null,
      sundaySpreadId: null as number | null,
      spreadDef: null as { name: string; subtitle: string; description: string; positions: { index: number; label: string; contemplationPrompt: string }[] } | null,
      todayStr: todayUTC(),
      origin: getOrigin(request),
    };
  }

  const userId = context.user.id;
  const todayStr = todayUTC();
  const isSundayToday = DateTime.utc().weekday === 7;

  const [recentPulls, totalUnique, sundaySpread, sundaySpreadId] = await Promise.all([
    getRecentPulls(userId, 5),
    getUniqueCardCount(userId),
    isSundayToday ? getTodaySpread(userId, "sunday-weekly", todayStr) : Promise.resolve(null),
    isSundayToday ? getSpreadId(userId, "sunday-weekly", todayStr) : Promise.resolve(null),
  ]);

  const spreadDef = isSundayToday ? (() => {
    const d = getSpreadType("sunday-weekly")!;
    return { name: d.name, subtitle: d.subtitle, description: d.description, positions: d.positions };
  })() : null;

  if (isSundayToday) {
    return {
      user: context.user,
      isSundayToday: true,
      sundaySpread,
      sundaySpreadId,
      spreadDef,
      todayPull: null as Awaited<ReturnType<typeof getTodayPull>> | null,
      recentPulls,
      totalUnique,
      todayStr,
      origin: getOrigin(request),
    };
  }

  const todayPull = await getTodayPull(userId, todayStr);
  return {
    user: context.user,
    isSundayToday: false,
    sundaySpread: null as SpreadCardResult[] | null,
    sundaySpreadId: null as number | null,
    spreadDef: null as typeof spreadDef,
    todayPull,
    recentPulls,
    totalUnique,
    todayStr,
    origin: getOrigin(request),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  if (!context.user) return redirect("/");
  const formData = await request.formData();
  const actionType = formData.get("_action");

  if (actionType === "spread") {
    const result = await drawSpread(context.user.id, "sunday-weekly", DateTime.utc());
    if (result.status === "unavailable") return { _type: "spread", status: "unavailable" as const };
    return { _type: "spread" as const, status: result.status, spreadId: result.spreadId, cards: result.cards };
  }

  const result = await dailyPull(context.user.id);
  return result;
}

export function meta({ data }: Route.MetaArgs) {
  const origin = data?.origin ?? "";
  return [
    { title: "Arkhana" },
    { name: "description", content: "Daily Tarot · One card. Every day. Uncover your arkhive." },
    { property: "og:title", content: "Arkhana" },
    { property: "og:description", content: "Daily Tarot · One card. Every day. Uncover your arkhive." },
    { property: "og:image", content: `${origin}/api/og.png?type=app` },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Arkhana" },
    { name: "twitter:description", content: "Daily Tarot · One card. Every day." },
    { name: "twitter:image", content: `${origin}/api/og.png?type=app` },
  ];
}

type SundayPhase =
  | { phase: "intro" }
  | { phase: "drawing" }
  | { phase: "contemplating"; position: number }
  | { phase: "summary" }
  | { phase: "done" };

function SpreadContemplateReveal({
  card,
  position,
  positions,
  isLast,
  onAdvance,
}: {
  card: SpreadCardResult;
  position: number;
  positions: { index: number; label: string; contemplationPrompt: string }[];
  isLast: boolean;
  onAdvance: () => void;
}) {
  const [cardRevealed, setCardRevealed] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const rarityLabel = RARITY_LABELS[card.rarityScore]?.toLowerCase();
  const posLabel = positions[position]?.label ?? "";
  const nextLabel = positions[position + 1]?.label;

  useEffect(() => {
    if (!cardRevealed) return;
    const t = setTimeout(() => setShowContinue(true), 1000);
    return () => clearTimeout(t);
  }, [cardRevealed]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-4 sm:space-y-6 pt-2 sm:pt-8 flex flex-col items-center"
    >
      <div className="space-y-2">
        <p
          className="text-xs tracking-widest uppercase opacity-30"
          style={{ color: "var(--color-text-primary)" }}
        >
          {position + 1} of {positions.length}
        </p>
        <h2
          className="text-2xl sm:text-3xl font-light tracking-wide"
          style={{ color: "var(--color-rarity-mystic)", fontFamily: "var(--font-serif)" }}
        >
          {posLabel}
        </h2>
      </div>

      {/* Card: centered in remaining space */}
      <TarotCard
        card={card.card}
        rarityScore={card.rarityScore as Rarity}
        isReversed={card.isReversed}
        isRadiant={card.isRadiant}
        revealed={cardRevealed}
        onReveal={() => setCardRevealed(true)}
        size="lg"
        showHint={!cardRevealed}
      />

      {/* Below card: grid overlay — prompt and details share the same slot, no layout shift */}
      <div className="w-full max-w-xs grid" style={{ gridTemplateAreas: "'slot'" }}>
        {/* Pre-reveal: contemplation prompt */}
        <div
          className="space-y-2 transition-opacity duration-300"
          style={{
            gridArea: "slot",
            opacity: cardRevealed ? 0 : 1,
            pointerEvents: cardRevealed ? "none" : "auto",
          }}
        >
          <p
            className="text-sm leading-relaxed opacity-80 italic"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
          >
            {positions[position]?.contemplationPrompt}
          </p>
        </div>
        {/* Post-reveal: card details + continue button */}
        <div
          className="space-y-2 transition-opacity duration-500"
          style={{
            gridArea: "slot",
            opacity: cardRevealed ? 1 : 0,
            pointerEvents: cardRevealed ? "auto" : "none",
          }}
        >
          <p
            className="text-xs tracking-widest uppercase"
            style={{ color: `var(--color-rarity-${rarityLabel})` }}
          >
            {RARITY_LABELS[card.rarityScore]}
            {card.isRadiant && " ✦"}
            {card.isReversed && " · Reversed"}
          </p>
          <h3
            className="text-xl font-light tracking-wide"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
          >
            {card.card.name}
          </h3>
          <p
            className="text-sm leading-relaxed opacity-85"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
          >
            {getCardDescription(card.card, card.rarityScore, card.isReversed)}
          </p>
          <button
            onClick={onAdvance}
            className="mt-2 px-8 py-2.5 text-xs tracking-widest uppercase border transition-opacity hover:opacity-80"
            style={{
              color: "var(--color-text-primary)",
              borderColor: "var(--color-rarity-mystic)",
              opacity: showContinue ? 1 : 0,
              pointerEvents: showContinue ? "auto" : "none",
              transition: "opacity 0.4s",
            }}
          >
            {isLast ? "See your reading" : `Continue to ${nextLabel}`}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const isPulling = fetcher.state === "submitting";
  const dailyResult = fetcher.data && "card" in fetcher.data ? fetcher.data : null;
  const rarityLabel = dailyResult ? RARITY_LABELS[dailyResult.rarityScore]?.toLowerCase() : null;
  const [revealed, revealNow] = useAutoReveal(!!dailyResult, 600);

  const { isSundayToday, sundaySpread, sundaySpreadId, spreadDef, todayStr } = loaderData;

  const [sundayPhase, setSundayPhase] = useState<SundayPhase>(() =>
    sundaySpread ? { phase: "done" } : { phase: "intro" }
  );
  const [drawnCards, setDrawnCards] = useState<SpreadCardResult[] | null>(sundaySpread ?? null);
  const [activeSpreadId, setActiveSpreadId] = useState<number | null>(sundaySpreadId);

  const spreadActionData = fetcher.data && "_type" in fetcher.data && fetcher.data._type === "spread"
    ? (fetcher.data as { _type: "spread"; status: string; spreadId?: number; cards?: SpreadCardResult[] })
    : null;

  useEffect(() => {
    if (!spreadActionData) return;
    if (
      (spreadActionData.status === "success" || spreadActionData.status === "already_pulled") &&
      spreadActionData.cards
    ) {
      setDrawnCards(spreadActionData.cards);
      if (spreadActionData.spreadId) setActiveSpreadId(spreadActionData.spreadId);
      setSundayPhase({ phase: "contemplating", position: 0 });
    }
  }, [spreadActionData]);

  const positions = spreadDef?.positions ?? [];
  const lastPosition = positions.length - 1;
  const currentCards = drawnCards ?? [];
  const isCeremonyActive =
    isSundayToday &&
    (sundayPhase.phase === "drawing" || sundayPhase.phase === "contemplating");

  if (!loaderData.user) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <p className="text-sm opacity-40 tracking-widest uppercase">The arkhive stirs…</p>
      </div>
    );
  }

  const { user, todayPull, recentPulls, totalUnique } = loaderData;
  const todayCard = todayPull ? CARD_BY_ID[todayPull.cardId] : null;
  const spreadShareUrl = user.username
    ? `/u/${user.username}/pull/${todayStr}`
    : activeSpreadId ? `/s/${activeSpreadId}` : null;

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
        <main className="max-w-2xl mx-auto px-6 py-6 sm:py-12 space-y-8 sm:space-y-12">

          {isSundayToday && spreadDef ? (
            <section className="space-y-6">
              <AnimatePresence mode="wait">

                {/* ── Intro ──────────────────────────────────────────────── */}
                {sundayPhase.phase === "intro" && (
                  <motion.div
                    key="sunday-intro"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.5 }}
                    className="text-center space-y-8 pt-4"
                  >
                    <div className="space-y-3">
                      <p
                        className="text-xs tracking-widest uppercase opacity-40"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {spreadDef.subtitle}
                      </p>
                      <h2
                        className="text-3xl font-light tracking-wide"
                        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                      >
                        {spreadDef.name}
                      </h2>
                    </div>
                    <div
                      className="w-16 h-px mx-auto opacity-20"
                      style={{ background: "var(--color-text-primary)" }}
                    />
                    <p
                      className="text-base leading-relaxed opacity-80 max-w-sm mx-auto"
                      style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                    >
                      {spreadDef.description}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {positions.map((pos) => (
                        <span
                          key={pos.index}
                          className="text-xs tracking-widest uppercase opacity-30 px-3 py-1 border"
                          style={{
                            color: "var(--color-text-primary)",
                            borderColor: "var(--color-bg-elevated)",
                          }}
                        >
                          {pos.label}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        setSundayPhase({ phase: "drawing" });
                        fetcher.submit({ _action: "spread" }, { method: "post" });
                      }}
                      className="px-8 py-3 text-xs tracking-widest uppercase border transition-opacity hover:opacity-80"
                      style={{
                        color: "var(--color-text-primary)",
                        borderColor: "var(--color-rarity-mystic)",
                      }}
                    >
                      Begin the reading
                    </button>
                  </motion.div>
                )}

                {/* ── Drawing ──────────────────────────────────────────────*/}
                {sundayPhase.phase === "drawing" && (
                  <motion.div
                    key="sunday-drawing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-center space-y-8 pt-8"
                  >
                    <div className="space-y-3">
                      <p
                        className="text-xs tracking-widest uppercase opacity-40"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {spreadDef.subtitle}
                      </p>
                      <h2
                        className="text-3xl font-light tracking-wide"
                        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                      >
                        {spreadDef.name}
                      </h2>
                    </div>
                    <div
                      className="w-16 h-px mx-auto opacity-20"
                      style={{ background: "var(--color-text-primary)" }}
                    />
                    <p
                      className="text-sm opacity-50 animate-pulse"
                      style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                    >
                      The cards are gathering…
                    </p>
                  </motion.div>
                )}

                {/* ── Contemplating + reveal in place ─────────────────────*/}
                {sundayPhase.phase === "contemplating" && currentCards[sundayPhase.position] && (
                  <SpreadContemplateReveal
                    key={`sunday-contemplating-${sundayPhase.position}`}
                    card={currentCards[sundayPhase.position]}
                    position={sundayPhase.position}
                    positions={positions}
                    isLast={sundayPhase.position === lastPosition}
                    onAdvance={() => {
                      if (sundayPhase.position < lastPosition) {
                        setSundayPhase({ phase: "contemplating", position: sundayPhase.position + 1 });
                      } else {
                        setSundayPhase({ phase: "summary" });
                      }
                    }}
                  />
                )}

                {/* ── Summary ──────────────────────────────────────────────*/}
                {sundayPhase.phase === "summary" && (
                  <motion.div
                    key="sunday-summary"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-10"
                  >
                    <div className="text-center space-y-3">
                      <p
                        className="text-xs tracking-widest uppercase opacity-40"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {spreadDef.subtitle}
                      </p>
                      <h2
                        className="text-2xl font-light tracking-wide"
                        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                      >
                        {spreadDef.name}
                      </h2>
                    </div>
                    <SpreadSummaryGrid cards={currentCards} positions={positions} />
                    {spreadShareUrl && (
                      <div className="flex justify-center pt-2">
                        <ShareButton
                          title={`${spreadDef.name} — Arkhana`}
                          url={spreadShareUrl}
                          text=""
                          label="Share reading"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Done (already completed today) ───────────────────────*/}
                {sundayPhase.phase === "done" && (
                  <motion.div
                    key="sunday-done"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-8"
                  >
                    <div className="text-center space-y-3">
                      <h2
                        className="text-sm tracking-widest uppercase opacity-50"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        Sunday Reading
                      </h2>
                      <p
                        className="text-2xl font-light"
                        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                      >
                        {spreadDef.name}
                      </p>
                    </div>
                    <SpreadSummaryGrid cards={currentCards} positions={positions} />
                    {spreadShareUrl && (
                      <div className="flex justify-center pt-2">
                        <ShareButton
                          title={`${spreadDef.name} — Arkhana`}
                          url={spreadShareUrl}
                          text=""
                          label="Share reading"
                        />
                      </div>
                    )}
                  </motion.div>
                )}

              </AnimatePresence>
            </section>
          ) : (
            <section className="space-y-6 text-center">
              <h2
                className="text-sm sm:text-xs tracking-widest uppercase opacity-50"
                style={{ color: "var(--color-text-primary)" }}
              >
                Today
              </h2>

              {dailyResult ? (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <TarotCard
                      card={dailyResult.card}
                      rarityScore={dailyResult.rarityScore as Rarity}
                      isReversed={dailyResult.isReversed}
                      isRadiant={dailyResult.isRadiant}
                      revealed={revealed}
                      onReveal={revealNow}
                      size="lg"
                      showHint={!revealed}
                    />
                  </div>
                  <div
                    className="space-y-3 transition-opacity duration-500"
                    style={{
                      opacity: revealed ? 1 : 0,
                    }}
                  >
                    <p
                      className="text-xs tracking-widest uppercase"
                      style={{ color: `var(--color-rarity-${rarityLabel})` }}
                      aria-label={[RARITY_LABELS[dailyResult.rarityScore], dailyResult.isRadiant ? "Radiant" : null, dailyResult.isReversed ? "Reversed" : null].filter(Boolean).join(", ")}
                    >
                      <span aria-hidden="true">
                        {RARITY_LABELS[dailyResult.rarityScore]}
                        {dailyResult.isRadiant && " ✦"}
                        {dailyResult.isReversed && " · Reversed"}
                      </span>
                    </p>
                    <h2
                      className="text-2xl font-light tracking-wide"
                      style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                    >
                      {dailyResult.card.name}
                    </h2>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)", opacity: 0.85 }}
                    >
                      {getCardDescription(dailyResult.card, dailyResult.rarityScore, dailyResult.isReversed)}
                    </p>
                    <a
                      href={`/collection/${cardSlug(dailyResult.card)}`}
                      onClick={(e) => { e.preventDefault(); navigateToCard(cardSlug(dailyResult.card)); }}
                      className="block text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity pt-1"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      Card history →
                    </a>
                    <div className="flex justify-center pt-2">
                      <ShareButton
                        title={`${dailyResult.card.name} — Arkhana`}
                        url={user.username ? `/u/${user.username}/pull/${todayStr}` : `/share/${dailyResult.pullId}`}
                        text=""
                        label="Share"
                      />
                    </div>
                  </div>
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
                    <div className="flex justify-center pt-2">
                      <ShareButton
                        title={`${todayCard.name} — Arkhana`}
                        url={user.username ? `/u/${user.username}/pull/${todayStr}` : `/share/${todayPull.id}`}
                        text=""
                        label="Share"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <p
                    className="text-xl opacity-80"
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
          )}

          {!dailyResult && !isCeremonyActive && (
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

          {!dailyResult && !isCeremonyActive && recentPulls.length > 0 && (
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
                to="/history"
                className="block text-center text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity pt-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                Full history →
              </Link>
            </section>
          )}
        </main>
      </div>
    </DirectionalTransition>
  );
}
