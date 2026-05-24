import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TarotCard } from "./TarotCard";
import { RARITY_LABELS, getCardDescription, type Rarity } from "../lib/cards";
import type { SpreadCardResult } from "../lib/spread-pull";

function SpreadCardCell({
  card,
  posLabel,
  expanded,
  onToggle,
}: {
  card: SpreadCardResult;
  posLabel: string;
  expanded: boolean;
  onToggle: () => void;
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
      <div className="cursor-pointer w-24 sm:w-28" onClick={onToggle}>
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
      <AnimatePresence>
        {expanded && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="text-xs leading-relaxed text-center opacity-70 overflow-hidden max-w-[120px]"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
          >
            {getCardDescription(card.card, card.rarityScore, card.isReversed)}
          </motion.p>
        )}
      </AnimatePresence>
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
  const [expanded, setExpanded] = useState<number | null>(null);
  const sorted = [...cards].sort((a, b) => a.position - b.position);

  function toggle(pos: number) {
    setExpanded((prev) => (prev === pos ? null : pos));
  }

  // Losange (1-2-1) layout for 4-card spreads
  if (sorted.length === 4) {
    return (
      <div className="flex flex-col items-center gap-6">
        <SpreadCardCell
          card={sorted[0]}
          posLabel={positions[sorted[0].position]?.label ?? "0"}
          expanded={expanded === sorted[0].position}
          onToggle={() => toggle(sorted[0].position)}
        />
        <div className="flex gap-8 sm:gap-12">
          <SpreadCardCell
            card={sorted[1]}
            posLabel={positions[sorted[1].position]?.label ?? "1"}
            expanded={expanded === sorted[1].position}
            onToggle={() => toggle(sorted[1].position)}
          />
          <SpreadCardCell
            card={sorted[2]}
            posLabel={positions[sorted[2].position]?.label ?? "2"}
            expanded={expanded === sorted[2].position}
            onToggle={() => toggle(sorted[2].position)}
          />
        </div>
        <SpreadCardCell
          card={sorted[3]}
          posLabel={positions[sorted[3].position]?.label ?? "3"}
          expanded={expanded === sorted[3].position}
          onToggle={() => toggle(sorted[3].position)}
        />
      </div>
    );
  }

  // Fallback: 2-column grid for other spread sizes
  return (
    <div className="grid grid-cols-2 gap-6 sm:gap-8">
      {sorted.map((card) => {
        const posLabel = positions[card.position]?.label ?? String(card.position);
        return (
          <SpreadCardCell
            key={card.position}
            card={card}
            posLabel={posLabel}
            expanded={expanded === card.position}
            onToggle={() => toggle(card.position)}
          />
        );
      })}
    </div>
  );
}
