import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { TarotCard } from "./TarotCard";
import { RARITY_LABELS, type Rarity } from "../lib/cards";
import type { SpreadCardResult } from "../lib/spread-pull";
import { useT, useLocale } from "../i18n/provider";
import { getLocalizedCardName, getLocalizedCardDescription, getLocalizedRarityLabel } from "../i18n/cards";

function CardDetailOverlay({
  card,
  posLabel,
  onClose,
}: {
  card: SpreadCardResult;
  posLabel: string;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const rarityLabel = RARITY_LABELS[card.rarityScore]?.toLowerCase();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto dark">
      <motion.div
        className="fixed inset-0 bg-black/85"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <div
        className="relative z-10 flex flex-col items-center justify-center px-6 min-h-dvh"
        style={{
          paddingTop: "max(2.5rem, env(safe-area-inset-top))",
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
        }}
        onClick={onClose}
      >
      <div
        className="flex flex-col items-center gap-5 w-full max-w-xs"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="type-ghost"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,.9)" }}
        >
          {posLabel}
        </motion.p>

        <motion.div layoutId={`spread-card-${card.position}`} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
          <TarotCard
            card={card.card}
            rarityScore={card.rarityScore as Rarity}
            isReversed={card.isReversed}
            isRadiant={card.isRadiant}
            revealed={true}
            size="md"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="text-center space-y-2"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,.9), 0 0 2px rgba(0,0,0,.7)" }}
        >
          <p
            className="text-xs tracking-widest uppercase"
            style={{ color: `var(--color-rarity-${rarityLabel})` }}
          >
            {getLocalizedRarityLabel(card.rarityScore as Rarity, t)}
            {card.isRadiant && " ✦"}
          </p>
          <p className="text-lg text-primary font-serif">
            {getLocalizedCardName(card.card, locale)}
            {card.isReversed && (
              <span className="ml-2 text-sm text-faint-foreground">{t("moonCycle.reversed")}</span>
            )}
          </p>
          <p className="type-body-serif max-w-[260px]">
            {getLocalizedCardDescription(card.card, card.rarityScore as Rarity, card.isReversed, locale)}
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          onClick={onClose}
          className="mt-2 text-xs tracking-widest uppercase hover:opacity-90 transition-opacity text-primary"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,.9)" }}
        >
          {t("moonCycle.close")}
        </motion.button>
      </div>
      </div>
    </div>,
    document.body
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
  const t = useT();
  const locale = useLocale();
  const rarityLabel = RARITY_LABELS[card.rarityScore]?.toLowerCase();
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="type-ghost">
        {posLabel}
      </p>
      <motion.div
        layoutId={`spread-card-${card.position}`}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="cursor-pointer w-24 sm:w-28"
        onClick={onSelect}
      >
        <TarotCard
          card={card.card}
          rarityScore={card.rarityScore as Rarity}
          isReversed={card.isReversed}
          isRadiant={card.isRadiant}
          revealed={true}
          size="sm"
        />
      </motion.div>
      <div className="text-center space-y-1">
        <p
          className="text-xs tracking-widest uppercase"
          style={{ color: `var(--color-rarity-${rarityLabel})` }}
        >
          {RARITY_LABELS[card.rarityScore]}
          {card.isRadiant && " ✦"}
        </p>
        <p className="type-body-serif font-light">
          {getLocalizedCardName(card.card, locale)}
          {card.isReversed && (
            <span className="ml-1 text-xs text-faint-foreground">{t("moonCycle.reversed")}</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function SpreadSummaryGrid({
  cards,
  positions: _positions,
  spreadId = "sunday-weekly",
}: {
  cards: SpreadCardResult[];
  positions: { index: number; label: string }[];
  spreadId?: string;
}) {
  const t = useT();
  const [selected, setSelected] = useState<number | null>(null);
  const sorted = [...cards].sort((a, b) => a.position - b.position);
  const selectedCard = selected !== null ? sorted.find((c) => c.position === selected) ?? null : null;
  const selectedPosLabel = selected !== null
    ? t(`spreads.${spreadId}.positions.${selected}.label`)
    : "";

  function posLabel(i: number): string {
    return t(`spreads.${spreadId}.positions.${i}.label`);
  }

  const grid =
    sorted.length === 4 ? (
      // Losange (1-2-1) layout
      <div className="flex flex-col items-center gap-6">
        <SpreadCardCell
          card={sorted[0]}
          posLabel={posLabel(sorted[0].position)}
          onSelect={() => setSelected(sorted[0].position)}
        />
        <div className="flex gap-8 sm:gap-12">
          <SpreadCardCell
            card={sorted[1]}
            posLabel={posLabel(sorted[1].position)}
            onSelect={() => setSelected(sorted[1].position)}
          />
          <SpreadCardCell
            card={sorted[2]}
            posLabel={posLabel(sorted[2].position)}
            onSelect={() => setSelected(sorted[2].position)}
          />
        </div>
        <SpreadCardCell
          card={sorted[3]}
          posLabel={posLabel(sorted[3].position)}
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
            posLabel={posLabel(card.position)}
            onSelect={() => setSelected(card.position)}
          />
        ))}
      </div>
    );

  return (
    <LayoutGroup>
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
    </LayoutGroup>
  );
}
