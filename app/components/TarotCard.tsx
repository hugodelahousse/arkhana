import { memo, useRef, useCallback } from "react";
import { motion, useSpring } from "motion/react";
import type { MotionStyle } from "motion/react";
import { cardImageUrl } from "../lib/cardImages";
import { RARITY_LABELS } from "../lib/cards";
import type { CardDefinition, Rarity } from "../lib/cards";
import { useOrientationEffect } from "../lib/orientation";
import { useHoldReveal } from "../lib/useHoldReveal";
import "./TarotCard.css";

export interface TarotCardProps {
  card: CardDefinition;
  rarityScore: Rarity;
  isReversed: boolean;
  isRadiant: boolean;
  revealed: boolean;
  onReveal?: () => void;
  size?: "sm" | "md" | "lg";
  showHint?: boolean;
}

function useCardTilt(ref: React.RefObject<HTMLDivElement | null>) {
  const rotateX = useSpring(0, { stiffness: 300, damping: 30 });
  const rotateY = useSpring(0, { stiffness: 300, damping: 30 });
  const orientationActiveRef = useRef(false);

  useOrientationEffect((nx, ny) => {
    orientationActiveRef.current = true;
    rotateX.set(-ny * 15);
    rotateY.set(nx * 15);
  });

  const onTap = useCallback(() => {
    if (orientationActiveRef.current) return;
    const DevOrientation = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof DevOrientation.requestPermission !== "function") return;
    DevOrientation.requestPermission().then((state) => {
      if (state === "granted") {
        orientationActiveRef.current = true;
      }
    });
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const nx = ((e.clientX - left) / width) * 2 - 1;
    const ny = ((e.clientY - top) / height) * 2 - 1;
    rotateX.set(-ny * 15);
    rotateY.set(nx * 15);
    ref.current.style.setProperty("--ratio-x", String((nx + 1) / 2));
    ref.current.style.setProperty("--ratio-y", String((ny + 1) / 2));
    ref.current.style.setProperty("--glow-x",  String((e.clientX - left) / width));
    ref.current.style.setProperty("--glow-y",  String((e.clientY - top)  / height));
    ref.current.style.setProperty(
      "--pointer-from-center",
      String(Math.min(1, Math.hypot(nx, ny) / Math.SQRT2))
    );
  }, [ref, rotateX, rotateY]);

  const onMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    ref.current?.style.setProperty("--ratio-x", "0.5");
    ref.current?.style.setProperty("--ratio-y", "0.5");
    ref.current?.style.setProperty("--glow-x",  "0.5");
    ref.current?.style.setProperty("--glow-y",  "0.5");
    ref.current?.style.setProperty("--pointer-from-center", "0");
  }, [ref, rotateX, rotateY]);

  return {
    style: { rotateX, rotateY } as MotionStyle,
    onMouseMove,
    onMouseLeave,
    onTap,
  };
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
}: TarotCardProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const tilt = useCardTilt(sceneRef);
  const rarityLabel = RARITY_LABELS[rarityScore]?.toLowerCase() ?? "mundane";

  const hold = useHoldReveal(!revealed ? onReveal : undefined, sceneRef);

  return (
    <div
      ref={sceneRef}
      className="card-scene"
      data-size={size}
      data-rarity={rarityScore}
      data-revealed={revealed || undefined}
      data-reversed={isReversed || undefined}
      data-radiant={isRadiant || undefined}
      style={{ "--rarity-color": `var(--color-rarity-${rarityLabel})` } as React.CSSProperties}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={() => { tilt.onMouseLeave(); if (!revealed) hold.cancel(); }}
      onMouseDown={!revealed ? hold.start : undefined}
      onMouseUp={!revealed ? hold.cancel : undefined}
      onTouchStart={!revealed ? (e) => { e.preventDefault(); tilt.onTap(); hold.start(); } : undefined}
      onTouchEnd={!revealed ? hold.cancel : undefined}
      onTouchCancel={!revealed ? hold.cancel : undefined}
      onClick={() => tilt.onTap()}
      onKeyDown={!revealed ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onReveal?.(); } } : undefined}
      role={!revealed ? "button" : undefined}
      tabIndex={!revealed ? 0 : undefined}
      aria-label={revealed ? card.name : "Unrevealed tarot card, hold to reveal"}
    >
      <motion.div className="card-tilt" style={tilt.style}>
        <div className="card-flipper">
          <div className="card-face card-back">
            <div className="card-back-art" />
            <span className="card-back-sigil" aria-hidden="true">✦</span>
          </div>

          <div className="card-face card-front">
            <img
              src={cardImageUrl(card.id)}
              alt={card.name}
              loading="eager"
              draggable={false}
            />
            <div className="card-shine" />
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
