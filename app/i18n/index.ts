export type Locale = "en" | "fr";
export const SUPPORTED_LOCALES: Locale[] = ["en", "fr"];
export const DEFAULT_LOCALE: Locale = "en";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

export function getLocaleFromRequest(request: Request): Locale {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)locale=(en|fr)/);
  if (match) return match[1] as Locale;

  const acceptLang = request.headers.get("Accept-Language") ?? "";
  if (/\bfr\b/.test(acceptLang.toLowerCase())) return "fr";

  return DEFAULT_LOCALE;
}

export function setLocaleCookie(locale: Locale): string {
  return `locale=${locale}; Path=/; Max-Age=${ONE_YEAR_S}; SameSite=Lax`;
}
