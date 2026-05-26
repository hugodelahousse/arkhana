import { redirect, data, Form, useNavigation, Link } from "react-router";
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
  const rawUsername = String(form.get("username") || "").trim();
  const username = rawUsername ||
    email.split("@")[0].toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 28) ||
    "user";

  if (!email.includes("@")) return data({ error: "Please enter a valid email address." }, { status: 400 });
  if (password.length < 8) return data({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (rawUsername && (rawUsername.length < 1 || rawUsername.length > 30 || !/^[a-z0-9_-]+$/i.test(rawUsername))) {
    return data({ error: "Username must be 1–30 characters: letters, numbers, hyphens, underscores." }, { status: 400 });
  }

  const origin = new URL(config.betterAuthUrl).origin;
  const headers = {
    "content-type": "application/json",
    origin,
    cookie: request.headers.get("cookie") ?? "",
  };

  const signUpRes = await fetch(
    new URL("/api/auth/sign-up/email", config.betterAuthUrl).toString(),
    { method: "POST", headers, body: JSON.stringify({ email, password, name, username, displayUsername: rawUsername || username }) }
  );

  if (!signUpRes.ok) {
    const body = await signUpRes.json().catch(() => ({})) as Record<string, unknown>;
    return data({ error: String(body.message ?? "Sign-up failed. That email may already be in use.") }, { status: 400 });
  }

  // Sign in to get the session cookie (sign-up response doesn't set one in some configs)
  const signInRes = await fetch(
    new URL("/api/auth/sign-in/email", config.betterAuthUrl).toString(),
    { method: "POST", headers, body: JSON.stringify({ email, password }) }
  );

  if (!signInRes.ok) return data({ error: "Account created. Please sign in." }, { status: 500 });

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
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-8">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="text-2xl tracking-widest text-primary font-serif block">
            ARKHANA
          </Link>
          <p className="text-xs tracking-widest uppercase opacity-60">
            Create your account
          </p>
        </div>

        <Form method="post" className="space-y-3" aria-describedby={error ? "form-error" : undefined}>
          {error && (
            <p id="form-error" role="alert" className="text-sm text-rarity-arcane text-center">{error}</p>
          )}
          <label htmlFor="email" className="sr-only">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="your@email.com"
            autoComplete="email"
            className="w-full bg-transparent border border-border/50 focus:border-border px-4 py-3 text-base sm:text-sm placeholder:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-border transition-colors text-secondary"
          />
          <label htmlFor="password" className="sr-only">Password, minimum 8 characters</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            autoComplete="new-password"
            className="w-full bg-transparent border border-border/50 focus:border-border px-4 py-3 text-base sm:text-sm placeholder:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-border transition-colors text-secondary"
          />
          <label htmlFor="name" className="sr-only">Name (optional)</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Name (optional)"
            autoComplete="name"
            className="w-full bg-transparent border border-border/50 focus:border-border px-4 py-3 text-base sm:text-sm placeholder:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-border transition-colors text-secondary"
          />
          <label htmlFor="username" className="sr-only">Username (optional)</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Username (optional)"
            autoComplete="username"
            minLength={1}
            maxLength={30}
            pattern="[a-zA-Z0-9_-]*"
            className="w-full bg-transparent border border-border/50 focus:border-border px-4 py-3 text-base sm:text-sm placeholder:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-border transition-colors text-secondary"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 text-sm tracking-widest uppercase border border-accent text-accent hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {isSubmitting ? "…" : "Enter the arkhive"}
          </button>
        </Form>

        <p className="text-center text-xs opacity-60">
          Already a keeper?{" "}
          <Link to="/auth/signin" className="opacity-80 hover:opacity-100 transition-opacity underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
