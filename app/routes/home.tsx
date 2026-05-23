import { redirect } from "react-router";
import type { Route } from "./+types/home";
import { Link } from "react-router";

export async function loader({ context }: Route.LoaderArgs) {
  if (context.user) {
    return redirect("/dashboard");
  }
  return {};
}

export function meta() {
  return [{ title: "Arkhana" }];
}

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-8">
        <div className="space-y-3">
          <h1
            className="text-6xl font-light tracking-widest"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}
          >
            ARKHANA
          </h1>
          <p
            className="text-lg tracking-wide"
            style={{ color: "var(--color-text-primary)", opacity: 0.7 }}
          >
            One card. Every day. A reckoning.
          </p>
        </div>

        <div
          className="w-px h-16 mx-auto"
          style={{ background: "var(--color-border-default)" }}
        />

        <div className="flex flex-col gap-4">
          <Link
            to="/auth/signup"
            className="block w-full py-3 px-6 text-center tracking-widest text-sm uppercase border transition-colors hover:opacity-90"
            style={{
              borderColor: "var(--color-border-default)",
              color: "var(--color-text-muted)",
            }}
          >
            Begin
          </Link>
          <Link
            to="/auth/signin"
            className="block w-full py-3 px-6 text-center tracking-widest text-sm uppercase opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: "var(--color-text-primary)" }}
          >
            Return
          </Link>
        </div>
      </div>
    </main>
  );
}
