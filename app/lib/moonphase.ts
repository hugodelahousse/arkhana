// Synodic month and a known reference new moon (Jan 11 2024 11:57 UTC)
const KNOWN_NEW_MOON_MS = new Date("2024-01-11T11:57:00Z").getTime();
const SYNODIC_MONTH_DAYS = 29.53059;
const MS_PER_DAY = 86_400_000;

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

function getMoonAge(date: Date): number {
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
