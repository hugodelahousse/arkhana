import { useState, useEffect } from "react";
import { redirect, useFetcher, data } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { DateTime } from "luxon";
import type { Route } from "./+types/spread.$type";
import { Link } from "react-router";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { getSpreadType } from "../lib/spreads";
import { drawSpread, getTodaySpread } from "../lib/spread-pull";
import { RARITY_LABELS, getCardDescription, type Rarity } from "../lib/cards";
import { useAutoReveal } from "../lib/useAutoReveal";
import type { SpreadCardResult } from "../lib/spread-pull";

export async function loader({ context, params }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");

  const spreadDef = getSpreadType(params.type);
  if (!spreadDef) throw data("Spread not found", { status: 404 });

  const now = DateTime.utc();
  const spreadDate = now.toISODate()!;
  const isAvailable = spreadDef.isAvailable(now);
  const nextAvailable = spreadDef.nextAvailable(now).toISO()!;

  const existingCards = isAvailable
    ? await getTodaySpread(context.user.id, params.type, spreadDate)
    : null;

  return {
    user: context.user,
    spreadId: params.type,
    name: spreadDef.name,
    subtitle: spreadDef.subtitle,
    description: spreadDef.description,
    positions: spreadDef.positions,
    isAvailable,
    nextAvailable,
    existingCards,
  };
}

export async function action({ context, params }: Route.ActionArgs) {
  if (!context.user) return redirect("/");
  const spreadDef = getSpreadType(params.type);
  if (!spreadDef) throw data("Spread not found", { status: 404 });
  return drawSpread(context.user.id, params.type, DateTime.utc());
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.name ?? "Reading"} — Arkhana` }];
}

type SpreadPhase =
  | { phase: "unavailable" }
  | { phase: "idle" }
  | { phase: "drawing" }
  | { phase: "contemplating"; position: number }
  | { phase: "revealing"; position: number }
  | { phase: "summary" }
  | { phase: "already-done" };

function CardReveal({
  card,
  position,
  label,
}: {
  card: SpreadCardResult;
  position: number;
  label: string;
}) {
  const [revealed, revealNow] = useAutoReveal(true, 700);
  const rarityLabel = RARITY_LABELS[card.rarityScore]?.toLowerCase();

  return (
    <div className="space-y-8 flex flex-col items-center">
      <p
        className="text-xs tracking-widest uppercase opacity-50"
        style={{ color: "var(--color-text-primary)" }}
      >
        {label}
      </p>
      <TarotCard
        card={card.card}
        rarityScore={card.rarityScore as Rarity}
        isReversed={card.isReversed}
        isRadiant={card.isRadiant}
        revealed={revealed}
        onReveal={revealNow}
        size="lg"
        showHint={!revealed}
      />
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-4 text-center max-w-xs"
          >
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: `var(--color-rarity-${rarityLabel})` }}
            >
              {RARITY_LABELS[card.rarityScore]}
              {card.isRadiant && " ✦"}
              {card.isReversed && " · Reversed"}
            </p>
            <h2
              className="text-2xl font-light tracking-wide"
              style={{
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-serif)",
              }}
            >
              {card.card.name}
            </h2>
            <div
              className="w-8 h-px mx-auto"
              style={{
                background: `var(--color-rarity-${rarityLabel})`,
                opacity: 0.5,
              }}
            />
            <p
              className="text-sm leading-relaxed opacity-85"
              style={{
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-serif)",
              }}
            >
              {getCardDescription(card.card, card.rarityScore, card.isReversed)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryGrid({
  cards,
  positions,
}: {
  cards: SpreadCardResult[];
  positions: { index: number; label: string }[];
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const sorted = [...cards].sort((a, b) => a.position - b.position);

  return (
    <div className="grid grid-cols-2 gap-6 sm:gap-8">
      {sorted.map((card) => {
        const posLabel = positions[card.position]?.label ?? String(card.position);
        const rarityLabel = RARITY_LABELS[card.rarityScore]?.toLowerCase();
        const isOpen = expanded === card.position;

        return (
          <div key={card.position} className="flex flex-col items-center gap-3">
            <p
              className="text-xs tracking-widest uppercase opacity-40"
              style={{ color: "var(--color-text-primary)" }}
            >
              {posLabel}
            </p>
            <div
              className="cursor-pointer"
              onClick={() => setExpanded(isOpen ? null : card.position)}
            >
              <TarotCard
                card={card.card}
                rarityScore={card.rarityScore as Rarity}
                isReversed={card.isReversed}
                isRadiant={card.isRadiant}
                revealed={true}
                size="sm"
              />
            </div>
            <div className="text-center space-y-1">
              <p
                className="text-xs tracking-widest uppercase"
                style={{ color: `var(--color-rarity-${rarityLabel})` }}
              >
                {RARITY_LABELS[card.rarityScore]}
                {card.isRadiant && " ✦"}
              </p>
              <p
                className="text-sm font-light"
                style={{
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-serif)",
                }}
              >
                {card.card.name}
                {card.isReversed && (
                  <span className="ml-1 text-xs opacity-50">(reversed)</span>
                )}
              </p>
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs leading-relaxed text-center opacity-70 overflow-hidden"
                  style={{
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-serif)",
                  }}
                >
                  {getCardDescription(card.card, card.rarityScore, card.isReversed)}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function SpreadRoute({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher();
  const {
    user,
    name,
    subtitle,
    description,
    positions,
    isAvailable,
    nextAvailable,
    existingCards,
  } = loaderData;

  const initialPhase: SpreadPhase = (() => {
    if (!isAvailable) return { phase: "unavailable" };
    if (existingCards) return { phase: "already-done" };
    return { phase: "idle" };
  })();

  const [phase, setPhase] = useState<SpreadPhase>(initialPhase);
  const [drawnCards, setDrawnCards] = useState<SpreadCardResult[] | null>(
    existingCards ?? null
  );

  // Transition from drawing → contemplating when server responds
  useEffect(() => {
    if (!fetcher.data) return;
    const result = fetcher.data as { status: string; cards?: SpreadCardResult[] };
    if (
      (result.status === "success" || result.status === "already_pulled") &&
      result.cards
    ) {
      setDrawnCards(result.cards);
      setPhase({ phase: "contemplating", position: 0 });
    }
  }, [fetcher.data]);

  const currentCards = drawnCards ?? existingCards ?? [];
  const lastPosition = positions.length - 1;

  function advanceFromRevealed(pos: number) {
    if (pos < lastPosition) {
      setPhase({ phase: "contemplating", position: pos + 1 });
    } else {
      setPhase({ phase: "summary" });
    }
  }

  const nextSunday = DateTime.fromISO(nextAvailable, { zone: "utc" }).toFormat(
    "cccc, LLLL d"
  );

  return (
    <DirectionalTransition>
      <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
        <Nav userName={user.name} isAnonymous={user.isAnonymous} />
        <main className="max-w-lg mx-auto px-6 py-12">
          <AnimatePresence mode="wait">

            {/* ── Unavailable ─────────────────────────────────────────── */}
            {phase.phase === "unavailable" && (
              <motion.div
                key="unavailable"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-8 pt-12"
              >
                <div className="space-y-3">
                  <p
                    className="text-xs tracking-widest uppercase opacity-40"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {subtitle}
                  </p>
                  <h1
                    className="text-3xl font-light tracking-wide"
                    style={{
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    {name}
                  </h1>
                </div>
                <div
                  className="w-16 h-px mx-auto opacity-20"
                  style={{ background: "var(--color-text-primary)" }}
                />
                <p
                  className="text-sm leading-relaxed opacity-60 max-w-xs mx-auto"
                  style={{
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-serif)",
                  }}
                >
                  This spread awakens only when the week is born. Return on{" "}
                  <span style={{ color: "var(--color-rarity-mystic)" }}>
                    {nextSunday}
                  </span>
                  .
                </p>
                <Link
                  to="/"
                  className="block text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity pt-4"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  ← Return home
                </Link>
              </motion.div>
            )}

            {/* ── Idle (intro) ─────────────────────────────────────────── */}
            {phase.phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-8 pt-8"
              >
                <div className="space-y-3">
                  <p
                    className="text-xs tracking-widest uppercase opacity-40"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {subtitle}
                  </p>
                  <h1
                    className="text-3xl font-light tracking-wide"
                    style={{
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    {name}
                  </h1>
                </div>
                <div
                  className="w-16 h-px mx-auto opacity-20"
                  style={{ background: "var(--color-text-primary)" }}
                />
                <p
                  className="text-sm leading-relaxed opacity-70 max-w-sm mx-auto"
                  style={{
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-serif)",
                  }}
                >
                  {description}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
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
                    setPhase({ phase: "drawing" });
                    fetcher.submit({}, { method: "post" });
                  }}
                  className="px-8 py-3 text-xs tracking-widest uppercase border transition-opacity hover:opacity-80 mt-4"
                  style={{
                    color: "var(--color-text-primary)",
                    borderColor: "var(--color-rarity-mystic)",
                  }}
                >
                  Begin the reading
                </button>
              </motion.div>
            )}

            {/* ── Drawing ───────────────────────────────────────────────── */}
            {phase.phase === "drawing" && (
              <motion.div
                key="drawing"
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
                    {subtitle}
                  </p>
                  <h1
                    className="text-3xl font-light tracking-wide"
                    style={{
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    {name}
                  </h1>
                </div>
                <div
                  className="w-16 h-px mx-auto opacity-20"
                  style={{ background: "var(--color-text-primary)" }}
                />
                <p
                  className="text-sm opacity-50 animate-pulse"
                  style={{
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-serif)",
                  }}
                >
                  The cards are gathering…
                </p>
              </motion.div>
            )}

            {/* ── Contemplating ────────────────────────────────────────── */}
            {phase.phase === "contemplating" && (
              <motion.div
                key={`contemplating-${phase.position}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-8 pt-8"
              >
                <div className="space-y-2">
                  <p
                    className="text-xs tracking-widest uppercase opacity-30"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {phase.position + 1} of {positions.length}
                  </p>
                  <h2
                    className="text-4xl font-light tracking-wide"
                    style={{
                      color: "var(--color-rarity-mystic)",
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    {positions[phase.position]?.label}
                  </h2>
                </div>
                <div
                  className="w-16 h-px mx-auto"
                  style={{ background: "var(--color-rarity-mystic)", opacity: 0.3 }}
                />
                <p
                  className="text-sm leading-relaxed opacity-70 max-w-xs mx-auto italic"
                  style={{
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-serif)",
                  }}
                >
                  {positions[phase.position]?.contemplationPrompt}
                </p>
                {currentCards[phase.position] && (
                  <div className="flex justify-center py-4 pointer-events-none opacity-30">
                    <TarotCard
                      card={currentCards[phase.position].card}
                      rarityScore={1}
                      isReversed={false}
                      isRadiant={false}
                      revealed={false}
                      size="md"
                    />
                  </div>
                )}
                <button
                  onClick={() =>
                    setPhase({ phase: "revealing", position: phase.position })
                  }
                  className="px-8 py-3 text-xs tracking-widest uppercase border transition-opacity hover:opacity-80"
                  style={{
                    color: "var(--color-text-primary)",
                    borderColor: "var(--color-rarity-mystic)",
                  }}
                >
                  I am ready
                </button>
              </motion.div>
            )}

            {/* ── Revealing ────────────────────────────────────────────── */}
            {phase.phase === "revealing" && (
              <RevealStep
                key={`revealing-${phase.position}`}
                card={currentCards[phase.position]}
                positionLabel={positions[phase.position]?.label ?? ""}
                position={phase.position}
                totalPositions={positions.length}
                isLast={phase.position === lastPosition}
                nextLabel={positions[phase.position + 1]?.label}
                onAdvance={() => advanceFromRevealed(phase.position)}
              />
            )}

            {/* ── Summary / Already-done ───────────────────────────────── */}
            {(phase.phase === "summary" || phase.phase === "already-done") && (
              <motion.div
                key="summary"
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
                    {subtitle}
                  </p>
                  <h1
                    className="text-2xl font-light tracking-wide"
                    style={{
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    {name}
                  </h1>
                </div>
                <SummaryGrid cards={currentCards} positions={positions} />
                <div className="text-center pt-4">
                  <Link
                    to="/"
                    className="text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    ← Return home
                  </Link>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </DirectionalTransition>
  );
}

function RevealStep({
  card,
  positionLabel,
  position,
  totalPositions,
  isLast,
  nextLabel,
  onAdvance,
}: {
  card: SpreadCardResult;
  positionLabel: string;
  position: number;
  totalPositions: number;
  isLast: boolean;
  nextLabel?: string;
  onAdvance: () => void;
}) {
  const [revealed, revealNow] = useAutoReveal(true, 700);
  const rarityLabel = RARITY_LABELS[card.rarityScore]?.toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-8 pt-8 flex flex-col items-center"
    >
      <div className="space-y-2">
        <p
          className="text-xs tracking-widest uppercase opacity-30"
          style={{ color: "var(--color-text-primary)" }}
        >
          {position + 1} of {totalPositions}
        </p>
        <h2
          className="text-3xl font-light tracking-wide"
          style={{
            color: "var(--color-rarity-mystic)",
            fontFamily: "var(--font-serif)",
          }}
        >
          {positionLabel}
        </h2>
      </div>

      <TarotCard
        card={card.card}
        rarityScore={card.rarityScore as Rarity}
        isReversed={card.isReversed}
        isRadiant={card.isRadiant}
        revealed={revealed}
        onReveal={revealNow}
        size="lg"
        showHint={!revealed}
      />

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-4 max-w-xs"
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
              className="text-2xl font-light tracking-wide"
              style={{
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-serif)",
              }}
            >
              {card.card.name}
            </h3>
            <div
              className="w-8 h-px mx-auto"
              style={{
                background: `var(--color-rarity-${rarityLabel})`,
                opacity: 0.5,
              }}
            />
            <p
              className="text-sm leading-relaxed opacity-85"
              style={{
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-serif)",
              }}
            >
              {getCardDescription(card.card, card.rarityScore, card.isReversed)}
            </p>
            <button
              onClick={onAdvance}
              className="mt-4 px-8 py-3 text-xs tracking-widest uppercase border transition-opacity hover:opacity-80"
              style={{
                color: "var(--color-text-primary)",
                borderColor: "var(--color-rarity-mystic)",
              }}
            >
              {isLast ? "See your reading" : `Continue to ${nextLabel}`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
