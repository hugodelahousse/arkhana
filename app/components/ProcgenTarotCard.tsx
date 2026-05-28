import { memo, useRef } from "react";
import { motion } from "motion/react";
import { useCardMotion, DEFAULT_MOTION_CONFIG } from "../lib/useCardMotion";
import type { CardMotionConfig } from "../lib/useCardMotion";
import { useHoldReveal } from "../lib/useHoldReveal";
import "./TarotCard.css";
import "./ProcgenTarotCard.css";

export interface ProcgenTarotCardProps {
  svg: string;
  name: string;
  revealed: boolean;
  onReveal?: () => void;
  size?: "sm" | "md" | "lg";
  showHint?: boolean;
  parallax?: boolean;
  parallaxAmount?: number;
  motionConfig?: Partial<CardMotionConfig>;
}

export const ProcgenTarotCard = memo(function ProcgenTarotCard({
  svg,
  name,
  revealed,
  onReveal,
  size = "md",
  showHint = false,
  parallax = true,
  parallaxAmount = 8,
  motionConfig,
}: ProcgenTarotCardProps) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const config = { ...DEFAULT_MOTION_CONFIG, ...motionConfig, maxRotateYDeg: revealed ? undefined : 89 };
  const hold = useHoldReveal(!revealed ? onReveal : undefined, sceneRef);
  const tilt = useCardMotion(sceneRef, config, !revealed ? hold.cancel : undefined);

  return (
    <div
      ref={sceneRef}
      className="card-scene"
      data-size={size}
      data-rarity={parallax ? 4 : 2}
      data-revealed={revealed || undefined}
      data-procgen=""
      style={{
        "--procgen-parallax": `${parallaxAmount}px`,
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
      aria-label={revealed ? name : "Unrevealed tarot card, hold to reveal"}
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
            <div
              className="procgen-svg"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
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
