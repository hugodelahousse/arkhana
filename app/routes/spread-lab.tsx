import { useState } from "react";
import { CARDS, CARD_BY_ID, RARITY_LABELS, getCardDescription } from "../lib/cards";
import { TarotCard } from "../components/TarotCard";
import { useAutoReveal } from "../lib/useAutoReveal";
import { motion, AnimatePresence } from "motion/react";
import { SPREAD_REGISTRY } from "../lib/spreads";
import type { SpreadCardResult } from "../lib/spread-pull";
import type { Rarity } from "../lib/cards";

export function meta() {
  return [{ title: "Spread Lab — Arkhana" }];
}

type RarityScore = 1 | 2 | 3 | 4 | 5;

type SpreadPhase =
  | { phase: "idle" }
  | { phase: "contemplating"; position: number }
  | { phase: "revealing"; position: number }
  | { phase: "summary" };

interface PositionConfig {
  cardId: number;
  rarityScore: RarityScore;
  isRadiant: boolean;
  isReversed: boolean;
}

function PositionCardReveal({
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
    <div className="text-center space-y-8 flex flex-col items-center">
      <div className="space-y-2">
        <p
          className="text-xs tracking-widest uppercase opacity-30"
          style={{ color: "var(--color-text-primary)" }}
        >
          {position + 1} of {totalPositions}
        </p>
        <h2
          className="text-3xl font-light tracking-wide"
          style={{ color: "var(--color-rarity-mystic)", fontFamily: "var(--font-serif)" }}
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
            transition={{ duration: 0.5 }}
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
              className="text-2xl font-light"
              style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
            >
              {card.card.name}
            </h3>
            <p
              className="text-sm leading-relaxed opacity-80"
              style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
            >
              {getCardDescription(card.card, card.rarityScore, card.isReversed)}
            </p>
            <button
              onClick={onAdvance}
              className="px-6 py-2 text-[0.7rem] tracking-[0.15em] uppercase cursor-pointer border bg-transparent hover:opacity-80 transition-opacity"
              style={{ color: "var(--color-text-primary)", borderColor: "var(--color-rarity-mystic)" }}
            >
              {isLast ? "See your reading" : `Continue to ${nextLabel}`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SpreadLab() {
  const spreadIds = Object.keys(SPREAD_REGISTRY);
  const [spreadId, setSpreadId] = useState(spreadIds[0] ?? "sunday-weekly");
  const spreadDef = SPREAD_REGISTRY[spreadId];
  const positions = spreadDef?.positions ?? [];

  const defaultConfig = (): PositionConfig => ({ cardId: 0, rarityScore: 3, isRadiant: false, isReversed: false });
  const [configs, setConfigs] = useState<PositionConfig[]>(() =>
    Array.from({ length: 4 }, defaultConfig)
  );

  const [phase, setPhase] = useState<SpreadPhase>({ phase: "idle" });
  const [runKey, setRunKey] = useState(0);

  function handleSpreadChange(id: string) {
    setSpreadId(id);
    const newLen = SPREAD_REGISTRY[id]?.positions.length ?? 4;
    setConfigs(Array.from({ length: newLen }, defaultConfig));
    setPhase({ phase: "idle" });
    setRunKey((k) => k + 1);
  }

  function updateConfig(index: number, patch: Partial<PositionConfig>) {
    setConfigs((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function startCeremony() {
    setRunKey((k) => k + 1);
    setPhase({ phase: "contemplating", position: 0 });
  }

  function advanceFromRevealing(pos: number) {
    if (pos < positions.length - 1) {
      setPhase({ phase: "contemplating", position: pos + 1 });
    } else {
      setPhase({ phase: "summary" });
    }
  }

  const currentCards: SpreadCardResult[] = configs.slice(0, positions.length).map((cfg, i) => ({
    position: i,
    positionKey: positions[i]?.label.toLowerCase() ?? String(i),
    userCardId: i,
    cardId: cfg.cardId,
    card: CARD_BY_ID[cfg.cardId],
    rarityScore: cfg.rarityScore as Rarity,
    isRadiant: cfg.isRadiant,
    isReversed: cfg.isReversed,
  }));

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
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}
          >
            Spread Lab
          </h1>
          <p
            className="text-xs tracking-widest uppercase opacity-40"
            style={{ color: "var(--color-text-primary)" }}
          >
            Test spread ceremonies &amp; layouts
          </p>
        </div>

        {/* Spread selector */}
        <div
          className="p-5 space-y-5 border"
          style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-bg-elevated)" }}
        >
          <div className="flex flex-wrap gap-5 items-end">
            <label
              className="flex flex-col gap-1 text-[0.65rem] tracking-[0.12em] uppercase"
              style={{ color: "var(--color-text-muted)" }}
            >
              Spread type
              <select
                value={spreadId}
                onChange={(e) => handleSpreadChange(e.target.value)}
                className="min-w-[220px] px-[0.6rem] py-[0.4rem] text-[0.8rem] tracking-[0.05em] border outline-none cursor-pointer"
                style={{
                  background: "var(--color-bg-elevated)",
                  color: "var(--color-text-primary)",
                  borderColor: "var(--color-border-default)",
                  fontFamily: "var(--font-serif)",
                }}
              >
                {spreadIds.map((id) => (
                  <option key={id} value={id}>
                    {SPREAD_REGISTRY[id]?.name ?? id}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={startCeremony}
              className="px-6 py-2 text-[0.7rem] tracking-[0.15em] uppercase cursor-pointer border bg-transparent hover:opacity-80 transition-opacity"
              style={{ color: "var(--color-text-primary)", borderColor: "var(--color-rarity-mystic)", fontFamily: "var(--font-serif)" }}
            >
              Run ceremony
            </button>
            {phase.phase !== "idle" && (
              <button
                onClick={() => { setPhase({ phase: "idle" }); setRunKey((k) => k + 1); }}
                className="px-4 py-2 text-[0.7rem] tracking-[0.15em] uppercase cursor-pointer border bg-transparent opacity-50 hover:opacity-80 transition-opacity"
                style={{ color: "var(--color-text-primary)", borderColor: "var(--color-border-default)" }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Per-position card controls */}
          <div className="space-y-4">
            {positions.map((pos, i) => {
              const cfg = configs[i] ?? defaultConfig();
              return (
                <div
                  key={pos.index}
                  className="flex flex-wrap gap-4 items-end p-3 border"
                  style={{ background: "var(--color-bg-base)", borderColor: "var(--color-bg-elevated)" }}
                >
                  <span
                    className="text-xs tracking-widest uppercase w-14 pt-5"
                    style={{ color: "var(--color-rarity-mystic)" }}
                  >
                    {pos.label}
                  </span>
                  <label
                    className="flex flex-col gap-1 text-[0.65rem] tracking-[0.12em] uppercase"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Card
                    <select
                      value={cfg.cardId}
                      onChange={(e) => updateConfig(i, { cardId: Number(e.target.value) })}
                      className="min-w-[160px] px-[0.6rem] py-[0.4rem] text-[0.8rem] tracking-[0.05em] border outline-none cursor-pointer"
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
                  <label
                    className="flex flex-col gap-1 text-[0.65rem] tracking-[0.12em] uppercase"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Rarity
                    <select
                      value={cfg.rarityScore}
                      onChange={(e) => updateConfig(i, { rarityScore: Number(e.target.value) as RarityScore })}
                      className="px-[0.6rem] py-[0.4rem] text-[0.8rem] tracking-[0.05em] border outline-none cursor-pointer"
                      style={{
                        background: "var(--color-bg-elevated)",
                        color: "var(--color-text-primary)",
                        borderColor: "var(--color-border-default)",
                        fontFamily: "var(--font-serif)",
                      }}
                    >
                      {([1, 2, 3, 4, 5] as RarityScore[]).map((r) => (
                        <option key={r} value={r}>{r} — {RARITY_LABELS[r]}</option>
                      ))}
                    </select>
                  </label>
                  <label
                    className="flex flex-row items-center gap-2 text-[0.65rem] tracking-[0.12em] uppercase cursor-pointer"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <input
                      type="checkbox"
                      checked={cfg.isRadiant}
                      onChange={(e) => updateConfig(i, { isRadiant: e.target.checked })}
                      className="w-[0.9rem] h-[0.9rem]"
                      style={{ accentColor: "var(--color-border-default)" }}
                    />
                    Radiant ✦
                  </label>
                  <label
                    className="flex flex-row items-center gap-2 text-[0.65rem] tracking-[0.12em] uppercase cursor-pointer"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <input
                      type="checkbox"
                      checked={cfg.isReversed}
                      onChange={(e) => updateConfig(i, { isReversed: e.target.checked })}
                      className="w-[0.9rem] h-[0.9rem]"
                      style={{ accentColor: "var(--color-border-default)" }}
                    />
                    Reversed
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview pane */}
        <div
          className="p-6 min-h-96 border"
          style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-bg-elevated)" }}
        >
          <AnimatePresence mode="wait">
            {phase.phase === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-6 py-8"
              >
                <p
                  className="text-sm opacity-40"
                  style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                >
                  Configure cards above, then click "Run ceremony" to preview the spread flow.
                </p>
                {spreadDef && (
                  <>
                    <p
                      className="text-lg font-light"
                      style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                    >
                      {spreadDef.name}
                    </p>
                    <p
                      className="text-sm opacity-60 max-w-sm mx-auto"
                      style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                    >
                      {spreadDef.description}
                    </p>
                  </>
                )}
              </motion.div>
            )}

            {phase.phase === "contemplating" && (
              <motion.div
                key={`contemplate-${runKey}-${phase.position}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-6 py-4"
              >
                <h2
                  className="text-4xl font-light"
                  style={{ color: "var(--color-rarity-mystic)", fontFamily: "var(--font-serif)" }}
                >
                  {positions[phase.position]?.label}
                </h2>
                <p
                  className="text-sm italic opacity-70 max-w-xs mx-auto"
                  style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                >
                  {positions[phase.position]?.contemplationPrompt}
                </p>
                <button
                  onClick={() => setPhase({ phase: "revealing", position: phase.position })}
                  className="px-6 py-2 text-[0.7rem] tracking-[0.15em] uppercase cursor-pointer border bg-transparent hover:opacity-80 transition-opacity"
                  style={{ color: "var(--color-text-primary)", borderColor: "var(--color-rarity-mystic)" }}
                >
                  I am ready
                </button>
              </motion.div>
            )}

            {phase.phase === "revealing" && (
              <PositionCardReveal
                key={`reveal-${runKey}-${phase.position}`}
                card={currentCards[phase.position]}
                positionLabel={positions[phase.position]?.label ?? ""}
                position={phase.position}
                totalPositions={positions.length}
                isLast={phase.position === positions.length - 1}
                nextLabel={positions[phase.position + 1]?.label}
                onAdvance={() => advanceFromRevealing(phase.position)}
              />
            )}

            {phase.phase === "summary" && (
              <motion.div
                key={`summary-${runKey}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <p
                  className="text-center text-xs tracking-widest uppercase opacity-40"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {spreadDef?.subtitle}
                </p>
                <div className="grid grid-cols-2 gap-6">
                  {currentCards.map((card) => {
                    const pos = positions[card.position];
                    const rl = RARITY_LABELS[card.rarityScore]?.toLowerCase();
                    return (
                      <div key={card.position} className="flex flex-col items-center gap-3">
                        <p
                          className="text-xs tracking-widest uppercase opacity-40"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {pos?.label}
                        </p>
                        <TarotCard
                          card={card.card}
                          rarityScore={card.rarityScore as Rarity}
                          isReversed={card.isReversed}
                          isRadiant={card.isRadiant}
                          revealed={true}
                          size="sm"
                        />
                        <div className="text-center space-y-1">
                          <p
                            className="text-xs tracking-widest uppercase"
                            style={{ color: `var(--color-rarity-${rl})` }}
                          >
                            {RARITY_LABELS[card.rarityScore]}{card.isRadiant && " ✦"}
                          </p>
                          <p
                            className="text-sm font-light"
                            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
                          >
                            {card.card.name}
                            {card.isReversed && <span className="ml-1 text-xs opacity-50">(reversed)</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
