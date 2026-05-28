import { redirect, data, Form, useNavigation, useRevalidator, useFetcher } from "react-router";
import { useState, useEffect } from "react";
import type { Route } from "./+types/settings";
import { Nav } from "../components/layout/nav";
import { db } from "../../db/index.js";
import { user, passkey as passkeyTable } from "../../db/schema/auth.js";
import type { CardStyle } from "../../db/schema/auth.js";
import { eq, and, ne } from "drizzle-orm";
import { getThemeFromCookie, setThemeCookie, type Theme } from "../lib/theme";
import { setCardStyleCookie } from "../lib/cardStyle";
import { pregenerateAll } from "../lib/procgenCache";

function hashUserId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  if (!context.user || context.user.isAnonymous) return redirect("/");
  const [profile] = await db
    .select({ username: user.username, displayUsername: user.displayUsername, preferences: user.preferences })
    .from(user)
    .where(eq(user.id, context.user.id))
    .limit(1);
  const passkeys = await db
    .select({
      id: passkeyTable.id,
      name: passkeyTable.name,
      deviceType: passkeyTable.deviceType,
      createdAt: passkeyTable.createdAt,
    })
    .from(passkeyTable)
    .where(eq(passkeyTable.userId, context.user.id));
  const cardStyle = (profile?.preferences?.cardStyle ?? "classic") as CardStyle;
  const headers = new Headers();
  headers.set("Set-Cookie", setCardStyleCookie(cardStyle));
  return data({
    user: context.user,
    username: profile?.displayUsername ?? profile?.username ?? "",
    cardStyle,
    passkeys,
    theme: getThemeFromCookie(request),
  }, { headers });
}

export async function action({ request, context }: Route.ActionArgs) {
  if (!context.user || context.user.isAnonymous) return redirect("/");

  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "set-theme") {
    const theme = String(form.get("theme") ?? "system");
    if (!["light", "dark", "system"].includes(theme))
      return data({ error: "Invalid theme." }, { status: 400 });
    const [row] = await db
      .select({ preferences: user.preferences })
      .from(user)
      .where(eq(user.id, context.user.id))
      .limit(1);
    const prefs = { ...(row?.preferences ?? {}), theme: theme as Theme };
    await db.update(user).set({ preferences: prefs }).where(eq(user.id, context.user.id));
    return data(
      { success: true },
      { headers: { "Set-Cookie": setThemeCookie(theme as Theme) } },
    );
  }

  if (intent === "set-card-style") {
    const style = String(form.get("cardStyle") ?? "classic");
    if (!["classic", "procgen"].includes(style))
      return data({ error: "Invalid card style." }, { status: 400 });
    const [row] = await db
      .select({ preferences: user.preferences })
      .from(user)
      .where(eq(user.id, context.user.id))
      .limit(1);
    const prefs = { ...(row?.preferences ?? {}), cardStyle: style as CardStyle };
    await db.update(user).set({ preferences: prefs }).where(eq(user.id, context.user.id));
    return data(
      { success: true },
      { headers: { "Set-Cookie": setCardStyleCookie(style as CardStyle) } },
    );
  }

  if (intent === "delete-passkey") {
    const passkeyId = String(form.get("passkeyId") ?? "");
    if (!passkeyId) return data({ error: "Missing passkey ID." }, { status: 400 });
    await db
      .delete(passkeyTable)
      .where(and(eq(passkeyTable.id, passkeyId), eq(passkeyTable.userId, context.user.id)));
    return data({ success: true });
  }

  const raw = String(form.get("username") ?? "").trim();

  if (raw.length < 1)
    return data({ error: "Username must be at least 1 character." }, { status: 400 });
  if (raw.length > 30)
    return data({ error: "Username must be 30 characters or less." }, { status: 400 });
  if (!/^[a-z0-9_-]+$/i.test(raw))
    return data(
      { error: "Only letters, numbers, hyphens, and underscores are allowed." },
      { status: 400 },
    );

  const normalized = raw.toLowerCase();

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.username, normalized), ne(user.id, context.user.id)))
    .limit(1);

  if (existing)
    return data({ error: "That username is already taken." }, { status: 400 });

  await db
    .update(user)
    .set({ username: normalized, displayUsername: raw })
    .where(eq(user.id, context.user.id));

  return data({ success: true });
}

export function meta() {
  return [{ title: "Settings — Arkhana" }];
}

async function getPasskeyClient() {
  const { createAuthClient } = await import("better-auth/client");
  const { passkeyClient } = await import("@better-auth/passkey/client");
  return createAuthClient({ plugins: [passkeyClient()] });
}

export default function Settings({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const isSubmitting = navigation.state === "submitting";
  const themeFetcher = useFetcher();
  const cardStyleFetcher = useFetcher();
  // Optimistic: show the in-flight value immediately while the request is live
  const activeTheme: Theme =
    (themeFetcher.formData?.get("theme") as Theme) ?? loaderData.theme;
  const activeCardStyle: CardStyle =
    (cardStyleFetcher.formData?.get("cardStyle") as CardStyle) ?? loaderData.cardStyle;

  function setTheme(t: Theme) {
    // Apply class instantly for zero-latency feedback
    const isDark =
      t === "dark" ||
      (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    themeFetcher.submit({ intent: "set-theme", theme: t }, { method: "post" });
  }
  const error = actionData && "error" in actionData ? actionData.error : null;
  const success = actionData && "success" in actionData ? actionData.success : false;
  const [passkeyAdding, setPasskeyAdding] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  // Push notification state
  const pushSupported = typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window;
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    () => pushSupported ? Notification.permission : "default"
  );
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setPushSubscribed(!!sub))
    );
  }, [pushSupported]);

  async function handlePushToggle() {
    setPushLoading(true);
    try {
      if (pushSubscribed) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setPushSubscribed(false);
      } else {
        const keyRes = await fetch("/api/push/vapid-public-key");
        if (!keyRes.ok) return;
        const { publicKey } = await keyRes.json();

        const permission = await Notification.requestPermission();
        setPushPermission(permission);
        if (permission !== "granted") return;

        const reg = await navigator.serviceWorker.ready;
        const padding = "=".repeat((4 - (publicKey.length % 4)) % 4);
        const b64 = (publicKey + padding).replace(/-/g, "+").replace(/_/g, "/");
        const raw = atob(b64);
        const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key as unknown as BufferSource,
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        setPushSubscribed(true);
      }
    } finally {
      setPushLoading(false);
    }
  }

  async function handleAddPasskey() {
    setPasskeyError(null);
    setPasskeyAdding(true);
    try {
      const client = await getPasskeyClient();
      const { error } = await client.passkey.addPasskey();
      if (error) {
        setPasskeyError("Failed to register passkey. Try again.");
        return;
      }
      revalidator.revalidate();
    } catch {
      setPasskeyError("Passkey registration was cancelled or is not supported.");
    } finally {
      setPasskeyAdding(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Nav userName={loaderData.user.name} isAnonymous={false} />
      <main className="max-w-lg mx-auto px-6 py-16 space-y-10">
        <div className="space-y-2">
          <h1 className="type-page-title text-2xl">
            Settings
          </h1>
          <p className="type-caption">
            {loaderData.user.email}
          </p>
        </div>

        <section className="p-6 space-y-6 border border-border bg-card">
          <h2 className="type-label">
            Username
          </h2>
          <p className="type-caption">
            Your username appears on your public profile at{" "}
            <span className="text-primary">
              arkhana.delaho-h.com/u/{loaderData.username || "username"}
            </span>
            .
          </p>
          <Form method="post" className="space-y-3">
            <div className="flex gap-3">
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                defaultValue={loaderData.username}
                minLength={1}
                maxLength={30}
                pattern="[a-zA-Z0-9_-]+"
                placeholder="your-username"
                autoComplete="username"
                className="flex-1 bg-transparent border border-border px-4 py-2 text-base sm:text-sm placeholder:opacity-40 focus:outline-none focus-visible:ring-1 transition-colors text-muted-foreground"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs tracking-widest uppercase border border-primary text-primary transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {isSubmitting ? "…" : "Save"}
              </button>
            </div>
            {error && (
              <p className="text-xs text-rarity-arcane" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="type-caption" role="status">
                Saved.
              </p>
            )}
          </Form>
        </section>

        <section className="p-6 space-y-6 border border-border bg-card">
          <h2 className="type-label">
            Theme
          </h2>
          <p className="type-caption">
            Control the color scheme. System follows your OS preference.
          </p>
          <div className="flex border border-border overflow-hidden">
            {(["system", "light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                aria-pressed={activeTheme === t}
                className={`flex-1 px-4 py-2.5 text-xs tracking-widest uppercase transition-colors ${
                  activeTheme === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="p-6 space-y-6 border border-border bg-card">
          <h2 className="type-label">
            Card Art
          </h2>
          <p className="type-caption">
            Choose the art style for your tarot cards.
            {activeCardStyle === "procgen" && (
              <span className="block mt-2 text-ghost-foreground">
                Procedural generation based on{" "}
                <a href="https://watabou.itch.io/procgen-tarot" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
                  watabou&rsquo;s Procgen Tarot
                </a>
                .
              </span>
            )}
          </p>
          <div className="flex border border-border overflow-hidden">
            {([
              { value: "classic", label: "Rider-Waite-Smith" },
              { value: "procgen", label: "Procgen" },
            ] as const).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  cardStyleFetcher.submit(
                    { intent: "set-card-style", cardStyle: value },
                    { method: "post" },
                  );
                  if (value === "procgen") {
                    const seed = hashUserId(loaderData.user.id);
                    pregenerateAll(seed);
                  }
                }}
                aria-pressed={activeCardStyle === value}
                className={`flex-1 px-4 py-2.5 text-xs tracking-widest uppercase transition-colors ${
                  activeCardStyle === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="p-6 space-y-6 border border-border bg-card">
          <h2 className="type-label">
            Passkeys
          </h2>
          <p className="type-caption leading-relaxed">
            Passkeys let you sign in with biometrics or your device PIN instead of a password.
          </p>

          {loaderData.passkeys.length > 0 && (
            <ul className="space-y-3">
              {loaderData.passkeys.map((pk) => (
                <li key={pk.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="type-body truncate">
                      {pk.name || pk.deviceType || "Passkey"}
                    </p>
                    {pk.createdAt && (
                      <p className="type-ghost">
                        Added {new Date(pk.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-passkey" />
                    <input type="hidden" name="passkeyId" value={pk.id} />
                    <button
                      type="submit"
                      className="type-ghost hover:opacity-80 hover:text-rarity-arcane transition-all"
                    >
                      Remove
                    </button>
                  </Form>
                </li>
              ))}
            </ul>
          )}

          {passkeyError && (
            <p className="text-xs text-rarity-arcane" role="alert">{passkeyError}</p>
          )}

          <button
            type="button"
            onClick={handleAddPasskey}
            disabled={passkeyAdding}
            className="w-full px-4 py-3 text-xs tracking-widest uppercase border border-border text-muted-foreground hover:text-primary hover:border-primary disabled:opacity-40 transition-all"
          >
            {passkeyAdding ? "…" : "Add passkey"}
          </button>
        </section>
        {pushSupported && (
          <section className="p-6 space-y-6 border border-border bg-card">
            <h2 className="type-label">
              Notifications
            </h2>
            <p className="type-caption leading-relaxed">
              Get a daily reminder when you haven't drawn your card, plus streak milestones
              and celestial events.
            </p>

            {pushPermission === "denied" ? (
              <p className="text-xs text-rarity-arcane">
                Notifications are blocked. Update your browser settings to allow them.
              </p>
            ) : (
              <button
                type="button"
                onClick={handlePushToggle}
                disabled={pushLoading}
                className="w-full px-4 py-3 text-xs tracking-widest uppercase border border-border text-muted-foreground hover:text-primary hover:border-primary disabled:opacity-40 transition-all"
              >
                {pushLoading ? "…" : pushSubscribed ? "Disable notifications" : "Enable notifications"}
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
