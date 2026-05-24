import { redirect, Form, useNavigation, Link } from "react-router";
import type { Route } from "./+types/signup";
import { config } from "../../../config/index.js";

export async function loader({ context }: Route.LoaderArgs) {
  if (context.user && !context.user.isAnonymous) return redirect("/");
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const name = String(form.get("name") || "").trim() || email.split("@")[0];

  if (!email.includes("@")) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const origin = new URL(config.betterAuthUrl).origin;
  const headers = {
    "content-type": "application/json",
    origin,
    cookie: request.headers.get("cookie") ?? "",
  };

  const signUpRes = await fetch(
    new URL("/api/auth/sign-up/email", config.betterAuthUrl).toString(),
    { method: "POST", headers, body: JSON.stringify({ email, password, name }) }
  );

  if (!signUpRes.ok) {
    const body = await signUpRes.json().catch(() => ({})) as Record<string, unknown>;
    return { error: String(body.message ?? "Sign-up failed. That email may already be in use.") };
  }

  // Sign in to get the session cookie (sign-up response doesn't set one in some configs)
  const signInRes = await fetch(
    new URL("/api/auth/sign-in/email", config.betterAuthUrl).toString(),
    { method: "POST", headers, body: JSON.stringify({ email, password }) }
  );

  if (!signInRes.ok) return { error: "Account created. Please sign in." };

  const setCookie = signInRes.headers.get("set-cookie");
  return redirect("/", { headers: setCookie ? { "set-cookie": setCookie } : {} });
}

export function meta() {
  return [{ title: "Create account · Arkhana" }];
}

export default function SignUp({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const error = actionData && "error" in actionData ? actionData.error : null;

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-8">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="text-2xl tracking-widest text-muted block">
            ARKHANA
          </Link>
          <p className="text-xs tracking-widest uppercase opacity-40">
            Create your account
          </p>
        </div>

        <Form method="post" className="space-y-3">
          {error && (
            <p className="text-sm text-rarity-arcane text-center">{error}</p>
          )}
          <input
            name="name"
            type="text"
            placeholder="Name (optional)"
            autoComplete="name"
            className="w-full bg-transparent border border-border px-4 py-3 text-sm outline-none opacity-60 focus:opacity-100 placeholder:opacity-30"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="your@email.com"
            autoComplete="email"
            className="w-full bg-transparent border border-border px-4 py-3 text-sm outline-none opacity-60 focus:opacity-100 placeholder:opacity-30"
          />
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            autoComplete="new-password"
            className="w-full bg-transparent border border-border px-4 py-3 text-sm outline-none opacity-60 focus:opacity-100 placeholder:opacity-30"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 text-sm tracking-widest uppercase border border-border text-muted transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {isSubmitting ? "…" : "Enter the archive"}
          </button>
        </Form>

        <p className="text-center text-xs opacity-40">
          Already a keeper?{" "}
          <Link to="/auth/signin" className="opacity-70 hover:opacity-100 transition-opacity underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
