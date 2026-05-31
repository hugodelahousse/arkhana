import { redirect, data, Form, useNavigation, Link } from "react-router";
import type { Route } from "./+types/forgot-password";
import { config } from "../../../config/index.js";
import { useT } from "../../i18n/provider";

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
    new URL("/api/auth/request-password-reset", config.betterAuthUrl).toString(),
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
  const t = useT();
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
          <p className="type-caption">
            {t("auth.forgotPassword.title")}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-primary/80">
              {t("auth.forgotPassword.sent")}
            </p>
            <Link
              to="/auth/signin"
              className="inline-block type-caption hover:opacity-100 transition-opacity underline"
            >
              {t("auth.forgotPassword.backToSignIn")}
            </Link>
          </div>
        ) : (
          <>
            <Form method="post" className="space-y-3" aria-describedby={error ? "form-error" : undefined}>
              {error && (
                <p id="form-error" role="alert" className="text-sm text-rarity-arcane text-center">{error}</p>
              )}
              <label htmlFor="email" className="sr-only">{t("auth.forgotPassword.emailLabel")}</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="your@email.com"
                autoComplete="email"
                className="w-full bg-transparent border border-border/50 focus:border-border px-4 py-3 text-base sm:text-sm placeholder:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-border transition-colors text-muted-foreground"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 text-sm tracking-widest uppercase border border-accent text-accent hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                {isSubmitting ? "…" : t("auth.forgotPassword.submit")}
              </button>
            </Form>

            <p className="text-center type-caption">
              {t("auth.forgotPassword.remember")}{" "}
              <Link to="/auth/signin" className="hover:opacity-100 transition-opacity underline">
                {t("auth.forgotPassword.signIn")}
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
