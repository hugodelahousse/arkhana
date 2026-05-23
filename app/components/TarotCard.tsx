import { useEffect, useRef } from "react";
import { motion, useSpring, useMotionValue, useMotionValueEvent } from "motion/react";
import type { MotionStyle } from "motion/react";
import { cardImageUrl } from "../lib/cardImages";
import { RARITY_LABELS } from "../lib/cards";
import type { CardDefinition } from "../lib/cards";
import "./TarotCard.css";

export interface TarotCardProps {
  card: CardDefinition;
  rarityScore: 1 | 2 | 3 | 4 | 5;
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
  const ratioX = useMotionValue(0.5);
  const ratioY = useMotionValue(0.5);

  // Drive foil CSS vars from motion values — no state, no render cycle
  useMotionValueEvent(ratioX, "change", (v) =>
    ref.current?.style.setProperty("--ratio-x", String(v))
  );
  useMotionValueEvent(ratioY, "change", (v) =>
    ref.current?.style.setProperty("--ratio-y", String(v))
  );

  // Accelerometer support for mobile — same springs, different input source
  useEffect(() => {
    function onOrientation(e: DeviceOrientationEvent) {
      if (e.gamma === null || e.beta === null) return;
      // gamma: left/right (-90–90°), beta: front/back (-180–180°)
      // 45° of physical tilt → full effect; subtract natural holding angle from beta
      const nx = Math.max(-1, Math.min(1, e.gamma / 45));
      const ny = Math.max(-1, Math.min(1, (e.beta - 45) / 45));
      rotateX.set(-ny * 15);
      rotateY.set(nx * 15);
      ratioX.set((nx + 1) / 2);
      ratioY.set((ny + 1) / 2);
    }

    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, []); // stable motion values — intentionally empty deps

  function onMouseMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const nx = ((e.clientX - left) / width) * 2 - 1;
    const ny = ((e.clientY - top) / height) * 2 - 1;
    rotateX.set(-ny * 15);
    rotateY.set(nx * 15);
    ratioX.set((nx + 1) / 2);
    ratioY.set((ny + 1) / 2);
  }

  function onMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
    ratioX.set(0.5);
    ratioY.set(0.5);
  }

  return {
    style: { rotateX, rotateY } as MotionStyle,
    onMouseMove,
    onMouseLeave,
  };
}

export function TarotCard({
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
      onClick={!revealed ? onReveal : undefined}
      role={!revealed ? "button" : undefined}
      aria-label={revealed ? card.name : "Unrevealed tarot card"}
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
            <div className="card-foil" />
            {isRadiant && <div className="card-radiant-border" aria-hidden="true" />}
          </div>
        </div>
      </motion.div>

      {showHint && !revealed && (
        <div className="card-reveal-hint" aria-hidden="true">tap to reveal</div>
      )}
    </div>
  );
}
