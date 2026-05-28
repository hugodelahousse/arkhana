import { memo, useRef } from "react";
import { motion } from "motion/react";
import { cardImageUrl, cardMaskUrl, cardNameMaskUrl, cardTopMaskUrl, hasTopMask, hasNameMask } from "../lib/cardImages";
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
  /** Override the card image URL (e.g. procgen PNG). */
  imageUrl?: string;
  /** Override the subject mask URL (e.g. procgen mask PNG). */
  maskUrl?: string;
  /** Procgen SVG string. When set, renders inline SVG instead of CDN image. */
  svgContent?: string;
  /** Parallax depth in px for procgen fg layer (default 8). */
  procgenParallax?: number;
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
  imageUrl,
  maskUrl: maskUrlProp,
  svgContent,
  procgenParallax = 8,
}: TarotCardProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const config = { ...DEFAULT_MOTION_CONFIG, ...motionConfig, maxRotateYDeg: revealed ? undefined : 89 };
  const hold = useHoldReveal(!revealed ? onReveal : undefined, sceneRef);
  const tilt = useCardMotion(sceneRef, config, !revealed ? hold.cancel : undefined);

  const rarityLabel = RARITY_LABELS[rarityScore]?.toLowerCase() ?? "mundane";
  const hasSubjectMask = rarityScore >= 3 || !!maskUrlProp;
  const hasParallax = rarityScore >= 4 || !!maskUrlProp;
  const hasTextLayers = rarityScore >= 5;
  const isMajor = card.arcana === "major";
  const cardHasTopMask = isMajor && hasTopMask(card.id);
  const cardHasNameMask = hasNameMask(card.id);
  const imgSrc = imageUrl ?? cardImageUrl(card.id);

  const baseImgMask = hasTextLayers && cardHasNameMask ? (() => {
    const masks = [
      ...(cardHasTopMask ? [`url(${cardTopMaskUrl(card.id)})`] : []),
      `url(${cardNameMaskUrl(card.id)})`,
      "linear-gradient(black, black)",
    ];
    const composites = [
      ...(cardHasTopMask ? ["subtract"] : []),
      "subtract",
    ];
    const webkitComposites = [
      ...(cardHasTopMask ? ["destination-out"] : []),
      "destination-out",
    ];
    return {
      maskImage: masks.join(", "),
      maskSize: "cover",
      maskComposite: composites.join(", "),
      WebkitMaskImage: masks.join(", "),
      WebkitMaskSize: "cover",
      WebkitMaskComposite: webkitComposites.join(", "),
    } as React.CSSProperties;
  })() : undefined;

  return (
    <div
      ref={sceneRef}
      className="card-scene"
      data-size={size}
      data-rarity={rarityScore}
      data-revealed={revealed || undefined}
      data-reversed={isReversed || undefined}
      data-radiant={isRadiant || undefined}
      data-procgen={svgContent || maskUrlProp ? "" : undefined}
      style={{
        "--rarity-color": `var(--color-rarity-${rarityLabel})`,
        ...((svgContent || maskUrlProp) ? { "--procgen-parallax": `${procgenParallax}px` } : {}),
        ...(hasSubjectMask ? {
          "--mask-url": maskUrlProp ? `url(${maskUrlProp})` : `url(${cardMaskUrl(card.id)})`,
          ...(!maskUrlProp && cardHasNameMask ? { "--name-mask-url": `url(${cardNameMaskUrl(card.id)})` } : {}),
          ...(!maskUrlProp && cardHasTopMask ? { "--top-mask-url": `url(${cardTopMaskUrl(card.id)})` } : {}),
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
        <div className="card-edge card-edge-t" aria-hidden="true" />
        <div className="card-edge card-edge-b" aria-hidden="true" />
        <div className="card-flipper">

          <div className="card-face card-back">
            <div className="card-back-art" />
            <span className="card-back-sigil" aria-hidden="true">✦</span>
          </div>

          <div className="card-face card-front">
            {svgContent ? (
              <div
                className="procgen-svg"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <>
                <img
                  src={imgSrc}
                  alt={card.name}
                  loading="eager"
                  draggable={false}
                  style={baseImgMask}
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
                      style={{ maskImage: `url(${maskUrlProp ?? cardMaskUrl(card.id)})`, WebkitMaskImage: `url(${maskUrlProp ?? cardMaskUrl(card.id)})`, maskSize: "cover", WebkitMaskSize: "cover" } as React.CSSProperties}
                    />
                    {rarityScore >= 5 && (
                      <>
                        {cardHasNameMask && (
                          <img
                            className="card-text-layer card-name-layer"
                            src={imgSrc} alt="" draggable={false} aria-hidden="true"
                            style={{ maskImage: `url(${cardNameMaskUrl(card.id)})`, WebkitMaskImage: `url(${cardNameMaskUrl(card.id)})`, maskSize: "cover", WebkitMaskSize: "cover" } as React.CSSProperties}
                          />
                        )}
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
                {hasSubjectMask && cardHasNameMask && <div className="card-name-foil" aria-hidden="true" />}
                {hasSubjectMask && cardHasTopMask && <div className="card-top-foil" aria-hidden="true" />}
              </>
            )}
            <div className="card-shine" />
            <div className="card-glare" />
          </div>
        </div>
      </motion.div>

      {showHint && !revealed && (
        <div className="card-reveal-hint" aria-hidden="true">hold to reveal</div>
      )}
    </div>
  );
});
