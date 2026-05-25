import { memo } from "react";

interface MoonCycleProps {
  currentStreak: number;
  cycleStartDate: string | null;
}

const SEGMENTS = 28;
const RADIUS = 44;
const CENTER = 56;
const STROKE = 4;
const GAP_DEG = 4; // gap between segments in degrees

function segmentPath(index: number): string {
  const arcDeg = 360 / SEGMENTS - GAP_DEG;
  const startDeg = (index * 360) / SEGMENTS - 90; // -90 so segment 0 is at top
  const endDeg = startDeg + arcDeg;
  const start = polarToCartesian(CENTER, CENTER, RADIUS, startDeg);
  const end = polarToCartesian(CENTER, CENTER, RADIUS, endDeg);
  const largeArc = arcDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export const MoonCycle = memo(function MoonCycle({ currentStreak }: MoonCycleProps) {
  const cyclePosition = currentStreak === 0 ? 0 : ((currentStreak - 1) % SEGMENTS) + 1; // 1–28
  const filledCount = cyclePosition;
  const isCompleteCycle = currentStreak > 0 && currentStreak % SEGMENTS === 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={CENTER * 2}
        height={CENTER * 2}
        viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`}
        aria-label={`Moon cycle: day ${cyclePosition} of 28`}
        role="img"
      >
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const filled = i < filledCount;
          const isCurrent = i === filledCount - 1 && currentStreak > 0;

          return (
            <path
              key={i}
              d={segmentPath(i)}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              stroke={
                isCurrent
                  ? "var(--color-rarity-mystic)"
                  : filled
                  ? isCompleteCycle
                    ? "var(--color-rarity-primordial)"
                    : "var(--color-text-secondary)"
                  : "var(--color-bg-elevated)"
              }
              opacity={filled ? (isCurrent ? 1 : 0.6) : 0.25}
            />
          );
        })}

        {/* Center label */}
        <text
          x={CENTER}
          y={CENTER - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="18"
          fontFamily="var(--font-serif)"
          fill="var(--color-text-secondary)"
          opacity={currentStreak > 0 ? 0.9 : 0.3}
        >
          {currentStreak > 0 ? currentStreak : "—"}
        </text>
        <text
          x={CENTER}
          y={CENTER + 11}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="7"
          fontFamily="var(--primitive-font-sans, system-ui)"
          fill="var(--color-text-secondary)"
          opacity={0.4}
          letterSpacing="2"
        >
          {currentStreak === 1 ? "DAY" : "DAYS"}
        </text>
      </svg>
    </div>
  );
});
