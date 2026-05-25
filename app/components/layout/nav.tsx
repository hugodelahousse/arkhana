import { Link, Form, useLocation } from "react-router";
import { buttonClass } from "../Button";

function TodayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8.5" y1="12" x2="15.5" y2="12" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  );
}

function CollectionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const TABS = [
  { to: "/", label: "Today", Icon: TodayIcon },
  { to: "/history", label: "History", Icon: HistoryIcon },
  { to: "/collection", label: "Cards", Icon: CollectionIcon },
  { to: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

export function Nav({ userName, isAnonymous }: { userName: string; isAnonymous?: boolean }) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <nav
        className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border opacity-80"
        style={{ viewTransitionName: "site-nav" } as React.CSSProperties}
      >
        <Link to="/" className="text-lg sm:text-xl tracking-widest text-primary font-serif">
          ARKHANA
        </Link>
        <div className="flex items-center gap-3 sm:gap-6 text-xs tracking-widest uppercase">
          {isAnonymous ? (
            <Link to="/auth/signup" className="opacity-60 hover:opacity-100 transition-opacity">
              Sign up
            </Link>
          ) : (
            <>
              <Link
                to="/history"
                className="hidden sm:inline opacity-60 hover:opacity-100 transition-opacity"
              >
                History
              </Link>
              <Link
                to="/collection"
                className="hidden sm:inline opacity-60 hover:opacity-100 transition-opacity"
              >
                Collection
              </Link>
              <Link
                to="/settings"
                className="hidden sm:inline opacity-60 hover:opacity-100 transition-opacity"
              >
                Settings
              </Link>
              <Form method="post" action="/auth/signout">
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  Sign out
                </button>
              </Form>
            </>
          )}
        </div>
      </nav>

      {isAnonymous && (
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2 border-b border-border bg-surface text-xs tracking-widest">
          <p className="uppercase opacity-40">Your reading is ephemeral — create an account to save it</p>
          <div className="flex items-center gap-4 shrink-0">
            <Link to="/auth/signup" className={buttonClass("sm")}>
              Create account
            </Link>
            <Link
              to="/auth/signin"
              className="uppercase opacity-50 hover:opacity-90 transition-opacity"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}

      {!isAnonymous && (
        <nav
          aria-label="Main navigation"
          className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-base/95 backdrop-blur-sm"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex">
            {TABS.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-opacity ${
                  isActive(to) ? "opacity-100 text-primary" : "opacity-30"
                }`}
              >
                <Icon />
                <span className="text-[9px] tracking-widest uppercase">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
