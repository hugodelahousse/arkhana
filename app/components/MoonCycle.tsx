import { memo, useId } from "react";

interface MoonCycleProps {
  currentStreak: number;
  todayLunarIndex: number;    // 0-based position today in the current lunar month
  lunarMonthLength: number;   // 29 or 30
  pulledDayIndices: number[]; // which days in this lunar month the user pulled
  size?: "sm" | "md" | "lg";
}

const GAP_DEG = 2.5;

const SIZE = {
  sm: { total: 120, radius: 46, thickness: 3,  numSize: 20, labelSize: 7 },
  md: { total: 160, radius: 62, thickness: 5,  numSize: 28, labelSize: 8 },
  lg: { total: 280, radius: 110, thickness: 9, numSize: 52, labelSize: 12 },
} as const;

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  index: number,
  total: number
): string {
  const arcDeg = 360 / total - GAP_DEG;
  const startDeg = (index * 360) / total - 90;
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

export const MoonCycle = memo(function MoonCycle({
  currentStreak,
  todayLunarIndex,
  lunarMonthLength,
  pulledDayIndices,
  size = "sm",
}: MoonCycleProps) {
  const filterId = useId().replace(/:/g, "");
  const cfg = SIZE[size];
  const cx = cfg.total / 2;
  const cy = cfg.total / 2;

  const outerR = cfg.radius + cfg.thickness / 2;
  const innerR = cfg.radius - cfg.thickness / 2;

  const pulledSet = new Set(pulledDayIndices);
  const todayPulled = pulledSet.has(todayLunarIndex);

  return (
    <svg
      width={cfg.total}
      height={cfg.total}
      viewBox={`0 0 ${cfg.total} ${cfg.total}`}
      aria-label={`Lunar cycle: day ${todayLunarIndex + 1} of ${lunarMonthLength}, streak ${currentStreak}`}
      role="img"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id={`glow-${filterId}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`glow-soft-${filterId}`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {Array.from({ length: lunarMonthLength }, (_, i) => {
        const pulled = pulledSet.has(i);
        const isToday = i === todayLunarIndex;
        const isFuture = i > todayLunarIndex;

        let fill: string;
        let opacity: number;
        let filter: string | undefined;

        if (isToday && todayPulled) {
          fill = "var(--color-rarity-mystic)";
          opacity = 1;
          filter = `url(#glow-${filterId})`;
        } else if (isToday) {
          // Today, not yet pulled — soft ring highlight
          fill = "var(--color-text-secondary)";
          opacity = 0.45;
          filter = `url(#glow-${filterId})`;
        } else if (pulled) {
          fill = "var(--color-text-secondary)";
          opacity = 0.5;
        } else if (isFuture) {
          fill = "var(--color-border-default)";
          opacity = 0.18;
        } else {
          // Past, not pulled
          fill = "var(--color-border-default)";
          opacity = 0.28;
        }

        return (
          <path
            key={i}
            d={segmentPath(cx, cy, outerR, innerR, i, lunarMonthLength)}
            fill={fill}
            opacity={opacity}
            filter={filter}
          />
        );
      })}

      {/* Center: streak count */}
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
    </svg>
  );
});
