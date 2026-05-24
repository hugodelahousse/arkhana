import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TarotCard } from "./TarotCard";
import { RARITY_LABELS, getCardDescription, type Rarity } from "../lib/cards";
import type { SpreadCardResult } from "../lib/spread-pull";

export function SpreadSummaryGrid({
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
