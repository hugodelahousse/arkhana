import { memo, useEffect, useRef, useCallback } from "react";
import { motion, useSpring, useMotionValueEvent } from "motion/react";
import type { MotionStyle } from "motion/react";
import { cardImageUrl } from "../lib/cardImages";
import { RARITY_LABELS } from "../lib/cards";
import type { CardDefinition, Rarity } from "../lib/cards";
import { useOrientationEffect } from "../lib/orientation";
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
  const ratioX = useSpring(0.5, { stiffness: 80, damping: 20 });
  const ratioY = useSpring(0.5, { stiffness: 80, damping: 20 });
  const orientationActiveRef = useRef(false);

  useMotionValueEvent(ratioX, "change", (v) =>
    ref.current?.style.setProperty("--ratio-x", String(v))
  );
  useMotionValueEvent(ratioY, "change", (v) =>
    ref.current?.style.setProperty("--ratio-y", String(v))
  );

  useOrientationEffect((nx, ny) => {
    orientationActiveRef.current = true;
    rotateX.set(-ny * 15);
    rotateY.set(nx * 15);
    ratioX.set((nx + 1) / 2);
    ratioY.set((ny + 1) / 2);
    // Project the world-space light position onto this card's bounding box so
    // each card gets a unique glow angle rather than all sharing the same value.
    if (ref.current) {
      const { left, top, width, height } = ref.current.getBoundingClientRect();
      const lightX = window.innerWidth  * (nx + 1) / 2;
      const lightY = window.innerHeight * (ny + 1) / 2;
      ref.current.style.setProperty("--glow-x", String((lightX - left) / width));
      ref.current.style.setProperty("--glow-y", String((lightY - top)  / height));
    }
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
    ratioX.set((nx + 1) / 2);
    ratioY.set((ny + 1) / 2);
    // For mouse, cursor position within the card is the light source.
    ref.current.style.setProperty("--glow-x", String((e.clientX - left) / width));
    ref.current.style.setProperty("--glow-y", String((e.clientY - top)  / height));
    ref.current.style.setProperty(
      "--pointer-from-center",
      String(Math.min(1, Math.hypot(nx, ny) / Math.SQRT2))
    );
  }, [ref, rotateX, rotateY, ratioX, ratioY]);

  const onMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    ratioX.set(0.5);
    ratioY.set(0.5);
    ref.current?.style.setProperty("--glow-x", "0.5");
    ref.current?.style.setProperty("--glow-y", "0.5");
    ref.current?.style.setProperty("--pointer-from-center", "0");
  }, [ref, rotateX, rotateY, ratioX, ratioY]);

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
      onMouseLeave={tilt.onMouseLeave}
      onClick={() => { tilt.onTap(); if (!revealed) onReveal?.(); }}
      onKeyDown={!revealed ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tilt.onTap(); onReveal?.(); } } : undefined}
      role={!revealed ? "button" : undefined}
      tabIndex={!revealed ? 0 : undefined}
      aria-label={revealed ? card.name : "Unrevealed tarot card, press to reveal"}
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
        <div className="card-reveal-hint" aria-hidden="true">tap to reveal</div>
      )}
    </div>
  );
});
