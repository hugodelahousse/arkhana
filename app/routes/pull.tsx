import { redirect, Form } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import type { Route } from "./+types/pull";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { dailyPull } from "../lib/pull";
import { RARITY_LABELS, getCardDescription } from "../lib/cards";
import { useAutoReveal } from "../lib/useAutoReveal";

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

  const [revealed, revealNow] = useAutoReveal(!!result, 600);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
      <Nav userName={user.name} />
      <main className="max-w-lg mx-auto px-6 py-16 text-center">
        {!result ? (
          <div className="space-y-10">
            <div className="space-y-4">
              <h1
                className="text-4xl font-light tracking-wide"
                style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
              >
                What do you seek?
              </h1>
              <p
                className="opacity-40 text-sm"
                style={{ color: "var(--color-text-primary)" }}
              >
                The cards do not answer questions. They illuminate conditions.
              </p>
            </div>
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
          <div className="space-y-10">
            {result.status === "already_pulled" && (
              <p
                className="text-xs tracking-widest uppercase opacity-40"
                style={{ color: "var(--color-text-primary)" }}
              >
                You have already drawn today
              </p>
            )}

            {/* Card */}
            <div className="flex justify-center" style={{ paddingBottom: "1rem" }}>
              <TarotCard
                card={result.card}
                rarityScore={result.rarityScore as 1 | 2 | 3 | 4 | 5}
                isReversed={result.isReversed}
                isRadiant={result.isRadiant}
                revealed={revealed}
                onReveal={revealNow}
                size="lg"
                showHint={!revealed}
              />
            </div>

            {/* Description — appears after reveal */}
            <AnimatePresence>
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  className="space-y-5"
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
                    className="text-sm leading-relaxed max-w-xs mx-auto"
                    style={{
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-serif)",
                      opacity: 0.85,
                    }}
                  >
                    {getCardDescription(result.card, result.rarityScore, result.isReversed)}
                  </p>

                  <div className="flex justify-center gap-8 text-xs tracking-widest uppercase pt-2">
                    <a
                      href="/dashboard"
                      className="opacity-40 hover:opacity-100 transition-opacity"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      Dashboard
                    </a>
                    <a
                      href={`/card/${result.card.id}`}
                      className="opacity-40 hover:opacity-100 transition-opacity"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      Card history
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
