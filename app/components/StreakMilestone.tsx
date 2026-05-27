import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Moon, MoonStars, Sparkle } from "@phosphor-icons/react";
import type { Milestone } from "../lib/streak.js";

interface StreakMilestoneProps {
  milestone: Milestone;
  onDismiss: () => void;
}

const MILESTONE_COPY: Record<Milestone, { heading: string; body: string }> = {
  7: {
    heading: "Seven Days",
    body: "A week of listening. You've established a practice.",
  },
  28: {
    heading: "A Full Cycle",
    body: "Twenty-eight nights. The moon has turned once. The cards have marked you.",
  },
  100: {
    heading: "One Hundred Days",
    body: "The arkhive remembers every card you've drawn. So does the universe.",
  },
};

const MILESTONE_ICON: Record<Milestone, React.ReactNode> = {
  7: <Moon weight="thin" size={56} />,
  28: <MoonStars weight="thin" size={56} />,
  100: <Sparkle weight="thin" size={56} />,
};

export function StreakMilestone({ milestone, onDismiss }: StreakMilestoneProps) {
  const [visible, setVisible] = useState(true);
  const copy = MILESTONE_COPY[milestone];

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 600);
  }, [onDismiss]);

  useEffect(() => {
    const t = setTimeout(dismiss, 8000);
    return () => clearTimeout(t);
  }, [dismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center space-y-6 max-w-xs px-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              aria-hidden="true"
              style={{
                color: "var(--color-rarity-mystic)",
                filter: "drop-shadow(0 0 18px var(--color-rarity-mystic))",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {MILESTONE_ICON[milestone]}
            </div>

            <div className="space-y-3">
              <p className="text-xs tracking-widest uppercase opacity-40 text-muted-foreground">
                {milestone}-day milestone
              </p>
              <h2
                className="text-3xl font-light tracking-wide font-serif"
                style={{ color: "var(--color-rarity-mystic)" }}
              >
                {copy.heading}
              </h2>
            </div>

            <div className="w-12 h-px mx-auto opacity-20 bg-border" />

            <p className="text-base leading-relaxed opacity-80 text-muted-foreground font-serif">
              {copy.body}
            </p>

            <button
              onClick={dismiss}
              className="mt-4 text-xs tracking-widest uppercase opacity-30 hover:opacity-60 transition-opacity text-muted-foreground"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
