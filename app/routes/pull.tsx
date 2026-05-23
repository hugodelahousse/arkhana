import { redirect, useLoaderData, Form, useActionData } from "react-router";
import type { Route } from "./+types/pull";
import { Nav } from "../components/layout/nav";
import { dailyPull } from "../lib/pull";
import { RARITY_LABELS, getCardDescription } from "../lib/cards";

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) return redirect("/auth/signin");
  return { user: context.user };
}

export async function action({ context }: Route.ActionArgs) {
  if (!context.user) return redirect("/auth/signin");
  const result = await dailyPull(context.user.id);
  return result;
}

export function meta() {
  return [{ title: "Draw — Arkhana" }];
}

export default function Pull({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const result = actionData;
  const rarityLabel = result
    ? RARITY_LABELS[result.rarityScore]?.toLowerCase()
    : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
      <Nav userName={user.name} />
      <main className="max-w-lg mx-auto px-6 py-16 space-y-12 text-center">
        {!result ? (
          <div className="space-y-8">
            <h1
              className="text-4xl font-light tracking-wide"
              style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
            >
              What do you seek?
            </h1>
            <p
              className="opacity-50 text-sm"
              style={{ color: "var(--color-text-primary)" }}
            >
              The cards do not answer questions. They illuminate conditions.
            </p>
            <Form method="post">
              <button
                type="submit"
                className="py-4 px-14 border tracking-widest text-sm uppercase transition-opacity hover:opacity-90"
                style={{
                  borderColor: "var(--color-border-default)",
                  color: "var(--color-text-muted)",
                }}
              >
                Draw
              </button>
            </Form>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {result.status === "already_pulled" && (
              <p
                className="text-xs tracking-widest uppercase opacity-50"
                style={{ color: "var(--color-text-primary)" }}
              >
                You have already drawn today
              </p>
            )}

            <div
              className={`mx-auto max-w-xs p-8 border space-y-5 ${result.isRadiant ? "is-radiant" : ""}`}
              style={{
                borderColor: `var(--color-rarity-${rarityLabel})`,
                background: "var(--color-bg-surface)",
              }}
            >
              <p
                className="text-xs tracking-widest uppercase"
                style={{ color: `var(--color-rarity-${rarityLabel})` }}
              >
                {RARITY_LABELS[result.rarityScore]}
                {result.isRadiant && " ✦"}
                {result.isReversed && " · Reversed"}
              </p>

              <h2
                className="text-3xl font-light tracking-wide"
                style={{
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-serif)",
                }}
              >
                {result.card.name}
              </h2>

              <div
                className="w-8 h-px mx-auto"
                style={{ background: `var(--color-rarity-${rarityLabel})`, opacity: 0.5 }}
              />

              <p
                className="text-sm leading-relaxed"
                style={{
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-serif)",
                  opacity: 0.85,
                }}
              >
                {getCardDescription(result.card, result.rarityScore, result.isReversed)}
              </p>
            </div>

            <div className="flex justify-center gap-8 text-xs tracking-widest uppercase">
              <a
                href="/dashboard"
                className="opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: "var(--color-text-primary)" }}
              >
                Dashboard
              </a>
              <a
                href={`/card/${result.card.id}`}
                className="opacity-50 hover:opacity-100 transition-opacity"
                style={{ color: "var(--color-text-primary)" }}
              >
                Card history
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
