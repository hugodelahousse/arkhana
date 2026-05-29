import { Link, Form, useLocation } from "react-router";
import { Cards, ClockCounterClockwise, GridFour, Gear, Moon } from "@phosphor-icons/react";
import { buttonClass } from "../Button";
import { KofiButton } from "../KofiButton";

const TABS = [
  { to: "/", label: "Today", Icon: Cards },
  { to: "/streak", label: "Moon", Icon: Moon },
  { to: "/collection", label: "Cards", Icon: GridFour },
  { to: "/history", label: "History", Icon: ClockCounterClockwise },
  { to: "/settings", label: "Settings", Icon: Gear },
] as const;

export function Nav({ userName: _userName, isAnonymous }: { userName: string; isAnonymous?: boolean }) {
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
          <KofiButton />
          {isAnonymous ? (
            <Link to="/auth/signup" className="text-faint-foreground hover:text-foreground transition-colors">
              Sign up
            </Link>
          ) : (
            <>
              <Link
                to="/streak"
                className="hidden sm:inline text-faint-foreground hover:text-foreground transition-colors"
              >
                Moon Cycle
              </Link>
              <Link
                to="/history"
                className="hidden sm:inline text-faint-foreground hover:text-foreground transition-colors"
              >
                History
              </Link>
              <Link
                to="/collection"
                className="hidden sm:inline text-faint-foreground hover:text-foreground transition-colors"
              >
                Collection
              </Link>
              <Link
                to="/settings"
                className="hidden sm:inline text-faint-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
              <Form method="post" action="/auth/signout">
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="uppercase text-faint-foreground hover:text-foreground transition-colors"
                >
                  Sign out
                </button>
              </Form>
            </>
          )}
        </div>
      </nav>

      {isAnonymous && (
        <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2 border-b border-border bg-card text-xs tracking-widest">
          <p className="type-ghost">Your reading is ephemeral — create an account to save it</p>
          <div className="flex items-center gap-4 shrink-0">
            <Link to="/auth/signup" className={buttonClass("sm")}>
              Create account
            </Link>
            <Link
              to="/auth/signin"
              className="uppercase text-faint-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}

      {!isAnonymous && (
        <nav
          aria-label="Main navigation"
          className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex">
            {TABS.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                  isActive(to) ? "text-primary" : "text-ghost-foreground"
                }`}
              >
                <Icon weight="light" size={20} aria-hidden />
                <span className="text-[8px] tracking-widest uppercase">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
