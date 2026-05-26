import { redirect, data, Form, useNavigation, useRevalidator } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/settings";
import { Nav } from "../components/layout/nav";
import { db } from "../../db/index.js";
import { user, passkey as passkeyTable } from "../../db/schema/auth.js";
import { eq, and, ne } from "drizzle-orm";

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user || context.user.isAnonymous) return redirect("/");
  const [profile] = await db
    .select({ username: user.username, displayUsername: user.displayUsername })
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
  return {
    user: context.user,
    username: profile?.displayUsername ?? profile?.username ?? "",
    passkeys,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  if (!context.user || context.user.isAnonymous) return redirect("/");

  const form = await request.formData();
  const intent = form.get("intent");

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
  const error = actionData && "error" in actionData ? actionData.error : null;
  const success = actionData && "success" in actionData ? actionData.success : false;
  const [passkeyAdding, setPasskeyAdding] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

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
          <h1 className="text-2xl font-light tracking-wide text-primary font-serif">
            Settings
          </h1>
          <p className="text-xs tracking-widest uppercase opacity-40 text-secondary">
            {loaderData.user.email}
          </p>
        </div>

        <section className="p-6 space-y-6 border border-border bg-surface">
          <h2 className="text-xs tracking-widest uppercase opacity-50 text-secondary">
            Username
          </h2>
          <p className="text-xs opacity-50 leading-relaxed text-secondary">
            Your username appears on your public profile at{" "}
            <span className="text-primary">
              arkhana.app/u/{loaderData.username || "username"}
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
                className="flex-1 bg-transparent border border-border px-4 py-2 text-base sm:text-sm placeholder:opacity-40 focus:outline-none focus-visible:ring-1 transition-colors text-secondary"
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
              <p className="text-xs opacity-60 tracking-widest uppercase text-secondary" role="status">
                Saved.
              </p>
            )}
          </Form>
        </section>

        <section className="p-6 space-y-6 border border-border bg-surface">
          <h2 className="text-xs tracking-widest uppercase opacity-50 text-secondary">
            Passkeys
          </h2>
          <p className="text-xs opacity-50 leading-relaxed text-secondary">
            Passkeys let you sign in with biometrics or your device PIN instead of a password.
          </p>

          {loaderData.passkeys.length > 0 && (
            <ul className="space-y-3">
              {loaderData.passkeys.map((pk) => (
                <li key={pk.id} className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm text-secondary truncate">
                      {pk.name || pk.deviceType || "Passkey"}
                    </p>
                    {pk.createdAt && (
                      <p className="text-[10px] tracking-widest uppercase opacity-40">
                        Added {new Date(pk.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete-passkey" />
                    <input type="hidden" name="passkeyId" value={pk.id} />
                    <button
                      type="submit"
                      className="text-[10px] tracking-widest uppercase opacity-40 hover:opacity-80 hover:text-rarity-arcane transition-all"
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
            className="w-full px-4 py-3 text-xs tracking-widest uppercase border border-border text-secondary hover:text-primary hover:border-primary disabled:opacity-40 transition-all"
          >
            {passkeyAdding ? "…" : "Add passkey"}
          </button>
        </section>
      </main>
    </div>
  );
}
