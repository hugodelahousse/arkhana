import { redirect, data, Form, useNavigation, Link } from "react-router";
import type { Route } from "./+types/forgot-password";
import { config } from "../../../config/index.js";

export async function loader({ context }: Route.LoaderArgs) {
  if (context.user && !context.user.isAnonymous) return redirect("/");
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();

  if (!email.includes("@")) return data({ error: "Please enter a valid email address." }, { status: 400 });

  const origin = new URL(config.betterAuthUrl).origin;

  const res = await fetch(
    new URL("/api/auth/forget-password", config.betterAuthUrl).toString(),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({
        email,
        redirectTo: `${config.betterAuthUrl}/auth/reset-password`,
      }),
    }
  ).catch((err) => {
    console.error("[forgot-password] fetch failed:", err);
    return null;
  });

  if (res) {
    const body = await res.text().catch(() => "");
    console.log("[forgot-password]", res.status, body);
  }

  return data({ sent: true });
}

export function meta() {
  return [{ title: "Forgot password · Arkhana" }];
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const error = actionData && "error" in actionData ? actionData.error : null;
  const sent = actionData && "sent" in actionData ? actionData.sent : false;

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-8">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="text-2xl tracking-widest text-primary font-serif block">
            ARKHANA
          </Link>
          <p className="text-xs tracking-widest uppercase opacity-60">
            Recover your account
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-primary/80">
              If an account exists for that email, we've sent a reset link. Check your inbox and spam folder.
            </p>
            <Link
              to="/auth/signin"
              className="inline-block text-xs opacity-60 hover:opacity-100 transition-opacity underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
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
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 text-sm tracking-widest uppercase border border-accent text-accent hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                {isSubmitting ? "…" : "Send reset link"}
              </button>
            </Form>

            <p className="text-center text-xs opacity-60">
              Remember your password?{" "}
              <Link to="/auth/signin" className="opacity-80 hover:opacity-100 transition-opacity underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
