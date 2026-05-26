import { redirect, data, Form, useNavigation, Link, useSearchParams } from "react-router";
import { useEffect, useState, useCallback } from "react";
import type { Route } from "./+types/signin";
import { config } from "../../../config/index.js";

async function getPasskeySignIn() {
  const { createAuthClient } = await import("better-auth/client");
  const { passkeyClient } = await import("@better-auth/passkey/client");
  const client = createAuthClient({ plugins: [passkeyClient()] });
  return client.signIn.passkey;
}

export async function loader({ context }: Route.LoaderArgs) {
  if (context.user && !context.user.isAnonymous) return redirect("/");
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  if (!email.includes("@")) return data({ error: "Please enter a valid email address." }, { status: 400 });
  if (!password) return data({ error: "Please enter your password." }, { status: 400 });

  const origin = new URL(config.betterAuthUrl).origin;
  const headers = {
    "content-type": "application/json",
    origin,
    cookie: request.headers.get("cookie") ?? "",
  };

  const signInRes = await fetch(
    new URL("/api/auth/sign-in/email", config.betterAuthUrl).toString(),
    { method: "POST", headers, body: JSON.stringify({ email, password }) }
  );

  if (!signInRes.ok) return data({ error: "Invalid email or password." }, { status: 401 });

  const setCookie = signInRes.headers.get("set-cookie");
  return redirect("/", { headers: setCookie ? { "set-cookie": setCookie } : {} });
}

export function meta() {
  return [{ title: "Sign in · Arkhana" }];
}

export default function SignIn({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const error = actionData && "error" in actionData ? actionData.error : null;
  const [searchParams] = useSearchParams();
  const wasReset = searchParams.get("reset") === "1";
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.PublicKeyCredential?.isConditionalMediationAvailable) return;
    void window.PublicKeyCredential.isConditionalMediationAvailable().then(async (ok) => {
      if (!ok) return;
      const signInPasskey = await getPasskeySignIn();
      void signInPasskey({
        autoFill: true,
        fetchOptions: { onSuccess: () => { window.location.href = "/"; } },
      });
    });
  }, []);

  async function handlePasskeySignIn() {
    setPasskeyError(null);
    setPasskeyLoading(true);
    try {
      const signInPasskey = await getPasskeySignIn();
      const { error } = await signInPasskey({
        fetchOptions: { onSuccess: () => { window.location.href = "/"; } },
      });
      if (error) setPasskeyError("Passkey sign-in failed. Try again or use your password.");
    } catch {
      setPasskeyError("Passkey sign-in was cancelled or is not supported.");
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-8">
      <div className="max-w-sm w-full space-y-8">
        <div className="text-center space-y-2">
          <Link to="/" className="text-2xl tracking-widest text-primary font-serif block">
            ARKHANA
          </Link>
          <p className="text-xs tracking-widest uppercase opacity-60">
            Return to your arkhive
          </p>
        </div>

        {wasReset && (
          <p className="text-sm text-primary/80 text-center">Password reset successfully. Sign in with your new password.</p>
        )}

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
            autoComplete="username webauthn"
            className="w-full bg-transparent border border-border/50 focus:border-border px-4 py-3 text-base sm:text-sm placeholder:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-border transition-colors text-secondary"
          />
          <label htmlFor="password" className="sr-only">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="Password"
            autoComplete="current-password webauthn"
            className="w-full bg-transparent border border-border/50 focus:border-border px-4 py-3 text-base sm:text-sm placeholder:opacity-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-border transition-colors text-secondary"
          />
          <div className="flex justify-end">
            <Link
              to="/auth/forgot-password"
              className="text-xs opacity-50 hover:opacity-80 transition-opacity"
            >
              Forgot password?
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 text-sm tracking-widest uppercase border border-accent text-accent hover:opacity-80 disabled:opacity-40 transition-opacity"
            >
              {isSubmitting ? "…" : "Enter"}
            </button>

            <div className="flex items-center gap-3 opacity-30">
              <div className="flex-1 border-t border-border" />
              <span className="text-[10px] tracking-widest uppercase">or</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {passkeyError && (
              <p role="alert" className="text-sm text-rarity-arcane text-center">{passkeyError}</p>
            )}
            <button
              type="button"
              onClick={handlePasskeySignIn}
              disabled={passkeyLoading}
              className="w-full px-6 py-3 text-sm tracking-widest uppercase border border-border text-secondary hover:text-primary disabled:opacity-40 transition-all"
            >
              {passkeyLoading ? "…" : "Sign in with passkey"}
            </button>
          </div>
        </Form>

        <p className="text-center text-xs opacity-60">
          No account yet?{" "}
          <Link to="/auth/signup" className="opacity-80 hover:opacity-100 transition-opacity underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
