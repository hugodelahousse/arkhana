import { Link, Form, useLocation } from "react-router";
import { Cards, GridFour, Gear, Moon } from "@phosphor-icons/react";
import { buttonClass } from "../Button";
import { KofiButton } from "../KofiButton";

const TABS = [
  { to: "/", label: "Today", Icon: Cards },
  { to: "/collection", label: "Collection", Icon: GridFour },
  { to: "/streak", label: "Moon Cycle", Icon: Moon },
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
          className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
        >
          {(() => {
            const activeIndex = Math.max(0, TABS.findIndex(({ to }) => isActive(to)));
            return (
              <div
                className="relative pointer-events-auto flex items-center bg-card/90 backdrop-blur-md border border-border rounded-full p-1.5 gap-0.5 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] dark:shadow-[0_8px_40px_-4px_rgba(0,0,0,0.85),0_2px_24px_-4px_rgba(168,85,247,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]"
                style={{ viewTransitionName: "mobile-nav-pill" } as React.CSSProperties}
              >
                {/* Sliding background — translates to the active tab position */}
                <span
                  className="absolute top-1.5 left-1.5 bottom-1.5 w-14 rounded-full bg-muted pointer-events-none"
                  style={{ transform: `translateX(${activeIndex * 58}px)`, transition: "transform 240ms cubic-bezier(0.4, 0, 0.2, 1)" }}
                  aria-hidden
                />

                {TABS.map(({ to, label, Icon }) => {
                  const active = isActive(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      aria-label={label}
                      className={`relative z-10 flex items-center justify-center w-14 h-10 rounded-full transition-colors duration-200 ${
                        active
                          ? "text-primary"
                          : "text-ghost-foreground hover:text-faint-foreground"
                      }`}
                    >
                      <Icon weight={active ? "regular" : "light"} size={22} aria-hidden />
                      {active && (
                        <span
                          className="absolute bottom-[7px] left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-accent opacity-75"
                          aria-hidden
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })()}
        </nav>
      )}
    </>
  );
}
