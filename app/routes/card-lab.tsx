import { useState } from "react";
import { CARDS, CARD_BY_ID, RARITY_LABELS, getCardDescription } from "../lib/cards";
import { TarotCard } from "../components/TarotCard";
import { useAutoReveal } from "../lib/useAutoReveal";
import { motion, AnimatePresence } from "motion/react";

export function meta() {
  return [{ title: "Card Lab — Arkhana" }];
}

type RarityScore = 1 | 2 | 3 | 4 | 5;

export default function CardLab() {
  const [cardId, setCardId] = useState(0);
  const [rarity, setRarity] = useState<RarityScore>(3);
  const [isRadiant, setIsRadiant] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [drawKey, setDrawKey] = useState(0);

  const [revealed, revealNow] = useAutoReveal(drawn, 800);

  const card = CARD_BY_ID[cardId];
  const rarityLabel = RARITY_LABELS[rarity]?.toLowerCase();

  function handleDraw() {
    setDrawn(false);
    setDrawKey((k) => k + 1);
    // Let the reset flush before triggering, so useAutoReveal sees the transition
    requestAnimationFrame(() => setDrawn(true));
  }

  function handleCardChange(newId: number) {
    setCardId(newId);
    setDrawn(false);
    setDrawKey((k) => k + 1);
  }

  return (
    <div
      className="min-h-screen p-8"
      style={{ background: "var(--color-bg-base)" }}
    >
      <div className="max-w-2xl mx-auto space-y-10">
        {/* Header */}
        <div className="space-y-1">
          <h1
            className="text-2xl font-light tracking-widest"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
          >
            Card Lab
          </h1>
          <p
            className="text-xs tracking-widest uppercase opacity-40"
            style={{ color: "var(--color-text-primary)" }}
          >
            Test animations, art &amp; effects
          </p>
        </div>

        {/* Controls */}
        <div
          className="flex flex-wrap gap-5 items-end p-5 border"
          style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-bg-elevated)" }}
        >
          {/* Card picker */}
          <label
            className="flex flex-col gap-1 text-[0.65rem] tracking-[0.12em] uppercase"
            style={{ color: "var(--color-text-primary)" }}
          >
            Card
            <select
              value={cardId}
              onChange={(e) => handleCardChange(Number(e.target.value))}
              className="min-w-[180px] px-[0.6rem] py-[0.4rem] text-[0.8rem] tracking-[0.05em] border outline-none cursor-pointer"
              style={{
                background: "var(--color-bg-elevated)",
                color: "var(--color-text-primary)",
                borderColor: "var(--color-border-default)",
                fontFamily: "var(--font-serif)",
              }}
            >
              {CARDS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}. {c.name}
                </option>
              ))}
            </select>
          </label>

          {/* Rarity */}
          <label
            className="flex flex-col gap-1 text-[0.65rem] tracking-[0.12em] uppercase"
            style={{ color: "var(--color-text-primary)" }}
          >
            Rarity
            <select
              value={rarity}
              onChange={(e) => setRarity(Number(e.target.value) as RarityScore)}
              className="px-[0.6rem] py-[0.4rem] text-[0.8rem] tracking-[0.05em] border outline-none cursor-pointer"
              style={{
                background: "var(--color-bg-elevated)",
                color: "var(--color-text-primary)",
                borderColor: "var(--color-border-default)",
                fontFamily: "var(--font-serif)",
              }}
            >
              {([1, 2, 3, 4, 5] as RarityScore[]).map((r) => (
                <option key={r} value={r}>
                  {r} — {RARITY_LABELS[r]}
                </option>
              ))}
            </select>
          </label>

          {/* Toggles */}
          <label
            className="flex flex-row items-center gap-2 text-[0.65rem] tracking-[0.12em] uppercase cursor-pointer"
            style={{ color: "var(--color-text-primary)" }}
          >
            <input
              type="checkbox"
              checked={isRadiant}
              onChange={(e) => setIsRadiant(e.target.checked)}
              className="w-[0.9rem] h-[0.9rem]"
              style={{ accentColor: "var(--color-border-default)" }}
            />
            Radiant ✦
          </label>

          <label
            className="flex flex-row items-center gap-2 text-[0.65rem] tracking-[0.12em] uppercase cursor-pointer"
            style={{ color: "var(--color-text-primary)" }}
          >
            <input
              type="checkbox"
              checked={isReversed}
              onChange={(e) => setIsReversed(e.target.checked)}
              className="w-[0.9rem] h-[0.9rem]"
              style={{ accentColor: "var(--color-border-default)" }}
            />
            Reversed
          </label>

          {/* Draw button */}
          <button
            onClick={handleDraw}
            className="px-6 py-2 text-[0.7rem] tracking-[0.15em] uppercase cursor-pointer border bg-transparent hover:opacity-90 transition-opacity"
            style={{
              color: "var(--color-text-primary)",
              borderColor: "var(--color-border-default)",
              fontFamily: "var(--font-serif)",
            }}
          >
            Draw
          </button>
        </div>

        {/* Card display */}
        <div className="flex flex-col items-center gap-8 pt-4 pb-12">
          <TarotCard
            key={drawKey}
            card={card}
            rarityScore={rarity}
            isReversed={isReversed}
            isRadiant={isRadiant}
            revealed={revealed}
            onReveal={revealNow}
            size="lg"
            showHint={!revealed}
          />

          {/* Description */}
          <AnimatePresence>
            {revealed && (
              <motion.div
                key={`desc-${drawKey}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="max-w-xs text-center space-y-3"
              >
                <p
                  className="text-xs tracking-widest uppercase"
                  style={{ color: `var(--color-rarity-${rarityLabel})` }}
                >
                  {RARITY_LABELS[rarity]}
                  {isRadiant && " ✦"}
                  {isReversed && " · Reversed"}
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-serif)",
                    opacity: 0.85,
                  }}
                >
                  {getCardDescription(card, rarity, isReversed)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
