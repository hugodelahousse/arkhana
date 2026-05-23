import { redirect, Form, Link, useActionData } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/signup";
import { config } from "../../../config/index.js";

const signUpSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function loader({ context }: Route.LoaderArgs) {
  if (context.user) return redirect("/dashboard");
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const parsed = signUpSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) return { error: "Please fill in all fields correctly." };
  const { name, email, password } = parsed.data;

  const res = await fetch(
    new URL("/api/auth/sign-up/email", config.betterAuthUrl).toString(),
    {
      method: "POST",
      headers: { "content-type": "application/json", "origin": config.betterAuthUrl },
      body: JSON.stringify({ name, email, password }),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: (data as { message?: string }).message ?? "Sign-up failed." };
  }

  // Sign in automatically after sign-up
  const signinRes = await fetch(
    new URL("/api/auth/sign-in/email", config.betterAuthUrl).toString(),
    {
      method: "POST",
      headers: { "content-type": "application/json", "origin": config.betterAuthUrl },
      body: JSON.stringify({ email, password }),
    }
  );

  const setCookie = signinRes.headers.get("set-cookie");
  return redirect("/dashboard", {
    headers: setCookie ? { "set-cookie": setCookie } : {},
  });
}

export function meta() {
  return [{ title: "Begin — Arkhana" }];
}

export default function SignUp() {
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
            Begin
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
              Name
            </label>
            <input
              name="name"
              type="text"
              required
              autoComplete="name"
              className="w-full bg-transparent border px-4 py-3 text-sm outline-none opacity-80 focus:opacity-100"
              style={{
                borderColor: "var(--color-border-default)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs tracking-widest uppercase opacity-60" style={{ color: "var(--color-text-primary)" }}>
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full bg-transparent border px-4 py-3 text-sm outline-none opacity-80 focus:opacity-100"
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
              autoComplete="new-password"
              minLength={8}
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
            Begin
          </button>
        </Form>

        <p className="text-center text-xs opacity-50" style={{ color: "var(--color-text-primary)" }}>
          Already initiated?{" "}
          <Link to="/auth/signin" className="underline">
            Return
          </Link>
        </p>
      </div>
    </main>
  );
}
