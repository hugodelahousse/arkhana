import { redirect } from "react-router";
import { memo, startTransition, useCallback } from "react";
import { ViewTransition, addTransitionType } from "react";
import type { Route } from "./+types/collection";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { getUserCards } from "../lib/pull";
import { MAJOR_ARCANA, MINOR_BY_SUIT, cardSlug } from "../lib/cards";
import type { CardDefinition } from "../lib/cards";
import { Link, useNavigate } from "react-router";
import { DirectionalTransition } from "../components/DirectionalTransition";

interface BestPull {
  rarityScore: 1 | 2 | 3 | 4 | 5;
  isRadiant: boolean;
  isReversed: boolean;
}

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");
  const allPulls = await getUserCards(context.user.id);

  const bestByCard: Record<number, BestPull> = {};
  for (const pull of allPulls) {
    const prev = bestByCard[pull.cardId];
    if (!prev || pull.rarityScore > prev.rarityScore) {
      bestByCard[pull.cardId] = {
        rarityScore: pull.rarityScore as 1 | 2 | 3 | 4 | 5,
        isRadiant: pull.isRadiant,
        isReversed: pull.isReversed,
      };
    }
  }

  return { user: context.user, bestByCard };
}

export function meta() {
  return [{ title: "Collection — Arkhana" }];
}

export default function Collection({ loaderData }: Route.ComponentProps) {
  const { user, bestByCard } = loaderData;
  const discoveredCount = Object.keys(bestByCard).length;

  return (
    <DirectionalTransition>
      <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
        <Nav userName={user.name} />
        <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
          <div className="text-center space-y-2">
            <h1
              className="text-2xl font-light tracking-widest"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}
            >
              Collection
            </h1>
            <p
              className="text-xs tracking-widest uppercase opacity-40"
              style={{ color: "var(--color-text-primary)" }}
            >
              {discoveredCount} of 78 discovered
            </p>
          </div>

          <section className="space-y-4">
            <h2
              className="text-xs tracking-widest uppercase opacity-50"
              style={{ color: "var(--color-text-primary)" }}
            >
              Major Arcana
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {MAJOR_ARCANA.map((card) => (
                <CardTile key={card.id} card={card} best={bestByCard[card.id]} />
              ))}
            </div>
          </section>

          {MINOR_BY_SUIT.map(({ suit, cards }) => (
            <section key={suit} className="space-y-4">
              <h2
                className="text-xs tracking-widest uppercase opacity-50 capitalize"
                style={{ color: "var(--color-text-primary)" }}
              >
                {suit}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4">
                {cards.map((card) => (
                  <CardTile key={card.id} card={card} best={bestByCard[card.id]} />
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </DirectionalTransition>
  );
}

const CardTile = memo(function CardTile({
  card,
  best,
}: {
  card: CardDefinition;
  best?: BestPull;
}) {
  const navigate = useNavigate();
  const discovered = !!best;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startTransition(() => {
        addTransitionType("nav-forward");
        navigate(`/collection/${cardSlug(card)}`);
      });
    },
    [navigate, card],
  );

  if (!discovered) {
    return (
      <div style={{ opacity: 0.3 }}>
        <TarotCard
          card={card}
          rarityScore={1}
          isReversed={false}
          isRadiant={false}
          revealed={false}
          size="sm"
        />
      </div>
    );
  }

  return (
    <Link to={`/collection/${cardSlug(card)}`} onClick={handleClick}>
      <ViewTransition name={`card-${card.id}`} share="morph" default="none">
        <TarotCard
          card={card}
          rarityScore={best.rarityScore}
          isReversed={best.isReversed}
          isRadiant={best.isRadiant}
          revealed={true}
          size="sm"
        />
      </ViewTransition>
    </Link>
  );
});
