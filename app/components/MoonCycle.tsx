import { memo, useId } from "react";

interface MoonCycleProps {
  currentStreak: number;
  size?: "sm" | "md" | "lg";
}

const SEGMENTS = 28;
const GAP_DEG = 3;

const SIZE = {
  sm: { total: 120, radius: 46, thickness: 7,  numSize: 20, labelSize: 7 },
  md: { total: 160, radius: 62, thickness: 10, numSize: 28, labelSize: 8 },
  lg: { total: 280, radius: 110, thickness: 18, numSize: 52, labelSize: 12 },
} as const;

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Closed donut-wedge path: outer arc forward + inner arc backward.
// This gives each segment two opposing curved edges so the curvature is
// clearly visible regardless of how small the arc angle is.
function segmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  index: number
): string {
  const arcDeg = 360 / SEGMENTS - GAP_DEG;
  const startDeg = (index * 360) / SEGMENTS - 90;
  const endDeg = startDeg + arcDeg;
  const largeArc = arcDeg > 180 ? 1 : 0;

  const os = polarToCartesian(cx, cy, outerR, startDeg);
  const oe = polarToCartesian(cx, cy, outerR, endDeg);
  const ie = polarToCartesian(cx, cy, innerR, endDeg);
  const is_ = polarToCartesian(cx, cy, innerR, startDeg);

  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${is_.x} ${is_.y}`,
    "Z",
  ].join(" ");
}

const QUARTER_LABELS: Record<number, string> = {
  0: "🌑",
  7: "🌓",
  14: "🌕",
  21: "🌗",
};

export const MoonCycle = memo(function MoonCycle({
  currentStreak,
  size = "sm",
}: MoonCycleProps) {
  const filterId = useId().replace(/:/g, "");
  const cfg = SIZE[size];
  const cx = cfg.total / 2;
  const cy = cfg.total / 2;

  const outerR = cfg.radius + cfg.thickness / 2;
  const innerR = cfg.radius - cfg.thickness / 2;

  const cyclePos = currentStreak === 0 ? 0 : ((currentStreak - 1) % SEGMENTS) + 1;
  const filledCount = cyclePos;
  const isComplete = currentStreak > 0 && currentStreak % SEGMENTS === 0;
  const cycleNumber = currentStreak === 0 ? 0 : Math.ceil(currentStreak / SEGMENTS);

  const activeColor = isComplete
    ? "var(--color-rarity-primordial)"
    : "var(--color-rarity-mystic)";

  const markerRadius = outerR + (size === "lg" ? 14 : size === "md" ? 10 : 7);

  return (
    <svg
      width={cfg.total}
      height={cfg.total}
      viewBox={`0 0 ${cfg.total} ${cfg.total}`}
      aria-label={`Moon cycle: day ${cyclePos} of 28, streak ${currentStreak}`}
      role="img"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={`glow-${filterId}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`glow-soft-${filterId}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {Array.from({ length: SEGMENTS }, (_, i) => {
        const filled = i < filledCount;
        const isCurrent = i === filledCount - 1 && currentStreak > 0;

        return (
          <path
            key={i}
            d={segmentPath(cx, cy, outerR, innerR, i)}
            fill={
              isCurrent
                ? activeColor
                : filled
                ? isComplete
                  ? "var(--color-rarity-primordial)"
                  : "var(--color-text-secondary)"
                : "var(--color-border-default)"
            }
            opacity={filled ? (isCurrent ? 1 : 0.5) : 0.35}
            filter={isCurrent ? `url(#glow-${filterId})` : undefined}
          />
        );
      })}

      {size !== "sm" &&
        Object.entries(QUARTER_LABELS).map(([dayStr, emoji]) => {
          const day = Number(dayStr);
          const deg = (day * 360) / SEGMENTS - 90;
          const pos = polarToCartesian(cx, cy, markerRadius, deg);
          const fontSize = size === "lg" ? 12 : 9;
          return (
            <text
              key={day}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={fontSize}
              opacity={0.35}
            >
              {emoji}
            </text>
          );
        })}

      <text
        x={cx}
        y={cy - cfg.numSize * 0.25}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={cfg.numSize}
        fontFamily="var(--font-serif)"
        fill="var(--color-text-secondary)"
        opacity={currentStreak > 0 ? 0.95 : 0.25}
        filter={currentStreak > 0 ? `url(#glow-soft-${filterId})` : undefined}
      >
        {currentStreak > 0 ? currentStreak : "—"}
      </text>
      <text
        x={cx}
        y={cy + cfg.numSize * 0.55}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={cfg.labelSize}
        fontFamily="var(--primitive-font-sans, system-ui)"
        fill="var(--color-text-secondary)"
        opacity={0.35}
        letterSpacing="2.5"
      >
        {currentStreak === 1 ? "DAY" : "DAYS"}
      </text>

      {size !== "sm" && cycleNumber > 0 && (
        <text
          x={cx}
          y={cy + cfg.numSize * 1.1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={cfg.labelSize * 0.9}
          fontFamily="var(--primitive-font-sans, system-ui)"
          fill="var(--color-text-secondary)"
          opacity={0.2}
          letterSpacing="1.5"
        >
          CYCLE {cycleNumber}
        </text>
      )}
    </svg>
  );
});
