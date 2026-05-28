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
export const THEME_COLORS = { light: "#f5f2ed", dark: "#0a0a0f" } as const;

/**
 * Inline blocking script injected as first child of <body>.
 * Runs synchronously before first paint — reads the theme cookie,
 * falls back to matchMedia for 'system', toggles .dark on <html>,
 * and syncs all theme-color meta tags so iOS address bar matches immediately.
 */
export const THEME_SCRIPT = `(function(){try{var c=document.cookie.match(/(?:^|;\\s*)theme=(light|dark|system)/);var t=c?c[1]:'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);var bg=d?'${THEME_COLORS.dark}':'${THEME_COLORS.light}';document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.setAttribute('content',bg);m.removeAttribute('media');});}catch(e){}})();`;
