import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";
import { useEffect } from "react";

import type { Route } from "./+types/root";
import "./app.css";
import { OrientationProvider } from "./lib/orientation";
import { getThemeFromCookie, THEME_SCRIPT, THEME_COLORS, type Theme } from "./lib/theme";
import { getLocaleFromRequest, type Locale } from "./i18n/index";
import { I18nProvider, useT } from "./i18n/provider";

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

export async function loader({ request }: Route.LoaderArgs) {
  return { theme: getThemeFromCookie(request), locale: getLocaleFromRequest(request) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const theme = data?.theme ?? "system";
  const locale = (data?.locale ?? "en") as Locale;

  // suppressHydrationWarning: the blocking script intentionally mutates
  // document.documentElement.classList before React hydrates — not a bug.
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* system: two media-conditional tags so the browser picks correctly without JS.
            explicit light/dark: single tag. The blocking script collapses both to the
            resolved value before first paint, so iOS sees the right color immediately. */}
        {theme === "system" ? (
          <>
            <meta name="theme-color" content={THEME_COLORS.light} media="(prefers-color-scheme: light)" />
            <meta name="theme-color" content={THEME_COLORS.dark} media="(prefers-color-scheme: dark)" />
          </>
        ) : (
          <meta name="theme-color" content={theme === "light" ? THEME_COLORS.light : THEME_COLORS.dark} />
        )}
        <link rel="manifest" href="/site.webmanifest" />
        <Meta />
        <Links />
      </head>
      <body>
        {/* Blocking script: must be first in <body> so it runs before any content
            is painted. Reads the theme cookie, falls back to matchMedia for
            'system', and toggles .dark on <html>. No flash possible. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <I18nProvider locale={locale}>
          {children}
        </I18nProvider>
        <ScrollRestoration />
        <Scripts />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
  }, []);
  return null;
}

export default function App() {
  const data = useRouteLoaderData<typeof loader>("root");
  const theme = data?.theme ?? "system";

  // Keep .dark in sync with theme and OS preference after hydration.
  // The blocking script handles initial load; this effect handles:
  //   1. Theme changes triggered by the settings page
  //   2. OS-level prefers-color-scheme changes while theme is 'system'
  useEffect(() => {
    function apply(t: Theme) {
      const isDark =
        t === "dark" ||
        (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", isDark);
      // Keep iOS address-bar color in sync with the resolved theme
      const color = isDark ? THEME_COLORS.dark : THEME_COLORS.light;
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m, i) => {
        if (i === 0) { m.content = color; m.removeAttribute("media"); }
        else m.remove();
      });
    }

    apply(theme);

    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => apply("system");
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
  }, [theme]);

  return (
    <OrientationProvider>
      <Outlet />
    </OrientationProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const t = useT();
  let message = t("error.unexpected.title");
  let details = t("error.unexpected.message");
  let stack: string | undefined;
  let isOffline = false;

  if (typeof window !== "undefined" && !navigator.onLine) {
    isOffline = true;
    message = t("error.offline.title");
    details = t("error.offline.message");
  } else if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? t("error.notFound.title") : "Error";
    details =
      error.status === 404
        ? t("error.notFound.message")
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-6">
        {isOffline && (
          <div className="w-32 mx-auto mb-2 rounded border border-border overflow-hidden bg-card">
            <img src="/cards/moon.jpg" alt={t("error.offline.title")} className="w-full opacity-85" />
          </div>
        )}
        <p className="text-6xl font-light tracking-widest text-primary font-serif">
          {message}
        </p>
        <p className="text-sm tracking-wide opacity-60 text-muted-foreground font-serif">
          {details}
        </p>
        <a
          href={isOffline ? undefined : "/"}
          onClick={isOffline ? () => history.back() : undefined}
          className="inline-block text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity pt-4 text-muted-foreground cursor-pointer"
        >
          {t("error.returnHome")}
        </a>
        {stack && (
          <pre className="w-full p-4 overflow-x-auto text-left text-xs mt-8 opacity-50 bg-card text-muted-foreground">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
