import { redirect, data } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/card.$id";
import { Nav } from "../components/layout/nav";
import { getUserCardHistory } from "../lib/pull";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription } from "../lib/cards";

const paramsSchema = z.object({
  id: z.coerce.number().int().min(0).max(77),
});

export async function loader({ context, params }: Route.LoaderArgs) {
  if (!context.user) return redirect("/auth/signin");
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) throw data("Card not found", { status: 404 });
  const card = CARD_BY_ID[parsed.data.id];
  if (!card) throw data("Card not found", { status: 404 });

  const history = await getUserCardHistory(context.user.id, parsed.data.id);
  return { user: context.user, card, history };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.card?.name ?? "Card"} — Arkhana` }];
}

export default function CardDetail({ loaderData }: Route.ComponentProps) {
  const { user, card, history } = loaderData;
  const discovered = history.length > 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
      <Nav userName={user.name} />
      <main className="max-w-2xl mx-auto px-6 py-12 space-y-10">
        <div className="space-y-2">
          <p
            className="text-xs tracking-widest uppercase opacity-50"
            style={{ color: "var(--color-text-primary)" }}
          >
            {card.arcana === "major" ? "Major Arcana" : `${card.suit} · Minor Arcana`}
          </p>
          <h1
            className="text-4xl font-light"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}
          >
            {card.name}
          </h1>
        </div>

        {!discovered ? (
          <div
            className="py-12 text-center border"
            style={{
              borderColor: "var(--color-bg-elevated)",
              color: "var(--color-text-primary)",
              opacity: 0.4,
            }}
          >
            <p className="text-sm tracking-widest uppercase">Not yet drawn</p>
            <p className="text-xs mt-2 opacity-60">Draw your daily card to discover this one.</p>
          </div>
        ) : (
          <section className="space-y-6">
            <h2
              className="text-xs tracking-widest uppercase opacity-50"
              style={{ color: "var(--color-text-primary)" }}
            >
              Your pulls
            </h2>
            <div className="space-y-4">
              {[...history].reverse().map((pull) => {
                const rarityLabel = RARITY_LABELS[pull.rarityScore]?.toLowerCase();
                const description = getCardDescription(
                  card,
                  pull.rarityScore,
                  pull.isReversed
                );
                return (
                  <div
                    key={pull.id}
                    className="p-6 border space-y-3"
                    style={{
                      borderColor: `var(--color-rarity-${rarityLabel})`,
                      background: "var(--color-bg-surface)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs tracking-widest uppercase"
                        style={{ color: `var(--color-rarity-${rarityLabel})` }}
                      >
                        {RARITY_LABELS[pull.rarityScore]}
                        {pull.isRadiant && " ✦"}
                        {pull.isReversed && " · Reversed"}
                      </span>
                      <span
                        className="text-xs opacity-40"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {pull.pullDate}
                      </span>
                    </div>
                    <p
                      className="text-sm leading-relaxed"
                      style={{
                        color: "var(--color-text-primary)",
                        fontFamily: "var(--font-serif)",
                        opacity: 0.85,
                      }}
                    >
                      {description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
