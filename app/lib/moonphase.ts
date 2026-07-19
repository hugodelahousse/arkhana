import { DateTime } from "luxon";

const KNOWN_NEW_MOON = DateTime.fromISO("2024-01-11T11:57:00Z", { zone: "utc" });
export const SYNODIC_MONTH_DAYS = 29.53059;

export type LunarEvent = "new-moon" | "full-moon";

export interface CelestialEvent {
  date: DateTime;
  event: LunarEvent;
  label: string;
}

export interface MoonPhaseInfo {
  phase: string;
  emoji: string;
  age: number; // days into current cycle (0–29.5)
}

export interface LunarMonthInfo {
  todayLunarIndex: number;    // 0-based calendar day in current lunar month
  lunarMonthLength: number;   // 29 or 30 calendar days
  pulledDayIndices: number[]; // 0-based indices where user pulled this month
}

export function getMoonAge(dt: DateTime): number {
  const elapsed = dt.diff(KNOWN_NEW_MOON, "days").days;
  return ((elapsed % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
}

export function getCurrentMoonPhase(dt = DateTime.utc()): MoonPhaseInfo {
  const age = getMoonAge(dt);
  const pct = age / SYNODIC_MONTH_DAYS;

  let phase: string;
  let emoji: string;

  if (pct < 0.0338 || pct >= 0.9662) { phase = "New Moon"; emoji = "🌑"; }
  else if (pct < 0.2162) { phase = "Waxing Crescent"; emoji = "🌒"; }
  else if (pct < 0.2838) { phase = "First Quarter"; emoji = "🌓"; }
  else if (pct < 0.4662) { phase = "Waxing Gibbous"; emoji = "🌔"; }
  else if (pct < 0.5338) { phase = "Full Moon"; emoji = "🌕"; }
  else if (pct < 0.7162) { phase = "Waning Gibbous"; emoji = "🌖"; }
  else if (pct < 0.7838) { phase = "Last Quarter"; emoji = "🌗"; }
  else { phase = "Waning Crescent"; emoji = "🌘"; }

  return { phase, emoji, age };
}

/**
 * Compute which calendar day of the current lunar month today falls on,
 * how long this lunar month is, and which days in this month had pulls.
 */
export function getLunarMonthInfo(today: DateTime, pullDates: string[]): LunarMonthInfo {
  const age = getMoonAge(today);

  const lastNewMoon = today.minus({ days: age });
  const nextNewMoon = lastNewMoon.plus({ days: SYNODIC_MONTH_DAYS });

  const startDay = lastNewMoon.startOf("day");
  const endDay = nextNewMoon.startOf("day");

  const lunarMonthLength = Math.max(29, Math.min(30, Math.round(endDay.diff(startDay, "days").days)));
  const todayDay = today.startOf("day");
  const todayLunarIndex = Math.min(
    Math.round(todayDay.diff(startDay, "days").days),
    lunarMonthLength - 1,
  );

  const pulledDayIndices: number[] = [];
  for (const dateStr of pullDates) {
    const d = DateTime.fromISO(dateStr, { zone: "utc" }).startOf("day");
    const idx = Math.round(d.diff(startDay, "days").days);
    if (idx >= 0 && idx < lunarMonthLength) {
      pulledDayIndices.push(idx);
    }
  }

  return { todayLunarIndex, lunarMonthLength, pulledDayIndices };
}

export interface LunarMonthDetail {
  newMoonDate: string;
  todayLunarIndex: number;
  lunarMonthLength: number;
  pulledDayIndices: number[];
  graceDayIndices: number[];
  streakDayIndices: number[];
  startDate: string;
  endDate: string;
}

export function getLunarMonthsInfo(
  today: DateTime,
  pullDates: string[],
  count: number,
  streakLength = 0,
): LunarMonthDetail[] {
  const age = getMoonAge(today);
  const currentNewMoon = today.minus({ days: age });
  const todayDay = today.startOf("day");
  const streakStart = streakLength > 0
    ? todayDay.minus({ days: streakLength - 1 })
    : DateTime.fromMillis(0, { zone: "utc" });
  const results: LunarMonthDetail[] = [];

  for (let m = count - 1; m >= 0; m--) {
    const newMoon = currentNewMoon.minus({ days: m * SYNODIC_MONTH_DAYS });
    const nextNewMoon = newMoon.plus({ days: SYNODIC_MONTH_DAYS });

    const startDay = newMoon.startOf("day");
    const endDay = nextNewMoon.startOf("day");

    const lunarMonthLength = Math.max(
      29,
      Math.min(30, Math.round(endDay.diff(startDay, "days").days)),
    );

    const todayIdx = Math.round(todayDay.diff(startDay, "days").days);
    const todayLunarIndex =
      todayIdx >= 0 && todayIdx < lunarMonthLength
        ? Math.min(todayIdx, lunarMonthLength - 1)
        : -1;

    const pulledDayIndices: number[] = [];
    for (const dateStr of pullDates) {
      const d = DateTime.fromISO(dateStr, { zone: "utc" }).startOf("day");
      const idx = Math.round(d.diff(startDay, "days").days);
      if (idx >= 0 && idx < lunarMonthLength) {
        pulledDayIndices.push(idx);
      }
    }

    const lastDay = todayLunarIndex >= 0 ? todayLunarIndex : lunarMonthLength - 1;
    const graceDayIndices = computeGraceDays(pulledDayIndices, lastDay);

    const streakDayIndices: number[] = [];
    if (streakLength > 0) {
      for (const idx of pulledDayIndices) {
        const dayDt = startDay.plus({ days: idx });
        if (dayDt >= streakStart && dayDt <= todayDay) {
          streakDayIndices.push(idx);
        }
      }
    }

    const lastDayDt = startDay.plus({ days: lunarMonthLength - 1 });

    results.push({
      newMoonDate: startDay.toISODate()!,
      todayLunarIndex,
      lunarMonthLength,
      pulledDayIndices,
      graceDayIndices,
      streakDayIndices,
      startDate: startDay.toISODate()!,
      endDate: lastDayDt.toISODate()!,
    });
  }

  return results;
}

function computeGraceDays(pulledIndices: number[], lastDay: number): number[] {
  const pulledSet = new Set(pulledIndices);
  const grace: number[] = [];
  let i = 0;

  while (i <= lastDay) {
    if (!pulledSet.has(i)) {
      const gapStart = i;
      while (i <= lastDay && !pulledSet.has(i)) i++;
      const gapLen = i - gapStart;
      if (gapLen <= 2 && gapStart > 0 && pulledSet.has(gapStart - 1) && i <= lastDay) {
        for (let g = gapStart; g < gapStart + gapLen; g++) {
          grace.push(g);
        }
      }
    } else {
      i++;
    }
  }

  return grace.slice(0, 2);
}

/**
 * SVG path for the illuminated portion of the moon at a given lunar age.
 * Rendered in a 100×100 viewBox. Returns "new", "full", or an SVG path string.
 */
export function moonIlluminatedPath(age: number): "new" | "full" | string {
  const theta = (2 * Math.PI * age) / SYNODIC_MONTH_DAYS;
  const illum = (1 - Math.cos(theta)) / 2;

  if (illum < 0.02) return "new";
  if (illum > 0.98) return "full";

  const R = 45;
  const cx = 50;
  const cy = 50;

  const tx = R * Math.cos(theta);
  const atx = Math.abs(tx);
  const isWaxing = age < SYNODIC_MONTH_DAYS / 2;

  const top = `${cx} ${cy - R}`;
  const bot = `${cx} ${cy + R}`;

  if (isWaxing) {
    const tSweep = tx >= 0 ? 1 : 0;
    return `M ${top} A ${R} ${R} 0 0 1 ${bot} A ${atx} ${R} 0 0 ${tSweep} ${top} Z`;
  } else {
    const tSweep = tx <= 0 ? 1 : 0;
    return `M ${top} A ${R} ${R} 0 0 0 ${bot} A ${atx} ${R} 0 0 ${tSweep} ${top} Z`;
  }
}

/**
 * SVG path for a conventional moon phase icon at a 0–1 phase fraction.
 */
export function moonPhaseIconPath(phase: number): "new" | "full" | string {
  const normalized = ((phase % 1) + 1) % 1;

  if (normalized < 0.05 || normalized > 0.95) return "new";
  if (normalized > 0.47 && normalized < 0.53) return "full";

  const radius = 45;
  const cx = 50;
  const cy = 50;
  const theta = 2 * Math.PI * normalized;
  // Round to 4 decimals (like polarToCartesian) so the emitted path string is
  // byte-identical across server/client renders — avoids a hydration mismatch
  // from trailing float precision differences.
  const terminatorRadius = Math.round(Math.abs(radius * Math.cos(theta)) * 1e4) / 1e4;
  const terminatorSweep = Math.cos(theta) < 0 ? 1 : 0;
  const top = `${cx} ${cy - radius}`;
  const bottom = `${cx} ${cy + radius}`;

  if (normalized < 0.5) {
    return [
      `M ${top}`,
      `A ${radius} ${radius} 0 0 1 ${bottom}`,
      `A ${terminatorRadius} ${radius} 0 0 ${terminatorSweep} ${top}`,
      "Z",
    ].join(" ");
  }

  return [
    `M ${top}`,
    `A ${radius} ${radius} 0 0 0 ${bottom}`,
    `A ${terminatorRadius} ${radius} 0 0 ${terminatorSweep ? 0 : 1} ${top}`,
    "Z",
  ].join(" ");
}

export function moonPhaseOutlineOpacity(phase: number): number {
  const normalized = ((phase % 1) + 1) % 1;
  const distanceFromNew = Math.min(normalized, 1 - normalized);

  if (distanceFromNew >= 0.1) return 1;
  return 0.55 + (distanceFromNew / 0.1) * 0.45;
}

export function isMoonEventOnDate(date: string, event: LunarEvent): boolean {
  const dt = DateTime.fromISO(date, { zone: "utc" });
  const events = getUpcomingCelestialEvents(dt, 2);
  return events.some((e) => e.event === event && e.date.toISODate() === date);
}

export function nextMoonEventDate(from: DateTime, event: LunarEvent): DateTime {
  const start = from.startOf("day").plus({ days: 1 });
  const events = getUpcomingCelestialEvents(start, 35);
  return events.find((e) => e.event === event)!.date.startOf("day");
}

export function getUpcomingCelestialEvents(from: DateTime, days: number): CelestialEvent[] {
  const events: CelestialEvent[] = [];
  const to = from.plus({ days });

  const elapsed = from.diff(KNOWN_NEW_MOON, "days").days;
  const currentCycle = Math.floor(elapsed / SYNODIC_MONTH_DAYS);

  for (let cycle = currentCycle - 1; cycle <= currentCycle + 4; cycle++) {
    const newMoon = KNOWN_NEW_MOON.plus({ days: cycle * SYNODIC_MONTH_DAYS });
    const fullMoon = newMoon.plus({ days: SYNODIC_MONTH_DAYS / 2 });

    if (newMoon >= from && newMoon <= to) {
      events.push({ date: newMoon, event: "new-moon", label: "New Moon" });
    }
    if (fullMoon >= from && fullMoon <= to) {
      events.push({ date: fullMoon, event: "full-moon", label: "Full Moon" });
    }
  }

  return events.sort((a, b) => a.date.toMillis() - b.date.toMillis());
}
