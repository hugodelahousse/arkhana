import { redirect, Form, Link, useActionData } from "react-router";
import type { Route } from "./+types/signin";

export async function loader({ context }: Route.LoaderArgs) {
  if (context.user) return redirect("/dashboard");
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const res = await fetch(
    new URL("/api/auth/sign-in/email", request.url).toString(),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: (data as { message?: string }).message ?? "Sign-in failed." };
  }

  const setCookie = res.headers.get("set-cookie");
  return redirect("/dashboard", {
    headers: setCookie ? { "set-cookie": setCookie } : {},
  });
}

export function meta() {
  return [{ title: "Sign in — Arkhana" }];
}

export default function SignIn() {
  const data = useActionData<typeof action>();
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="text-3xl tracking-widest"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}
          >
            ARKHANA
          </Link>
          <p className="text-sm tracking-widest uppercase opacity-50" style={{ color: "var(--color-text-primary)" }}>
            Return
          </p>
        </div>

        <Form method="post" className="space-y-4">
          {data?.error && (
            <p className="text-sm text-center" style={{ color: "var(--color-rarity-arcane)" }}>
              {data.error}
            </p>
          )}
          <div className="space-y-1">
            <label className="block text-xs tracking-widest uppercase opacity-60" style={{ color: "var(--color-text-primary)" }}>
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full bg-transparent border px-4 py-3 text-sm outline-none focus:opacity-100 opacity-80"
              style={{
                borderColor: "var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs tracking-widest uppercase opacity-60" style={{ color: "var(--color-text-primary)" }}>
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full bg-transparent border px-4 py-3 text-sm outline-none opacity-80 focus:opacity-100"
              style={{
                borderColor: "var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 text-sm tracking-widest uppercase border transition-opacity hover:opacity-90"
            style={{
              borderColor: "var(--color-border-default)",
              color: "var(--color-text-muted)",
            }}
          >
            Enter
          </button>
        </Form>

        <p className="text-center text-xs opacity-50" style={{ color: "var(--color-text-primary)" }}>
          No account?{" "}
          <Link to="/auth/signup" className="underline">
            Begin here
          </Link>
        </p>
      </div>
    </main>
  );
}
