import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Moon, MoonStars, Sparkle } from "@phosphor-icons/react";
import type { Milestone } from "../lib/streak.js";
import { useT } from "../i18n/provider";

interface StreakMilestoneProps {
  milestone: Milestone;
  onDismiss: () => void;
}

const MILESTONE_ICON: Record<Milestone, React.ReactNode> = {
  7: <Moon weight="thin" size={56} />,
  28: <MoonStars weight="thin" size={56} />,
  100: <Sparkle weight="thin" size={56} />,
};

export function StreakMilestone({ milestone, onDismiss }: StreakMilestoneProps) {
  const t = useT();
  const [visible, setVisible] = useState(true);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onDismiss, 600);
  }, [onDismiss]);

  useEffect(() => {
    const timer = setTimeout(dismiss, 8000);
    return () => clearTimeout(timer);
  }, [dismiss]);

  const heading = t(`milestone.${milestone}.heading`);
  const body = t(`milestone.${milestone}.body`);

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
                color: "var(--accent)",
                filter: "drop-shadow(0 0 18px var(--accent))",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {MILESTONE_ICON[milestone]}
            </div>

            <div className="space-y-3">
              <p className="type-label">
                {t("milestone.label", { days: milestone })}
              </p>
              <h2
                className="text-3xl font-light tracking-wide font-serif"
                style={{ color: "var(--accent-text)" }}
              >
                {heading}
              </h2>
            </div>

            <div className="w-12 h-px mx-auto opacity-20 bg-border" />

            <p className="type-body-serif text-base">
              {body}
            </p>

            <button
              onClick={dismiss}
              className="mt-4 text-xs tracking-widest uppercase text-faint-foreground hover:text-foreground transition-colors"
            >
              {t("milestone.continue")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
