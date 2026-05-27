export type { Theme } from "../../db/schema/auth.js";
import type { Theme } from "../../db/schema/auth.js";

const ONE_YEAR_S = 365 * 24 * 60 * 60;

export function getThemeFromCookie(request: Request): Theme {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)theme=(light|dark|system)/);
  return (match?.[1] as Theme) ?? "system";
}

/** Returns a Set-Cookie string. NOT HttpOnly so the blocking script can read it. */
export function setThemeCookie(theme: Theme): string {
  return `theme=${theme}; Path=/; Max-Age=${ONE_YEAR_S}; SameSite=Lax`;
}

/**
 * Inline blocking script injected as first child of <body>.
 * Runs synchronously before first paint — reads the theme cookie,
 * falls back to matchMedia for 'system', and toggles .dark on <html>.
 * Wrapped in try/catch so a cookie parse error never breaks the page.
 */
export const THEME_SCRIPT = `(function(){try{var c=document.cookie.match(/(?:^|;\\s*)theme=(light|dark|system)/);var t=c?c[1]:'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
