import { redirect } from "react-router";
import type { Route } from "./+types/collection";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { getAllPulls } from "../lib/pull";
import { CARDS, CARD_BY_ID, MAJOR_ARCANA, MINOR_BY_SUIT, cardSlug } from "../lib/cards";
import type { CardDefinition, Rarity } from "../lib/cards";
import { Link } from "react-router";

interface BestPull {
  rarityScore: Rarity;
  isRadiant: boolean;
  isReversed: boolean;
}

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");
  const allPulls = await getAllPulls(context.user.id);

  const bestByCard: Record<number, BestPull> = {};
  for (const pull of allPulls) {
    const prev = bestByCard[pull.cardId];
    if (!prev || pull.rarityScore > prev.rarityScore) {
      bestByCard[pull.cardId] = {
        rarityScore: pull.rarityScore as Rarity,
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
    <div className="min-h-screen bg-base">
      <Nav userName={user.name} />
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-light tracking-widest text-muted">
            Collection
          </h1>
          <p className="text-xs tracking-widest uppercase opacity-40">
            {discoveredCount} of 78 discovered
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xs tracking-widest uppercase opacity-50">
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
            <h2 className="text-xs tracking-widest uppercase opacity-50 capitalize">
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
  );
}

function CardTile({
  card,
  best,
}: {
  card: CardDefinition;
  best?: BestPull;
}) {
  const discovered = !!best;

  if (!discovered) {
    return (
      <div className="opacity-30">
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
    <Link to={`/collection/${cardSlug(card)}`}>
      <TarotCard
        card={card}
        rarityScore={best.rarityScore}
        isReversed={best.isReversed}
        isRadiant={best.isRadiant}
        revealed={true}
        size="sm"
      />
    </Link>
  );
}
