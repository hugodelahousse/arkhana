// A single card shown full screen as a thin slab you can turn by hand: drag to spin it,
// tap to flip it, with a highlight that slides across the face as it turns.
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionTemplate, useReducedMotion, useSpring, useTransform } from "motion/react";
import { X } from "@phosphor-icons/react";

const THICKNESS = 4; // px of card stock between the faces
const SLICES = 4;
const RAD = Math.PI / 180;
const TAP_SLOP = 6; // px of movement under which a press counts as a tap

export function CardLightbox({
  front,
  back,
  edge,
  label,
  onClose,
}: {
  front: ReactNode;
  back: ReactNode;
  /** Colour of the card stock seen edge-on. */
  edge: string;
  label: string;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const rotateX = useSpring(0, { stiffness: 180, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 180, damping: 20 });

  // The highlight is where a light above the viewer would catch the tilted face.
  const shineX = useTransform(rotateY, (v) => 50 - Math.sin(v * RAD) * 75);
  const shineY = useTransform(rotateX, (v) => 35 + v * 1.4);
  const shineOpacity = useTransform([rotateX, rotateY], ([x, y]: number[]) =>
    Math.min(0.85, 0.12 + Math.abs(Math.sin(y * RAD)) * 0.9 + Math.abs(x) / 50)
  );
  const glare = useMotionTemplate`radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.55), rgba(255,255,255,0) 50%)`;
  const press = useRef<{ x: number; y: number; baseY: number; moved: boolean } | null>(null);

  // Escape closes; the page behind stays put while the card is up.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const settle = (flip: boolean) => {
    // Come to rest on whichever face is nearest, or the other one after a tap.
    const face = Math.round(rotateY.get() / 180) + (flip ? 1 : 0);
    rotateY.set(face * 180);
    rotateX.set(0);
  };

  const face = (content: ReactNode, turned: boolean) => (
    <div
      className="absolute inset-0 overflow-hidden rounded-[2.5%] shadow-2xl"
      style={{
        backfaceVisibility: "hidden",
        transform: `translateZ(${turned ? -THICKNESS / 2 : THICKNESS / 2}px)${turned ? " rotateY(180deg)" : ""}`,
      }}
    >
      {content}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{ background: glare, opacity: shineOpacity }}
      />
    </div>
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-background/95 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        autoFocus
        aria-label="Close"
        className="absolute right-3 top-3 flex size-11 items-center justify-center text-muted-foreground hover:text-primary"
        onClick={onClose}
      >
        <X size={22} aria-hidden />
      </button>
      <div style={{ perspective: 1400, width: "min(86vw, 52dvh)", aspectRatio: "2 / 3" }}>
        <motion.div
          className="relative h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          initial={reduced ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            press.current = { x: e.clientX, y: e.clientY, baseY: rotateY.get(), moved: false };
          }}
          onPointerMove={(e) => {
            const p = press.current;
            if (p) {
              const dx = e.clientX - p.x;
              const dy = e.clientY - p.y;
              if (Math.hypot(dx, dy) > TAP_SLOP) p.moved = true;
              rotateY.set(p.baseY + dx * 0.6);
              rotateX.set(Math.max(-40, Math.min(40, -dy * 0.35)));
            } else if (e.pointerType === "mouse" && !reduced) {
              // No button held: lean towards the cursor around the resting face.
              const r = e.currentTarget.getBoundingClientRect();
              const rest = Math.round(rotateY.get() / 180) * 180;
              rotateY.set(rest + ((e.clientX - r.left) / r.width - 0.5) * 24);
              rotateX.set(-((e.clientY - r.top) / r.height - 0.5) * 20);
            }
          }}
          onPointerUp={() => {
            const tapped = !!press.current && !press.current.moved;
            press.current = null;
            settle(tapped);
          }}
          onPointerCancel={() => {
            press.current = null;
            settle(false);
          }}
          onPointerLeave={() => {
            if (!press.current) settle(false);
          }}
        >
          {Array.from({ length: SLICES - 1 }, (_, k) => (
            <div
              key={k}
              aria-hidden
              className="absolute inset-0 rounded-[2.5%]"
              style={{
                background: edge,
                transform: `translateZ(${THICKNESS / 2 - ((k + 1) * THICKNESS) / SLICES}px)`,
              }}
            />
          ))}
          {face(front, false)}
          {face(back, true)}
        </motion.div>
      </div>
      <p className="type-ghost text-center text-xs">Drag to turn · tap to flip</p>
    </div>,
    document.body
  );
}
