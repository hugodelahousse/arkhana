import { memo, useRef } from "react";
import { motion } from "motion/react";
import { cardImageUrl, cardMaskUrl, cardNameMaskUrl, cardTopMaskUrl, hasTopMask } from "../lib/cardImages";
import { RARITY_LABELS } from "../lib/cards";
import type { CardDefinition, Rarity } from "../lib/cards";
import { useCardMotion, DEFAULT_MOTION_CONFIG } from "../lib/useCardMotion";
import type { CardMotionConfig } from "../lib/useCardMotion";
import { useHoldReveal } from "../lib/useHoldReveal";
import "./TarotCard.css";

export type { CardMotionConfig };
export { DEFAULT_MOTION_CONFIG };

export interface TarotCardProps {
  card: CardDefinition;
  rarityScore: Rarity;
  isReversed: boolean;
  isRadiant: boolean;
  revealed: boolean;
  onReveal?: () => void;
  size?: "sm" | "md" | "lg";
  showHint?: boolean;
  motionConfig?: Partial<CardMotionConfig>;
}

export const TarotCard = memo(function TarotCard({
  card,
  rarityScore,
  isReversed,
  isRadiant,
  revealed,
  onReveal,
  size = "md",
  showHint = false,
  motionConfig,
}: TarotCardProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const config = { ...DEFAULT_MOTION_CONFIG, ...motionConfig, maxRotateYDeg: revealed ? undefined : 89 };
  const hold = useHoldReveal(!revealed ? onReveal : undefined, sceneRef);
  const tilt = useCardMotion(sceneRef, config, !revealed ? hold.cancel : undefined);

  const rarityLabel = RARITY_LABELS[rarityScore]?.toLowerCase() ?? "mundane";
  const hasSubjectMask = rarityScore >= 3;
  const hasParallax = rarityScore >= 4;
  const isMajor = card.arcana === "major";
  const cardHasTopMask = isMajor && hasTopMask(card.id);
  const imgSrc = cardImageUrl(card.id);

  return (
    <div
      ref={sceneRef}
      className="card-scene"
      data-size={size}
      data-rarity={rarityScore}
      data-revealed={revealed || undefined}
      data-reversed={isReversed || undefined}
      data-radiant={isRadiant || undefined}
      style={{
        "--rarity-color": `var(--color-rarity-${rarityLabel})`,
        ...(hasSubjectMask ? {
          "--mask-url": `url(${cardMaskUrl(card.id)})`,
          "--name-mask-url": `url(${cardNameMaskUrl(card.id)})`,
          ...(cardHasTopMask ? { "--top-mask-url": `url(${cardTopMaskUrl(card.id)})` } : {}),
        } : {}),
      } as React.CSSProperties}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={() => { tilt.onMouseLeave(); if (!revealed) hold.cancel(); }}
      onMouseDown={!revealed ? hold.start : undefined}
      onMouseUp={!revealed ? hold.cancel : undefined}
      onTouchStart={(e) => {
        if (!revealed) { e.preventDefault(); hold.start(); }
        tilt.onTouchStart(e);
      }}
      onTouchMove={tilt.onTouchMove}
      onTouchEnd={() => {
        if (!revealed) hold.cancel();
        tilt.onTouchEnd();
      }}
      onTouchCancel={() => {
        if (!revealed) hold.cancel();
        tilt.onTouchEnd();
      }}
      onKeyDown={!revealed ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onReveal?.(); } } : undefined}
      role={!revealed ? "button" : undefined}
      tabIndex={!revealed ? 0 : undefined}
      aria-label={revealed ? card.name : "Unrevealed tarot card, hold to reveal"}
    >
      <motion.div className="card-tilt" style={tilt.style}>
        <div className="card-edge card-edge-l" aria-hidden="true" />
        <div className="card-edge card-edge-r" aria-hidden="true" />
        <div className="card-flipper">

          <div className="card-face card-back">
            <div className="card-back-art" />
            <span className="card-back-sigil" aria-hidden="true">✦</span>
          </div>

          <div className="card-face card-front">
            <img
              src={imgSrc}
              alt={card.name}
              loading="eager"
              draggable={false}
            />
            {hasParallax && (
              <>
                <img
                  className="card-subject"
                  src={imgSrc}
                  alt=""
                  loading="eager"
                  draggable={false}
                  aria-hidden="true"
                  style={{ maskImage: `url(${cardMaskUrl(card.id)})`, WebkitMaskImage: `url(${cardMaskUrl(card.id)})`, maskSize: "cover", WebkitMaskSize: "cover" } as React.CSSProperties}
                />
                {rarityScore >= 5 && (
                  <>
                    <img
                      className="card-text-layer card-name-layer"
                      src={imgSrc} alt="" draggable={false} aria-hidden="true"
                      style={{ maskImage: `url(${cardNameMaskUrl(card.id)})`, WebkitMaskImage: `url(${cardNameMaskUrl(card.id)})`, maskSize: "cover", WebkitMaskSize: "cover" } as React.CSSProperties}
                    />
                    {cardHasTopMask && (
                      <img
                        className="card-text-layer card-top-layer"
                        src={imgSrc} alt="" draggable={false} aria-hidden="true"
                        style={{ maskImage: `url(${cardTopMaskUrl(card.id)})`, WebkitMaskImage: `url(${cardTopMaskUrl(card.id)})`, maskSize: "cover", WebkitMaskSize: "cover" } as React.CSSProperties}
                      />
                    )}
                  </>
                )}
              </>
            )}
            <div className="card-shine" />
            {hasSubjectMask && <div className="card-name-foil" aria-hidden="true" />}
            {hasSubjectMask && cardHasTopMask && <div className="card-top-foil" aria-hidden="true" />}
            <div className="card-glare" />
            {isRadiant && <div className="card-radiant-border" aria-hidden="true" />}
          </div>
        </div>
      </motion.div>

      {showHint && !revealed && (
        <div className="card-reveal-hint" aria-hidden="true">hold to reveal</div>
      )}
    </div>
  );
});
