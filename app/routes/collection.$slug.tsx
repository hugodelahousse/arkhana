import { redirect, data } from "react-router";
import { useState, startTransition } from "react";
import { ViewTransition, addTransitionType } from "react";
import type { Route } from "./+types/collection.$slug";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { getUserCardHistory } from "../lib/pull";
import {
  CARD_BY_SLUG,
  RARITY_LABELS,
  getCardDescription,
} from "../lib/cards";
import { useNavigate } from "react-router";
import { DirectionalTransition } from "../components/DirectionalTransition";

export async function loader({ context, params }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");
  const card = CARD_BY_SLUG[params.slug];
  if (!card) throw data("Card not found", { status: 404 });

  const history = await getUserCardHistory(context.user.id, card.id);
  if (history.length === 0) throw data("Card not yet discovered", { status: 404 });
  return { user: context.user, card, history };
}

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.card?.name ?? "Card"} — Arkhana` }];
}

export default function CardDetail({ loaderData }: Route.ComponentProps) {
  const { user, card, history } = loaderData;
  const mostRecent = history[history.length - 1];
  const navigate = useNavigate();

  const [activePull, setActivePull] = useState<number | null>(null);
  const displayPull = activePull !== null
    ? history.find((p) => p.id === activePull) ?? mostRecent
    : mostRecent;

  function goBack(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(() => {
      addTransitionType("nav-back");
      navigate("/collection");
    });
  }

  return (
    <DirectionalTransition>
      <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
        <Nav userName={user.name} />
        <main className="max-w-2xl mx-auto px-6 py-12 space-y-10">
          <div className="space-y-2 text-center">
            <a
              href="/collection"
              onClick={goBack}
              className="inline-block text-xs tracking-widest uppercase opacity-30 hover:opacity-60 transition-opacity mb-4"
              style={{ color: "var(--color-text-primary)" }}
            >
              ← Collection
            </a>
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

          <div className="flex justify-center">
            <ViewTransition name={`card-${card.id}`} share="morph" default="none">
              <TarotCard
                key={activePull}
                card={card}
                rarityScore={(displayPull.rarityScore as 1 | 2 | 3 | 4 | 5)}
                isReversed={displayPull.isReversed}
                isRadiant={displayPull.isRadiant}
                revealed={true}
                size="lg"
              />
            </ViewTransition>
          </div>

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
                const isActive = (activePull === null && pull.id === mostRecent.id)
                  || pull.id === activePull;
                const description = getCardDescription(
                  card,
                  pull.rarityScore,
                  pull.isReversed,
                );
                return (
                  <button
                    key={pull.id}
                    type="button"
                    onClick={() => setActivePull(pull.id)}
                    className="w-full text-left p-6 border space-y-3 transition-opacity"
                    style={{
                      borderColor: `var(--color-rarity-${rarityLabel})`,
                      background: "var(--color-bg-surface)",
                      opacity: isActive ? 1 : 0.5,
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
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    </DirectionalTransition>
  );
}
