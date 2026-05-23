import { Link, Form } from "react-router";

export function Nav({ userName }: { userName: string }) {
  return (
    <nav className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border opacity-80">
      <Link
        to="/"
        className="text-lg sm:text-xl tracking-widest text-muted"
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
        <span className="hidden sm:inline opacity-30">
          {userName}
        </span>
        <Form method="post" action="/auth/signout">
          <button
            type="submit"
            className="opacity-60 hover:opacity-100 transition-opacity"
          >
            Leave
          </button>
        </Form>
      </div>
    </nav>
  );
}
