import { redirect, data, Form, useNavigation, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/reset-password";
import { config } from "../../../config/index.js";
import { useT } from "../../i18n/provider";

export async function loader({ context, request }: Route.LoaderArgs) {
  if (context.user && !context.user.isAnonymous) return redirect("/");
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error === "INVALID_TOKEN") return data({ tokenError: true });
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const newPassword = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");
  const token = String(form.get("token") || "");

  if (!token) return data({ error: "Missing reset token. Please request a new link." }, { status: 400 });
  if (newPassword.length < 8) return data({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (newPassword !== confirmPassword) return data({ error: "Passwords do not match." }, { status: 400 });

  const origin = new URL(config.betterAuthUrl).origin;

  const res = await fetch(
    new URL("/api/auth/reset-password", config.betterAuthUrl).toString(),
    {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ newPassword, token }),
    }
  );

  if (!res.ok) return data({ error: "This reset link is invalid or has expired. Please request a new one." }, { status: 400 });

  return redirect("/auth/signin?reset=1");
}

export function meta() {
  return [{ title: "Reset password · Arkhana" }];
}

export default function ResetPassword({ actionData, loaderData }: Route.ComponentProps) {
  const t = useT();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const error = actionData && "error" in actionData ? actionData.error : null;
  const tokenError = (loaderData && "tokenError" in loaderData && loaderData.tokenError) || !token;

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-8">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="text-2xl tracking-widest text-primary font-serif block">
            ARKHANA
          </Link>
          <p className="type-caption">
            {t("auth.resetPassword.title")}
          </p>
        </div>

        {tokenError ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-rarity-arcane">
              {t("auth.resetPassword.invalidToken")}
            </p>
            <Link
              to="/auth/forgot-password"
              className="inline-block w-full px-6 py-3 text-sm tracking-widest uppercase border border-border text-primary hover:opacity-80 transition-opacity text-center"
            >
              {t("auth.resetPassword.requestNewLink")}
            </Link>
          </div>
        ) : (
          <>
            <Form method="post" className="space-y-3" aria-describedby={error ? "form-error" : undefined}>
              {error && (
                <p id="form-error" role="alert" className="text-sm text-rarity-arcane text-center">{error}</p>
              )}
              <input type="hidden" name="token" value={token} />
              <label htmlFor="password" className="sr-only">{t("auth.resetPassword.newPasswordLabel")}</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
                autoComplete="new-password"
                className="w-full bg-transparent border border-border/50 focus:border-border px-4 py-3 text-base sm:text-sm placeholder:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-border transition-colors text-muted-foreground"
              />
              <label htmlFor="confirmPassword" className="sr-only">{t("auth.resetPassword.confirmPasswordLabel")}</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
                autoComplete="new-password"
                className="w-full bg-transparent border border-border/50 focus:border-border px-4 py-3 text-base sm:text-sm placeholder:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-border transition-colors text-muted-foreground"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 text-sm tracking-widest uppercase border border-accent text-accent hover:opacity-80 disabled:opacity-40 transition-opacity"
              >
                {isSubmitting ? "…" : t("auth.resetPassword.submit")}
              </button>
            </Form>

            <p className="text-center type-caption">
              {t("auth.resetPassword.remember")}{" "}
              <Link to="/auth/signin" className="hover:opacity-100 transition-opacity underline">
                {t("auth.resetPassword.signIn")}
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
