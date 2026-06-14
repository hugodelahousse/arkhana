import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DateTime } from "luxon";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayUTC(): string {
  return DateTime.utc().toISODate()!;
}

export function todayForUser(timezone: string | null): string {
  if (!timezone) return todayUTC();
  const dt = DateTime.now().setZone(timezone);
  return dt.isValid ? dt.toISODate()! : todayUTC();
}

export function nowForUser(timezone: string | null): DateTime {
  if (!timezone) return DateTime.utc();
  const dt = DateTime.now().setZone(timezone);
  return dt.isValid ? dt : DateTime.utc();
}

export function parseTzCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)tz=([^;]+)/);
  if (!match) return null;
  const tz = decodeURIComponent(match[1]);
  return DateTime.now().setZone(tz).isValid ? tz : null;
}
