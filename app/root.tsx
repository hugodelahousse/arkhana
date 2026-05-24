import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { OrientationProvider } from "./lib/orientation";

export const links: Route.LinksFunction = () => [];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <OrientationProvider>
      <Outlet />
    </OrientationProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--color-bg-base)" }}
    >
      <div className="max-w-md space-y-6">
        <p
          className="text-6xl font-light tracking-widest"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}
        >
          {message}
        </p>
        <p
          className="text-sm tracking-wide opacity-60"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
        >
          {details}
        </p>
        <a
          href="/"
          className="inline-block text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity pt-4"
          style={{ color: "var(--color-text-primary)" }}
        >
          ← Return home
        </a>
        {stack && (
          <pre
            className="w-full p-4 overflow-x-auto text-left text-xs mt-8 opacity-50"
            style={{ background: "var(--color-bg-surface)", color: "var(--color-text-primary)" }}
          >
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
