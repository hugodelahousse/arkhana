import { data, Form, Link, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/casting";
import { buttonClass } from "../../components/Button";
import { createCastingDeck, listCastingDecksFor, voter } from "../../lib/casting/store";
import { CASTING_LIMITS } from "../../lib/casting/tally";

export function meta() {
  return [{ title: "Casting Lab — Arkhana" }, { name: "robots", content: "noindex, nofollow" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  const me = voter(context.user);
  return { signedIn: !!me, decks: me ? await listCastingDecksFor(me.id) : [] };
}

export async function action({ request, context }: Route.ActionArgs) {
  const me = voter(context.user);
  if (!me) return data({ error: "Sign in to create a deck." }, { status: 401 });
  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const theme = String(form.get("theme") ?? "").trim();
  if (!title) return data({ error: "Give the deck a name." }, { status: 400 });
  if (title.length > CASTING_LIMITS.title || theme.length > CASTING_LIMITS.theme)
    return data({ error: "That name or theme is too long." }, { status: 400 });
  const id = await createCastingDeck(me.id, title, theme);
  return redirect(`/lab/casting/${id}`);
}

const FIELD =
  "w-full border border-border bg-card px-3 py-2.5 text-base text-card-foreground placeholder:text-faint-foreground focus:border-ring focus:outline-none";

export default function CastingLabIndex({ loaderData, actionData }: Route.ComponentProps) {
  const { signedIn, decks } = loaderData;
  const creating = useNavigation().state !== "idle";

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-xl space-y-8">
        <header className="space-y-2">
          <p className="type-ghost">Lab</p>
          <h1 className="type-page-title text-4xl">Cast the Major Arcana</h1>
          <p className="type-body">
            Propose who should play each of the 22 cards, then rank the proposals together.
          </p>
        </header>

        {signedIn ? (
          <Form method="post" className="space-y-2">
            <div className="flex gap-2">
              <input
                name="title"
                required
                maxLength={CASTING_LIMITS.title}
                aria-label="Deck name"
                placeholder="New deck name"
                className={FIELD}
              />
              <button
                type="submit"
                disabled={creating}
                className={buttonClass("md", "fill", "shrink-0")}
              >
                Create
              </button>
            </div>
            <input
              name="theme"
              maxLength={CASTING_LIMITS.theme}
              aria-label="Where the cast comes from"
              placeholder="Cast drawn from… (optional)"
              className={FIELD}
            />
            {actionData?.error && <p className="text-sm text-rarity-arcane">{actionData.error}</p>}
          </Form>
        ) : (
          <p className="type-body">
            <Link to="/auth/signin" className="underline underline-offset-2">
              Sign in
            </Link>{" "}
            to create a deck.
          </p>
        )}

        {decks.length > 0 && (
          <ul className="divide-y divide-border border border-border">
            {decks.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/lab/casting/${d.id}`}
                  className="block bg-card px-4 py-3 text-card-foreground hover:bg-muted"
                >
                  <span className="block font-serif text-xl text-primary">{d.title}</span>
                  {d.theme && <span className="type-caption line-clamp-1">{d.theme}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
