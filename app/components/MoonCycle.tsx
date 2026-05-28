import { memo, useId } from "react";
import { moonPhaseIconPath } from "../lib/moonphase";

interface MoonCycleProps {
  currentStreak: number;
  todayLunarIndex: number;    // 0-based position today in the current lunar month
  lunarMonthLength: number;   // 29 or 30
  pulledDayIndices: number[]; // which days in this lunar month the user pulled
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: { total: 120, radius: 46, moonSize: 8, numSize: 20, labelSize: 7 },
  md: { total: 160, radius: 62, moonSize: 11, numSize: 28, labelSize: 8 },
  lg: { total: 280, radius: 110, moonSize: 17, numSize: 52, labelSize: 12 },
} as const;

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: Math.round((cx + r * Math.cos(rad)) * 1e4) / 1e4,
    y: Math.round((cy + r * Math.sin(rad)) * 1e4) / 1e4,
  };
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
          <feFlood floodColor="var(--accent)" result="color" />
          <feComposite in="color" in2="SourceAlpha" operator="in" result="colored" />
          <feGaussianBlur in="colored" stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {Array.from({ length: lunarMonthLength }, (_, i) => {
        const pulled = pulledSet.has(i);
        const isToday = i === todayLunarIndex;
        const isFuture = i > todayLunarIndex;
        const phase = i / lunarMonthLength;
        const litPath = moonPhaseIconPath(phase);
        const isNew = litPath === "new";
        const deg = (i * 360) / lunarMonthLength - 90;
        const pos = polarToCartesian(cx, cy, cfg.radius, deg);

        let color: string;
        let opacity: number;

        if (isToday && todayPulled) {
          color = "var(--accent)";
          opacity = 1;
        } else if (isToday) {
          // Today, not yet pulled — soft ring highlight
          color = "var(--muted-foreground)";
          opacity = 0.72;
        } else if (pulled) {
          color = "var(--muted-foreground)";
          opacity = 0.68;
        } else if (isFuture) {
          color = "var(--muted-foreground)";
          opacity = 0.26;
        } else {
          // Past, not pulled
          color = "var(--muted-foreground)";
          opacity = 0.38;
        }

        return (
          <g
            key={i}
            transform={`translate(${pos.x}, ${pos.y})`}
            color={color}
            opacity={opacity}
          >
            {isToday && (
              <circle
                r={cfg.moonSize * 0.76}
                fill="currentColor"
                opacity={todayPulled ? 0.24 : 0.14}
                filter={`url(#glow-${filterId})`}
              />
            )}
            <g
              transform={`translate(${-cfg.moonSize / 2}, ${-cfg.moonSize / 2}) scale(${
                cfg.moonSize / 100
              })`}
            >
              <circle
                cx={50}
                cy={50}
                r={45}
                fill="currentColor"
                stroke="currentColor"
                strokeWidth={5}
                opacity={0.2}
              />
              {litPath === "full" && (
                <circle cx={50} cy={50} r={45} fill="currentColor" />
              )}
              {litPath !== "new" && litPath !== "full" && (
                <path d={litPath} fill="currentColor" />
              )}
              <circle
                cx={50}
                cy={50}
                r={45}
                fill="none"
                stroke="currentColor"
                strokeWidth={5}
                opacity={isNew ? 0.55 : 1}
              />
            </g>
          </g>
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
        fill="var(--muted-foreground)"
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
        fontFamily="var(--font-sans, system-ui)"
        fill="var(--muted-foreground)"
        opacity={0.35}
        letterSpacing="2.5"
      >
        {currentStreak === 1 ? "DAY" : "DAYS"}
      </text>
    </svg>
  );
});
