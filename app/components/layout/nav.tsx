import { Link, Form } from "react-router";
import { buttonClass } from "../Button";

export function Nav({ userName, isAnonymous }: { userName: string; isAnonymous?: boolean }) {
  return (
    <>
      <nav
        className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border opacity-80"
        style={{ viewTransitionName: "site-nav" } as React.CSSProperties}
      >
        <Link
          to="/"
          className="text-lg sm:text-xl tracking-widest text-primary font-serif"
        >
          ARKHANA
        </Link>
        <div className="flex items-center gap-3 sm:gap-6 text-xs tracking-widest uppercase">
          <Link
            to="/history"
            className="opacity-60 hover:opacity-100 transition-opacity"
          >
            History
          </Link>
          <Link
            to="/collection"
            className="opacity-60 hover:opacity-100 transition-opacity"
          >
            Collection
          </Link>
          {isAnonymous ? (
            <Link
              to="/auth/signup"
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              Sign up
            </Link>
          ) : (
            <>
              <Link
                to="/settings"
                className="hidden sm:inline opacity-30 hover:opacity-70 transition-opacity"
              >
                {userName}
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
    </>
  );
}
