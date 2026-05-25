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
