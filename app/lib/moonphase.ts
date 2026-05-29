// Synodic month and a known reference new moon (Jan 11 2024 11:57 UTC)
const KNOWN_NEW_MOON_MS = new Date("2024-01-11T11:57:00Z").getTime();
export const SYNODIC_MONTH_DAYS = 29.53059;
export const MS_PER_DAY = 86_400_000;

export type LunarEvent = "new-moon" | "full-moon";

export interface CelestialEvent {
  date: Date;
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

export function getMoonAge(date: Date): number {
  const elapsed = (date.getTime() - KNOWN_NEW_MOON_MS) / MS_PER_DAY;
  return ((elapsed % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
}

export function getCurrentMoonPhase(date = new Date()): MoonPhaseInfo {
  const age = getMoonAge(date);
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
export function getLunarMonthInfo(today: Date, pullDates: string[]): LunarMonthInfo {
  const age = getMoonAge(today);

  // Approximate start of current lunar month (last new moon)
  const lastNewMoonMs = today.getTime() - age * MS_PER_DAY;
  const nextNewMoonMs = lastNewMoonMs + SYNODIC_MONTH_DAYS * MS_PER_DAY;

  // Snap to UTC calendar day boundaries
  const lnm = new Date(lastNewMoonMs);
  const nnm = new Date(nextNewMoonMs);
  const startDayMs = Date.UTC(lnm.getUTCFullYear(), lnm.getUTCMonth(), lnm.getUTCDate());
  const endDayMs = Date.UTC(nnm.getUTCFullYear(), nnm.getUTCMonth(), nnm.getUTCDate());

  const lunarMonthLength = Math.max(29, Math.min(30, Math.round((endDayMs - startDayMs) / MS_PER_DAY)));

  // Today's 0-based index = calendar days elapsed since new moon day
  const todayDayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const todayLunarIndex = Math.min(
    Math.round((todayDayMs - startDayMs) / MS_PER_DAY),
    lunarMonthLength - 1
  );

  // Which pull dates fall within this lunar month
  const pulledDayIndices: number[] = [];
  for (const dateStr of pullDates) {
    const d = new Date(dateStr + "T00:00:00Z");
    const dayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const idx = Math.round((dayMs - startDayMs) / MS_PER_DAY);
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
  today: Date,
  pullDates: string[],
  count: number,
  streakLength = 0,
): LunarMonthDetail[] {
  const age = getMoonAge(today);
  const currentNewMoonMs = today.getTime() - age * MS_PER_DAY;
  const todayDayMs = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const streakStartMs =
    streakLength > 0 ? todayDayMs - (streakLength - 1) * MS_PER_DAY : 0;
  const results: LunarMonthDetail[] = [];

  for (let m = count - 1; m >= 0; m--) {
    const newMoonMs = currentNewMoonMs - m * SYNODIC_MONTH_DAYS * MS_PER_DAY;
    const nextNewMoonMs = newMoonMs + SYNODIC_MONTH_DAYS * MS_PER_DAY;

    const lnm = new Date(newMoonMs);
    const nnm = new Date(nextNewMoonMs);
    const startDayMs = Date.UTC(lnm.getUTCFullYear(), lnm.getUTCMonth(), lnm.getUTCDate());
    const endDayMs = Date.UTC(nnm.getUTCFullYear(), nnm.getUTCMonth(), nnm.getUTCDate());

    const lunarMonthLength = Math.max(
      29,
      Math.min(30, Math.round((endDayMs - startDayMs) / MS_PER_DAY)),
    );

    const todayIdx = Math.round((todayDayMs - startDayMs) / MS_PER_DAY);
    const todayLunarIndex =
      todayIdx >= 0 && todayIdx < lunarMonthLength
        ? Math.min(todayIdx, lunarMonthLength - 1)
        : -1;

    const pulledDayIndices: number[] = [];
    for (const dateStr of pullDates) {
      const d = new Date(dateStr + "T00:00:00Z");
      const dayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      const idx = Math.round((dayMs - startDayMs) / MS_PER_DAY);
      if (idx >= 0 && idx < lunarMonthLength) {
        pulledDayIndices.push(idx);
      }
    }

    const lastDay = todayLunarIndex >= 0 ? todayLunarIndex : lunarMonthLength - 1;
    const graceDayIndices = computeGraceDays(pulledDayIndices, lastDay);

    const streakDayIndices: number[] = [];
    if (streakLength > 0) {
      for (const idx of pulledDayIndices) {
        const dayMs = startDayMs + idx * MS_PER_DAY;
        if (dayMs >= streakStartMs && dayMs <= todayDayMs) {
          streakDayIndices.push(idx);
        }
      }
    }

    const sd = new Date(startDayMs);
    const ed = new Date(startDayMs + (lunarMonthLength - 1) * MS_PER_DAY);

    results.push({
      newMoonDate: utcISODate(sd),
      todayLunarIndex,
      lunarMonthLength,
      pulledDayIndices,
      graceDayIndices,
      streakDayIndices,
      startDate: utcISODate(sd),
      endDate: utcISODate(ed),
    });
  }

  return results;
}

function utcISODate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
 * New moon is 0/1, full moon is 0.5, waxing lights the right side,
 * and waning lights the left side. Rendered in a 100×100 viewBox.
 */
export function moonPhaseIconPath(phase: number): "new" | "full" | string {
  const normalized = ((phase % 1) + 1) % 1;

  if (normalized < 0.05 || normalized > 0.95) return "new";
  if (normalized > 0.47 && normalized < 0.53) return "full";

  const radius = 45;
  const cx = 50;
  const cy = 50;
  const theta = 2 * Math.PI * normalized;
  const terminatorRadius = Math.abs(radius * Math.cos(theta));
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

export function getUpcomingCelestialEvents(fromDate: Date, days: number): CelestialEvent[] {
  const events: CelestialEvent[] = [];
  const toTime = fromDate.getTime() + days * MS_PER_DAY;

  const elapsed = (fromDate.getTime() - KNOWN_NEW_MOON_MS) / MS_PER_DAY;
  const currentCycle = Math.floor(elapsed / SYNODIC_MONTH_DAYS);

  for (let cycle = currentCycle - 1; cycle <= currentCycle + 4; cycle++) {
    const newMoonMs = KNOWN_NEW_MOON_MS + cycle * SYNODIC_MONTH_DAYS * MS_PER_DAY;
    const fullMoonMs = newMoonMs + (SYNODIC_MONTH_DAYS / 2) * MS_PER_DAY;

    if (newMoonMs >= fromDate.getTime() && newMoonMs <= toTime) {
      events.push({ date: new Date(newMoonMs), event: "new-moon", label: "New Moon" });
    }
    if (fullMoonMs >= fromDate.getTime() && fullMoonMs <= toTime) {
      events.push({ date: new Date(fullMoonMs), event: "full-moon", label: "Full Moon" });
    }
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}
