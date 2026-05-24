import { Link, Form } from "react-router";

export function Nav({ userName, isAnonymous }: { userName: string; isAnonymous?: boolean }) {
  return (
    <>
      <nav
        className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b"
        style={{ viewTransitionName: "site-nav", borderColor: "var(--color-border-default)", opacity: 0.8 } as React.CSSProperties}
      >
        <Link
          to="/"
          className="text-lg sm:text-xl tracking-widest text-muted font-serif"
        >
          ARKHANA
        </Link>
        <div className="flex items-center gap-3 sm:gap-6 text-xs tracking-widest uppercase">
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
              <span className="hidden sm:inline opacity-30">
                {userName}
              </span>
              <Form method="post" action="/auth/signout">
                <button
                  type="submit"
                  aria-label="Sign out"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  Leave
                </button>
              </Form>
            </>
          )}
        </div>
      </nav>
      {isAnonymous && (
        <div
          className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2 border-b text-xs tracking-widest"
          style={{ borderColor: "var(--color-border-default)", background: "var(--color-bg-surface)" }}
        >
          <p className="uppercase opacity-40">Sign up to preserve your collection &amp; streak</p>
          <div className="flex items-center gap-4 shrink-0">
            <Link
              to="/auth/signup"
              className="uppercase border border-border px-3 py-1 hover:opacity-90 transition-opacity"
            >
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
