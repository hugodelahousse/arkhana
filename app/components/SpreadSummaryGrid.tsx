import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TarotCard } from "./TarotCard";
import { RARITY_LABELS, getCardDescription, type Rarity } from "../lib/cards";
import type { SpreadCardResult } from "../lib/spread-pull";

function CardDetailOverlay({
  card,
  posLabel,
  onClose,
}: {
  card: SpreadCardResult;
  posLabel: string;
  onClose: () => void;
}) {
  const rarityLabel = RARITY_LABELS[card.rarityScore]?.toLowerCase();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.85)" }} />
      <motion.div
        className="relative z-10 flex flex-col items-center gap-5 w-full max-w-xs"
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 12 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="text-xs tracking-widest uppercase opacity-40"
          style={{ color: "var(--color-text-primary)" }}
        >
          {posLabel}
        </p>

        <div className="w-44 sm:w-52">
          <TarotCard
            card={card.card}
            rarityScore={card.rarityScore as Rarity}
            isReversed={card.isReversed}
            isRadiant={card.isRadiant}
            revealed={true}
            size="md"
          />
        </div>

        <div className="text-center space-y-2">
          <p
            className="text-xs tracking-widest uppercase"
            style={{ color: `var(--color-rarity-${rarityLabel})` }}
          >
            {RARITY_LABELS[card.rarityScore]}
            {card.isRadiant && " ✦"}
          </p>
          <p
            className="text-lg font-light"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
          >
            {card.card.name}
            {card.isReversed && (
              <span className="ml-2 text-sm opacity-50">(reversed)</span>
            )}
          </p>
          <p
            className="text-sm leading-relaxed opacity-70 max-w-[260px]"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
          >
            {getCardDescription(card.card, card.rarityScore, card.isReversed)}
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-2 text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-text-primary)" }}
        >
          close
        </button>
      </motion.div>
    </motion.div>
  );
}

function SpreadCardCell({
  card,
  posLabel,
  onSelect,
}: {
  card: SpreadCardResult;
  posLabel: string;
  onSelect: () => void;
}) {
  const rarityLabel = RARITY_LABELS[card.rarityScore]?.toLowerCase();
  return (
    <div className="flex flex-col items-center gap-3">
      <p
        className="text-xs tracking-widest uppercase opacity-40"
        style={{ color: "var(--color-text-primary)" }}
      >
        {posLabel}
      </p>
      <div className="cursor-pointer w-24 sm:w-28" onClick={onSelect}>
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
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
        >
          {card.card.name}
          {card.isReversed && (
            <span className="ml-1 text-xs opacity-50">(reversed)</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function SpreadSummaryGrid({
  cards,
  positions,
}: {
  cards: SpreadCardResult[];
  positions: { index: number; label: string }[];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const sorted = [...cards].sort((a, b) => a.position - b.position);
  const selectedCard = selected !== null ? sorted.find((c) => c.position === selected) ?? null : null;
  const selectedPosLabel = selected !== null ? (positions[selected]?.label ?? String(selected)) : "";

  const grid =
    sorted.length === 4 ? (
      // Losange (1-2-1) layout
      <div className="flex flex-col items-center gap-6">
        <SpreadCardCell
          card={sorted[0]}
          posLabel={positions[sorted[0].position]?.label ?? "0"}
          onSelect={() => setSelected(sorted[0].position)}
        />
        <div className="flex gap-8 sm:gap-12">
          <SpreadCardCell
            card={sorted[1]}
            posLabel={positions[sorted[1].position]?.label ?? "1"}
            onSelect={() => setSelected(sorted[1].position)}
          />
          <SpreadCardCell
            card={sorted[2]}
            posLabel={positions[sorted[2].position]?.label ?? "2"}
            onSelect={() => setSelected(sorted[2].position)}
          />
        </div>
        <SpreadCardCell
          card={sorted[3]}
          posLabel={positions[sorted[3].position]?.label ?? "3"}
          onSelect={() => setSelected(sorted[3].position)}
        />
      </div>
    ) : (
      // Fallback: 2-column grid
      <div className="grid grid-cols-2 gap-6 sm:gap-8">
        {sorted.map((card) => (
          <SpreadCardCell
            key={card.position}
            card={card}
            posLabel={positions[card.position]?.label ?? String(card.position)}
            onSelect={() => setSelected(card.position)}
          />
        ))}
      </div>
    );

  return (
    <>
      {grid}
      <AnimatePresence>
        {selectedCard && (
          <CardDetailOverlay
            card={selectedCard}
            posLabel={selectedPosLabel}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
