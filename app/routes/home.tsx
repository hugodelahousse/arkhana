import { useState, useEffect, startTransition } from "react";
import { redirect, useFetcher } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { addTransitionType } from "react";
import type { Route } from "./+types/home";
import { Link, useNavigate } from "react-router";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { SpreadSummaryGrid } from "../components/SpreadSummaryGrid";
import { MoonCycle } from "../components/MoonCycle";
import { StreakMilestone } from "../components/StreakMilestone";
import { getTodayPull, getRecentPulls, getUniqueCardCount, dailyPull } from "../lib/pull";
import { getStreak, initStreakFromHistory } from "../lib/streak";
import { getTodaySpread, drawSpread, getSpreadId } from "../lib/spread-pull";
import type { SpreadCardResult } from "../lib/spread-pull";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription, cardSlug, type Rarity, type CardDefinition } from "../lib/cards";
import { getSpreadType } from "../lib/spreads";
import { useAutoReveal } from "../lib/useAutoReveal";
import { DateTime } from "luxon";
import { todayUTC, getOrigin } from "../lib/utils";
import { config } from "../../config/index.js";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { ShareButton } from "../components/ShareButton";
import { ArrowRight } from "@phosphor-icons/react";
import type { Milestone } from "../lib/streak";

// Reflection prompt per arcana/suit — shown in the layered second-reveal
function reflectionPrompt(card: CardDefinition): string {
  if (card.arcana === "major") {
    return `Where in your life is ${card.name}'s energy most present today?`;
  }
  const prompts: Record<string, string> = {
    wands: "Where is your passion or creative will at play today?",
    cups: "What emotions or relationships are asking for attention?",
    swords: "What thoughts or decisions are moving through you today?",
    pentacles: "How does this show up in your body, work, or material world?",
  };
  return prompts[card.suit ?? "wands"] ?? "Where do you notice this energy today?";
}

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
      streak: null as { currentStreak: number; longestStreak: number; cycleStartDate: string | null } | null,
      previousPullDate: null as string | null,
    };
  }

  const userId = context.user.id;
  const todayStr = todayUTC();
  const isSundayToday = DateTime.utc().weekday === 7;

  const [recentPulls, totalUnique, sundaySpread, sundaySpreadId, streakState] = await Promise.all([
    getRecentPulls(userId, 5),
    getUniqueCardCount(userId),
    isSundayToday ? getTodaySpread(userId, "sunday-weekly", todayStr) : Promise.resolve(null),
    isSundayToday ? getSpreadId(userId, "sunday-weekly", todayStr) : Promise.resolve(null),
    getStreak(userId),
  ]);

  const spreadDef = isSundayToday ? (() => {
    const d = getSpreadType("sunday-weekly")!;
    return { name: d.name, subtitle: d.subtitle, description: d.description, positions: d.positions };
  })() : null;

  // Lazy-backfill: if the user has pulled before but has no streak record yet
  // (e.g. pulled before the streak system was deployed, or just after account migration).
  let resolvedStreakState = streakState;
  if (!resolvedStreakState && recentPulls.length > 0) {
    await initStreakFromHistory(userId, recentPulls.map((p) => p.pullDate));
    resolvedStreakState = await getStreak(userId);
  }

  const streak = resolvedStreakState
    ? { currentStreak: resolvedStreakState.currentStreak, longestStreak: resolvedStreakState.longestStreak, cycleStartDate: resolvedStreakState.cycleStartDate }
    : null;

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
      streak,
      previousPullDate: null as string | null,
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
    streak,
    previousPullDate: null as string | null,
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
        <p className="text-xs tracking-widest uppercase opacity-30 text-secondary">
          {position + 1} of {positions.length}
        </p>
        <h2
          className="text-2xl sm:text-3xl font-light tracking-wide font-serif"
          style={{ color: "var(--color-rarity-mystic)" }}
        >
          {posLabel}
        </h2>
      </div>

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

      {/* Grid overlay — prompt and details share the same slot, no layout shift */}
      <div className="w-full max-w-xs grid" style={{ gridTemplateAreas: "'slot'" }}>
        <div
          className="space-y-2 transition-opacity duration-300"
          style={{
            gridArea: "slot",
            opacity: cardRevealed ? 0 : 1,
            pointerEvents: cardRevealed ? "none" : "auto",
          }}
        >
          <p className="text-sm leading-relaxed opacity-80 italic text-secondary font-serif">
            {positions[position]?.contemplationPrompt}
          </p>
        </div>
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
          <h3 className="text-xl font-light tracking-wide text-secondary font-serif">
            {card.card.name}
          </h3>
          <p className="text-sm leading-relaxed opacity-85 text-secondary font-serif">
            {getCardDescription(card.card, card.rarityScore, card.isReversed)}
          </p>
          <button
            onClick={onAdvance}
            className="mt-2 px-8 py-2.5 text-xs tracking-widest uppercase border transition-opacity hover:opacity-80"
            style={{
              color: "var(--color-text-secondary)",
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

// Layered reveal: brief energy first, full meaning on demand
function DailyCardReveal({
  card,
  rarityScore,
  isReversed,
  isRadiant,
  pullId,
  previousPullDate,
  username,
  todayStr,
  onNavigateToCard,
}: {
  card: CardDefinition;
  rarityScore: Rarity;
  isReversed: boolean;
  isRadiant: boolean;
  pullId: number;
  previousPullDate: string | null;
  username: string | null;
  todayStr: string;
  onNavigateToCard: (slug: string) => void;
}) {
  const [revealed, revealNow] = useAutoReveal(true, 600);
  const [showFullMeaning, setShowFullMeaning] = useState(false);
  const [showExpandHint, setShowExpandHint] = useState(false);
  const rarityLabel = RARITY_LABELS[rarityScore]?.toLowerCase();
  const briefEnergy = card.descriptions[0]; // mundane description — always 1-2 sentences
  const fullMeaning = getCardDescription(card, rarityScore, isReversed);
  const reflection = reflectionPrompt(card);

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setShowExpandHint(true), 1400);
    return () => clearTimeout(t);
  }, [revealed]);

  const shareUrl = username
    ? `/u/${username}/pull/${todayStr}`
    : `/share/${pullId}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <TarotCard
          card={card}
          rarityScore={rarityScore}
          isReversed={isReversed}
          isRadiant={isRadiant}
          revealed={revealed}
          onReveal={revealNow}
          size="lg"
          showHint={!revealed}
        />
      </div>

      <AnimatePresence mode="wait">
        {!revealed ? null : !showFullMeaning ? (
          <motion.div
            key="brief"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="space-y-3 text-center"
          >
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: `var(--color-rarity-${rarityLabel})` }}
              aria-label={[RARITY_LABELS[rarityScore], isRadiant ? "Radiant" : null, isReversed ? "Reversed" : null].filter(Boolean).join(", ")}
            >
              <span aria-hidden="true">
                {RARITY_LABELS[rarityScore]}
                {isRadiant && " ✦"}
                {isReversed && " · Reversed"}
              </span>
            </p>
            <h2 className="text-2xl font-light tracking-wide text-secondary font-serif">
              {card.name}
            </h2>
            <p className="text-sm leading-relaxed opacity-85 text-secondary font-serif max-w-xs mx-auto">
              {briefEnergy}
            </p>
            {previousPullDate && (
              <p className="text-xs opacity-30 text-secondary font-serif">
                You've drawn this card before —{" "}
                {DateTime.fromISO(previousPullDate, { zone: "utc" }).toFormat("LLLL d, yyyy")}
              </p>
            )}
            <button
              onClick={() => setShowFullMeaning(true)}
              className="text-xs tracking-widest uppercase transition-opacity hover:opacity-80 text-secondary"
              style={{
                opacity: showExpandHint ? 0.5 : 0,
                pointerEvents: showExpandHint ? "auto" : "none",
                transition: "opacity 0.5s",
              }}
            >
              Reveal the full meaning ↓
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 text-center"
          >
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: `var(--color-rarity-${rarityLabel})` }}
              aria-label={[RARITY_LABELS[rarityScore], isRadiant ? "Radiant" : null, isReversed ? "Reversed" : null].filter(Boolean).join(", ")}
            >
              <span aria-hidden="true">
                {RARITY_LABELS[rarityScore]}
                {isRadiant && " ✦"}
                {isReversed && " · Reversed"}
              </span>
            </p>
            <h2 className="text-2xl font-light tracking-wide text-secondary font-serif">
              {card.name}
            </h2>
            <p className="text-sm leading-relaxed opacity-85 text-secondary font-serif max-w-xs mx-auto">
              {fullMeaning}
            </p>

            {/* Reflection prompt */}
            <div className="pt-2 border-t border-elevated max-w-xs mx-auto">
              <p className="text-xs opacity-40 text-secondary font-serif italic leading-relaxed">
                {reflection}
              </p>
            </div>

            {previousPullDate && (
              <p className="text-xs opacity-25 text-secondary font-serif">
                Previously drawn{" "}
                {DateTime.fromISO(previousPullDate, { zone: "utc" }).toFormat("LLLL d, yyyy")}
              </p>
            )}

            <div className="flex flex-col items-center gap-3 pt-2">
              <a
                href={`/collection/${cardSlug(card)}`}
                onClick={(e) => { e.preventDefault(); onNavigateToCard(cardSlug(card)); }}
                className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity text-secondary"
              >
                Card history <ArrowRight weight="light" size={13} aria-hidden />
              </a>
              <ShareButton
                title={`${card.name} — Arkhana`}
                url={shareUrl}
                text=""
                label="Share"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Push notification permission request — shown after first successful pull
function PushPermissionAsk({ onDismiss }: { onDismiss: () => void }) {
  const [asking, setAsking] = useState(false);

  async function requestPermission() {
    setAsking(true);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        onDismiss();
        return;
      }

      const keyRes = await fetch("/api/push/vapid-public-key");
      if (!keyRes.ok) { onDismiss(); return; }
      const { publicKey } = await keyRes.json();

      const permission = await Notification.requestPermission();
      if (permission !== "granted") { onDismiss(); return; }

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
    } finally {
      onDismiss();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-4 py-4 border-t border-elevated"
    >
      <p className="text-xs opacity-50 text-secondary font-serif text-center max-w-xs">
        A card has been holding your name.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={requestPermission}
          disabled={asking}
          className="text-xs tracking-widest uppercase px-5 py-2 border transition-opacity hover:opacity-80 text-secondary"
          style={{ borderColor: "var(--color-rarity-mystic)" }}
        >
          {asking ? "…" : "Allow reminders"}
        </button>
        <button
          onClick={onDismiss}
          className="text-xs opacity-30 hover:opacity-50 transition-opacity text-secondary tracking-widest uppercase"
        >
          Not now
        </button>
      </div>
    </motion.div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const isPulling = fetcher.state === "submitting";
  const dailyResult = fetcher.data && "card" in fetcher.data ? fetcher.data : null;

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDrawnCards(spreadActionData.cards);
      if (spreadActionData.spreadId) setActiveSpreadId(spreadActionData.spreadId);
      setSundayPhase({ phase: "contemplating", position: 0 });
    }
  }, [spreadActionData]);

  // Push notification ask — shown once after a successful new pull
  const [showPushAsk, setShowPushAsk] = useState(false);
  const [pushAskDismissed, setPushAskDismissed] = useState(false);
  const isNewPull = dailyResult && "status" in dailyResult && dailyResult.status === "success";

  useEffect(() => {
    if (!isNewPull || pushAskDismissed) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "default") return;
    const t = setTimeout(() => setShowPushAsk(true), 3000);
    return () => clearTimeout(t);
  }, [isNewPull, pushAskDismissed]);

  // Milestone modal
  const milestone = dailyResult && "milestone" in dailyResult ? dailyResult.milestone : null;
  const [milestoneShown, setMilestoneShown] = useState(false);

  const positions = spreadDef?.positions ?? [];
  const lastPosition = positions.length - 1;
  const currentCards = drawnCards ?? [];
  const isCeremonyActive =
    isSundayToday &&
    (sundayPhase.phase === "drawing" || sundayPhase.phase === "contemplating");

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  if (!loaderData.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm opacity-40 tracking-widest uppercase text-secondary">The arkhive stirs…</p>
      </div>
    );
  }

  const { user, todayPull, recentPulls, totalUnique, streak } = loaderData;
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

  const hasPulledToday = !!dailyResult || !!todayPull;

  // After a fresh pull the loader streak may lag behind — use action result when available
  const liveStreakDay =
    dailyResult && "streakDay" in dailyResult ? (dailyResult.streakDay as number) : null;
  const displayStreakCount = liveStreakDay ?? streak?.currentStreak ?? 0;

  return (
    <DirectionalTransition>
      <div className="min-h-screen">
        <Nav userName={user.name} isAnonymous={user.isAnonymous} />

        {/* Milestone overlay */}
        {milestone && !milestoneShown && (
          <StreakMilestone
            milestone={milestone as import("../lib/streak").Milestone}
            onDismiss={() => setMilestoneShown(true)}
          />
        )}

        <main className="max-w-2xl mx-auto px-6 py-6 sm:py-12 space-y-8 sm:space-y-12">

          {isSundayToday && spreadDef ? (
            <section className="space-y-6">
              <AnimatePresence mode="wait">

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
                      <p className="text-xs tracking-widest uppercase opacity-40 text-secondary">
                        {spreadDef.subtitle}
                      </p>
                      <h2 className="text-3xl font-light tracking-wide text-secondary font-serif">
                        {spreadDef.name}
                      </h2>
                    </div>
                    <div className="w-16 h-px mx-auto opacity-20 bg-secondary" />
                    <p className="text-base leading-relaxed opacity-80 max-w-sm mx-auto text-secondary font-serif">
                      {spreadDef.description}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      {positions.map((pos) => (
                        <span
                          key={pos.index}
                          className="text-xs tracking-widest uppercase opacity-30 px-3 py-1 border border-elevated text-secondary"
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
                      className="px-8 py-3 text-xs tracking-widest uppercase border transition-opacity hover:opacity-80 text-secondary"
                      style={{ borderColor: "var(--color-rarity-mystic)" }}
                    >
                      Begin the reading
                    </button>
                  </motion.div>
                )}

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
                      <p className="text-xs tracking-widest uppercase opacity-40 text-secondary">
                        {spreadDef.subtitle}
                      </p>
                      <h2 className="text-3xl font-light tracking-wide text-secondary font-serif">
                        {spreadDef.name}
                      </h2>
                    </div>
                    <div className="w-16 h-px mx-auto opacity-20 bg-secondary" />
                    <p className="text-sm opacity-50 animate-pulse text-secondary font-serif">
                      The cards are gathering…
                    </p>
                  </motion.div>
                )}

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
                      <p className="text-xs tracking-widest uppercase opacity-40 text-secondary">
                        {spreadDef.subtitle}
                      </p>
                      <h2 className="text-2xl font-light tracking-wide text-secondary font-serif">
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
                      <h2 className="text-sm tracking-widest uppercase opacity-50 text-secondary">
                        Sunday Reading
                      </h2>
                      <p className="text-2xl font-light text-secondary font-serif">
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
              <h2 className="text-sm sm:text-xs tracking-widest uppercase opacity-50 text-secondary">
                Today
              </h2>

              {dailyResult && "card" in dailyResult ? (
                <DailyCardReveal
                  card={dailyResult.card}
                  rarityScore={dailyResult.rarityScore as Rarity}
                  isReversed={dailyResult.isReversed}
                  isRadiant={dailyResult.isRadiant}
                  pullId={dailyResult.pullId}
                  previousPullDate={dailyResult.previousPullDate ?? null}
                  username={user.username ?? null}
                  todayStr={todayStr}
                  onNavigateToCard={navigateToCard}
                />
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
                    <p className="text-xl font-light text-secondary font-serif">
                      {todayCard.name}
                    </p>
                    <p className="text-sm leading-relaxed max-w-xs mx-auto opacity-70 text-secondary font-serif">
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
                  <p className="text-xl opacity-80 text-secondary font-serif">
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

          {/* Stats + streak — always visible, not ceremony */}
          {!isCeremonyActive && (
            <section className="border-t border-elevated pt-6 space-y-6">
              {/* Discovered count */}
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-widest uppercase opacity-30 text-secondary">
                  Collection
                </p>
                <p className="whitespace-nowrap font-serif text-sm">
                  <span className="text-primary opacity-80">{totalUnique}</span>
                  <span className="opacity-30 text-primary">/78</span>
                  <span className="text-xs tracking-widest uppercase opacity-30 ml-2 text-secondary">discovered</span>
                </p>
              </div>

              {/* Streak widget — always visible, links to /streak */}
              <Link
                to="/streak"
                className="flex items-center justify-between group hover:opacity-80 transition-opacity"
                aria-label={`Moon cycle: ${displayStreakCount} day streak. View moon calendar.`}
              >
                <div className="space-y-0.5">
                  <p className="text-xs tracking-widest uppercase opacity-30 text-secondary">
                    Moon Cycle
                  </p>
                  {displayStreakCount > 0 ? (
                    <p className="text-sm font-serif text-secondary opacity-70">
                      Day {((displayStreakCount - 1) % 28) + 1} of 28
                      {displayStreakCount >= 7 && (
                        <span className="ml-2 opacity-40">
                          · {displayStreakCount} day{displayStreakCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-sm font-serif text-secondary opacity-30">
                      Begin your practice
                    </p>
                  )}
                </div>
                <MoonCycle
                  currentStreak={displayStreakCount}
                  size="md"
                />
              </Link>
            </section>
          )}

          {/* Push permission ask */}
          <AnimatePresence>
            {showPushAsk && !pushAskDismissed && (
              <PushPermissionAsk
                onDismiss={() => {
                  setPushAskDismissed(true);
                  setShowPushAsk(false);
                }}
              />
            )}
          </AnimatePresence>

          {!dailyResult && !isCeremonyActive && recentPulls.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs tracking-widest uppercase opacity-50 text-secondary">
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
                      className="flex items-center justify-between py-3 border-b border-elevated opacity-70 hover:opacity-100 transition-opacity"
                    >
                      <span className="text-secondary font-serif">
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
                className="inline-flex items-center justify-center gap-1.5 text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity pt-2 text-secondary"
              >
                Full history <ArrowRight weight="light" size={13} aria-hidden />
              </Link>
            </section>
          )}
        </main>
      </div>
    </DirectionalTransition>
  );
}
