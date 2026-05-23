import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useMotionValue } from "motion/react";
import { cn } from "../lib/utils";
import { cardImageUrl } from "../lib/cardImages";
import { RARITY_LABELS } from "../lib/cards";
import type { CardDefinition } from "../lib/cards";
import "./TarotCard.css";

interface TarotCardProps {
  card: CardDefinition;
  rarityScore: 1 | 2 | 3 | 4 | 5;
  isReversed: boolean;
  isRadiant: boolean;
  revealed: boolean;
  onReveal?: () => void;
  size?: "sm" | "md" | "lg";
  showHint?: boolean;
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
  const flipperRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  const rotateX = useSpring(0, { stiffness: 300, damping: 30 });
  const rotateY = useSpring(0, { stiffness: 300, damping: 30 });
  const ratioX = useMotionValue(0.5);
  const ratioY = useMotionValue(0.5);

  const rarityLabel = RARITY_LABELS[rarityScore]?.toLowerCase() ?? "mundane";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Subscribe foil CSS vars to motion values
  useEffect(() => {
    if (!flipperRef.current) return;
    const el = flipperRef.current;
    const unsubX = ratioX.on("change", (v) => el.style.setProperty("--ratio-x", String(v)));
    const unsubY = ratioY.on("change", (v) => el.style.setProperty("--ratio-y", String(v)));
    return () => { unsubX(); unsubY(); };
  }, [ratioX, ratioY]);

  // Trigger flip animation when revealed prop goes true
  useEffect(() => {
    if (revealed && !isFlipping) {
      setIsFlipping(true);
      const t = setTimeout(() => setIsFlipping(false), 900);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!mounted || isFlipping) return;
    const rect = sceneRef.current!.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    rotateX.set(-ny * 15);
    rotateY.set(nx * 15);
    ratioX.set((nx + 1) / 2);
    ratioY.set((ny + 1) / 2);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
    ratioX.set(0.5);
    ratioY.set(0.5);
    setIsHovered(false);
  }

  function handleMouseEnter() {
    setIsHovered(true);
  }

  function handleClick() {
    if (!revealed && onReveal) onReveal();
  }

  return (
    <div
      ref={sceneRef}
      className={cn("card-scene", `size-${size}`)}
      style={{ position: "relative" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
    >
      <motion.div
        className="card-tilt"
        style={mounted && !isFlipping ? { rotateX, rotateY } : undefined}
      >
        <div
          ref={flipperRef}
          className={cn("card-flipper", revealed && "is-revealed")}
          style={{
            ["--rarity-color" as string]: `var(--color-rarity-${rarityLabel})`,
          }}
        >
          {/* Back face */}
          <div className="card-face card-back">
            <div className="card-back-art" />
            <span className="card-back-sigil">✦</span>
          </div>

          {/* Front face */}
          <div className={cn("card-face card-front", isReversed && "is-reversed")}>
            <img
              src={cardImageUrl(card.id)}
              alt={card.name}
              loading="eager"
              draggable={false}
            />
            <div
              className={cn(
                "card-foil",
                `foil-rarity-${rarityScore}`,
                isHovered && revealed && "is-hovered"
              )}
            />
            {isRadiant && <div className="card-radiant-border" />}
          </div>
        </div>
      </motion.div>

      {showHint && !revealed && (
        <div className="card-reveal-hint">tap to reveal</div>
      )}
    </div>
  );
}
