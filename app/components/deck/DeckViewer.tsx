// A physical-feeling deck preview: a stacked deck you page through by flinging
// the top card, with pointer-driven 3D tilt, a moving glare, and a flip to the
// card's back. Built on `motion` springs; honours prefers-reduced-motion.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useIsPresent,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";

export type ViewerCard = {
  key: string;
  label: string;
  front: ReactNode;
  back: ReactNode;
  caption?: string;
  /** Why this character or moment embodies the card; shown under the card. */
  reason?: string;
};

const STACK_DEPTH = 6; // cards visible under the top one
const THICKNESS = 3; // px: a card is a thin slab, not a plane
const SLICES = 4; // paper layers between front and back that form the visible edge
const EDGE = "#e4dac4"; // card-stock edge colour
const THROW_DISTANCE = 120; // px of drag that commits a throw
const THROW_VELOCITY = 650; // px/s of flick that commits a throw

const SETTLE = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as const;
type Nav = { nav: "next" | "prev" | "jump"; flung: boolean };

/**
 * Top-card entrances and exits. "next": the new card rises from the pile while
 * the old one flies off (keeping its own fling if it was thrown by hand).
 * "prev": the previous card returns from the discard side; the current one
 * fades as it drops back onto the pile. "jump": a quick settle in place.
 */
function topVariants(j: { rot: number; x: number; y: number }) {
  // The top card keeps its own slight hand-squared offset and tilt: it only
  // rises out of the pile, without a slow straightening animation.
  const rest = { ...pose(j, 0), scale: 1, opacity: 1 };
  return {
    enter: ({ nav }: Nav) =>
      nav === "next"
        ? { ...pose(j, 1), scale: 1, opacity: 1, transition: SETTLE }
        : nav === "prev"
          ? { x: -260, y: -20, z: 60, rotate: -12, scale: 1, opacity: 0, filter: "brightness(1)" }
          : { ...rest, scale: 0.96, opacity: 0 },
    center: { ...rest, transition: SETTLE },
    exit: ({ nav, flung }: Nav) =>
      nav === "next"
        ? flung
          ? { z: 160, opacity: 0, transition: { duration: 0.45, ease: "easeOut" as const } }
          : {
              x: -340,
              y: -40,
              z: 160,
              rotate: -16,
              opacity: 0,
              transition: { duration: 0.45, ease: "easeOut" as const },
            }
        : { opacity: 0, transition: { duration: 0.2 } },
  };
}

/** Where a card sits at a given depth in the pile (0 = top). */
function pose(j: { rot: number; x: number; y: number }, depth: number) {
  return {
    x: j.x,
    y: j.y + depth * 2,
    z: -depth * THICKNESS,
    rotate: j.rot,
    filter: `brightness(${1 - depth * 0.05})`,
  };
}

/** Deterministic small jitter per card so the stack looks hand-squared, not CSS-perfect. */
function jitter(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const r = (n: number) => (((h >>> n) & 0xff) / 255) * 2 - 1;
  return { rot: r(0) * 2.2, x: r(8) * 5, y: r(16) * 3 };
}

function TopCard({
  card,
  onThrow,
  reduced,
  flipped,
  setFlipped,
}: {
  card: ViewerCard;
  onThrow: () => void;
  reduced: boolean;
  flipped: boolean;
  setFlipped: (f: boolean) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateZ = useTransform(x, [-300, 0, 300], [-14, 0, 14]);

  // Pointer tilt (springs) + flip, combined on the inner element.
  const tiltX = useSpring(0, { stiffness: 220, damping: 22 });
  const tiltY = useSpring(0, { stiffness: 220, damping: 22 });
  const flip = useSpring(0, { stiffness: 140, damping: 18 });
  const rotateY = useTransform([flip, tiltY], ([f, t]: number[]) => f + t);
  // Lift the card off the pile by exactly how far its lowest edge would dip at
  // the current tilt/flip angle, so it never cuts through the cards beneath.
  const size = useRef({ w: 352, h: 528 });
  const lift = useTransform([tiltX, rotateY], ([rx, ry]: number[]) => {
    const rad = Math.PI / 180;
    const dip =
      (size.current.w / 2) * Math.abs(Math.sin(ry * rad)) +
      (size.current.h / 2) * Math.abs(Math.sin(rx * rad));
    return THICKNESS + dip + 6;
  });
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(30);
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 30 });
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.38), rgba(255,255,255,0) 55%)`;

  useEffect(() => {
    flip.set(flipped ? 180 : 0);
  }, [flipped, flip]);

  const dragged = useRef(false);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    tiltY.set((px - 0.5) * 22);
    tiltX.set(-(py - 0.5) * 18);
    glareX.set(px * 100);
    glareY.set(py * 100);
    glareOpacity.set(1);
  }
  function onPointerLeave() {
    tiltX.set(0);
    tiltY.set(0);
    glareOpacity.set(0);
  }

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      ref={(el) => {
        if (el) size.current = { w: el.offsetWidth, h: el.offsetHeight };
      }}
      style={{ x, y, rotateZ, zIndex: 50, transformStyle: "preserve-3d" }}
      drag={!reduced}
      dragElastic={0.6}
      dragMomentum={false}
      onDragStart={() => (dragged.current = true)}
      onDragEnd={(_, info) => {
        // A fling in any direction discards the top card, revealing the next one underneath.
        const dist = Math.hypot(info.offset.x, info.offset.y);
        const speed = Math.hypot(info.velocity.x, info.velocity.y);
        if (dist > THROW_DISTANCE || speed > THROW_VELOCITY) {
          const w = window.innerWidth;
          const ux = (info.offset.x || info.velocity.x || 1) / (dist || 1);
          const uy = info.offset.y / (dist || 1);
          animate(x, Math.sign(ux) * Math.max(w * 0.9, Math.abs(ux) * w), {
            type: "spring",
            stiffness: 120,
            damping: 20,
            velocity: info.velocity.x,
          });
          animate(y, uy * w * 0.6 + info.velocity.y * 0.1, {
            type: "spring",
            stiffness: 120,
            damping: 20,
            velocity: info.velocity.y,
          });
          onThrow(); // the next card takes over now; this one finishes its flight while exiting
        } else {
          animate(x, 0, { type: "spring", stiffness: 380, damping: 26 });
          animate(y, 0, { type: "spring", stiffness: 380, damping: 26 });
        }
        setTimeout(() => (dragged.current = false), 0);
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={() => {
        if (!dragged.current) setFlipped(!flipped);
      }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ z: lift, rotateX: tiltX, rotateY, transformStyle: "preserve-3d" }}
      >
        {/* Card stock between the faces: visible as an edge when the card tilts or flips. */}
        {Array.from({ length: SLICES - 1 }, (_, k) => (
          <div
            key={k}
            aria-hidden
            className="absolute inset-0 rounded-[2.5%]"
            style={{
              background: EDGE,
              transform: `translateZ(${THICKNESS / 2 - ((k + 1) * THICKNESS) / SLICES}px)`,
            }}
          />
        ))}
        <div
          className="absolute inset-0 overflow-hidden rounded-[2.5%] shadow-2xl"
          style={{ backfaceVisibility: "hidden", transform: `translateZ(${THICKNESS / 2}px)` }}
        >
          {card.front}
          <motion.div
            className="pointer-events-none absolute inset-0 mix-blend-overlay"
            style={{ background: glare, opacity: glareOpacity }}
          />
        </div>
        <div
          className="absolute inset-0 overflow-hidden rounded-[2.5%] shadow-2xl"
          style={{
            backfaceVisibility: "hidden",
            transform: `translateZ(${-THICKNESS / 2}px) rotateY(180deg)`,
          }}
        >
          {card.back}
          <motion.div
            className="pointer-events-none absolute inset-0 mix-blend-overlay"
            style={{ background: glare, opacity: glareOpacity }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Wrapper for the top card; once it starts leaving it stops catching the pointer, so the next card is live at once. */
function TopSlot({
  children,
  custom,
  variants,
}: {
  children: ReactNode;
  custom: Nav;
  variants?: Variants;
}) {
  const isPresent = useIsPresent();
  return (
    <motion.div
      className="absolute inset-0"
      style={{
        transformStyle: "preserve-3d",
        zIndex: isPresent ? 50 : 45,
        pointerEvents: isPresent ? "auto" : "none",
      }}
      custom={custom}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

export function DeckViewer({ cards }: { cards: ViewerCard[] }) {
  const reduced = !!useReducedMotion();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // Remount the top card on change so its drag position resets cleanly.
  const [throwKey, setThrowKey] = useState(0);
  // How the top card changed: rises from the pile (next), returns from the
  // discard side (prev), or settles in place (jump from the thumbnail strip).
  const [nav, setNav] = useState<"next" | "prev" | "jump">("next");
  // Whether the card leaving was flung by hand (it keeps its own flight) or sent by a button/key.
  const [flung, setFlung] = useState(false);

  const go = useCallback(
    (to: number, byHand = false) => {
      const next = Math.max(0, Math.min(cards.length - 1, to));
      if (next === index) return;
      setNav(
        next === index + 1 || (index === cards.length - 1 && next === 0)
          ? "next"
          : next === index - 1
            ? "prev"
            : "jump"
      );
      setIndex(next);
      setFlipped(false);
      setThrowKey((k) => k + 1);
      setFlung(byHand);
    },
    [cards.length, index]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") go(index + 1 < cards.length ? index + 1 : 0);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(cards.length - 1);
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else return;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, cards.length]);

  const jitters = useMemo(() => cards.map((c) => jitter(c.key)), [cards]);
  if (cards.length === 0) return null;
  const top = cards[index];
  const remaining = cards.length - index - 1;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-16">
        <div className="flex flex-col items-center gap-6">
          <div
            className="relative"
            style={{ width: "min(22rem, 72vw)", aspectRatio: "1024 / 1536", perspective: 1400 }}
          >
            {/* The stage tilts back slightly so the pile's thickness shows at its bottom edge. */}
            <div
              className="absolute inset-0"
              style={{
                transformStyle: "preserve-3d",
                transform: reduced ? undefined : "rotateX(12deg)",
              }}
            >
              {/* The rest of the deck, face up, stacked in Z under the top card and squared roughly by hand.
              Cards keep their identity across page turns, so they spring up a level instead of jumping. */}
              {Array.from({ length: Math.min(STACK_DEPTH, remaining) }, (_, i) => {
                const depth = Math.min(STACK_DEPTH, remaining) - i;
                const j = jitters[index + depth] ?? { rot: 0, x: 0, y: 0 };
                return (
                  <motion.div
                    key={cards[index + depth].key}
                    className="absolute inset-0 overflow-hidden rounded-[2.5%]"
                    initial={reduced ? false : { ...pose(j, depth + 1), opacity: 0 }}
                    animate={{ ...pose(j, depth), opacity: 1 }}
                    transition={SETTLE}
                    style={{
                      boxShadow: `0 ${THICKNESS}px 0 ${EDGE}, 0 ${THICKNESS + 1}px 0 rgba(0,0,0,0.35), 0 10px 24px rgba(0,0,0,0.25)`,
                    }}
                    aria-hidden
                  >
                    {cards[index + depth].front}
                  </motion.div>
                );
              })}
              <AnimatePresence initial={false} custom={{ nav, flung: flung }}>
                <TopSlot
                  key={`${top.key}-${throwKey}`}
                  custom={{ nav, flung }}
                  variants={
                    reduced ? undefined : topVariants(jitters[index] ?? { rot: 0, x: 0, y: 0 })
                  }
                >
                  <TopCard
                    card={top}
                    onThrow={() => go(index + 1 < cards.length ? index + 1 : 0, true)}
                    reduced={reduced}
                    flipped={flipped}
                    setFlipped={setFlipped}
                  />
                </TopSlot>
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-1 text-center">
            <p className="font-serif text-xl text-primary">{top.label}</p>
            <p className="type-caption">
              {index + 1} / {cards.length}
              {top.caption ? ` · ${top.caption}` : ""}
            </p>
            <div className="flex justify-center gap-4 pt-1 text-xs uppercase tracking-widest">
              <button
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                disabled={index === 0}
                onClick={() => go(index - 1)}
              >
                ← Previous
              </button>
              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={() => go(index + 1 < cards.length ? index + 1 : 0)}
              >
                {remaining === 0 ? "Restack ↺" : "Next →"}
              </button>
            </div>
          </div>
        </div>
        {/* Why this card: its own panel, beside the deck on wide screens. */}
        <aside className="w-full max-w-md lg:w-80 lg:shrink-0" aria-live="polite">
          {top.reason ? (
            <motion.div
              key={top.key}
              initial={reduced ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: reduced ? 0 : 0.12 }}
              className="space-y-4 border-l border-border pl-5"
            >
              {top.reason.split(/\n\s*\n/).map((para, i, all) => (
                <div key={i} className="space-y-1">
                  {all.length > 1 && (
                    <p className="type-ghost">{i === 0 ? "In the tarot" : "In this deck"}</p>
                  )}
                  <p
                    className={`type-body-serif text-pretty ${i === 0 && all.length > 1 ? "text-muted-foreground" : ""}`}
                  >
                    {para}
                  </p>
                </div>
              ))}
            </motion.div>
          ) : null}
        </aside>
      </div>

      <div
        className="flex max-w-full gap-1.5 overflow-x-auto px-2 pb-2"
        role="tablist"
        aria-label="Cards"
      >
        {cards.map((c, i) => (
          <button
            key={c.key}
            role="tab"
            aria-selected={i === index}
            aria-label={c.label}
            onClick={() => go(i)}
            className={`w-10 shrink-0 overflow-hidden rounded-sm transition ${i === index ? "ring-2 ring-ring" : "opacity-60 hover:opacity-100"}`}
          >
            {c.front}
          </button>
        ))}
      </div>
    </div>
  );
}
