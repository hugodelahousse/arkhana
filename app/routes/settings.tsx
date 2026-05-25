import { redirect, data, Form, useNavigation } from "react-router";
import type { Route } from "./+types/settings";
import { Nav } from "../components/layout/nav";
import { db } from "../../db/index.js";
import { user } from "../../db/schema/auth.js";
import { eq, and, ne } from "drizzle-orm";

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user || context.user.isAnonymous) return redirect("/");
  const [profile] = await db
    .select({ username: user.username, displayUsername: user.displayUsername })
    .from(user)
    .where(eq(user.id, context.user.id))
    .limit(1);
  return { user: context.user, username: profile?.displayUsername ?? profile?.username ?? "" };
}

export async function action({ request, context }: Route.ActionArgs) {
  if (!context.user || context.user.isAnonymous) return redirect("/");

  const form = await request.formData();
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

export default function Settings({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const error = actionData && "error" in actionData ? actionData.error : null;
  const success = actionData && "success" in actionData ? actionData.success : false;

  return (
    <div className="min-h-screen bg-base">
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
              arkhana.app/u/
              {loaderData.username || "username"}
            </span>
            . Use 3–30 characters: letters, numbers, hyphens, underscores.
          </p>
          <Form method="post" className="space-y-3">
            {error && (
              <p className="text-sm text-rarity-arcane" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-rarity-wandering" role="status">
                Username updated.
              </p>
            )}
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
          </Form>
        </section>
      </main>
    </div>
  );
}
