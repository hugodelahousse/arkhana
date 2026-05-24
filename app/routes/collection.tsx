import { redirect } from "react-router";
import { memo, startTransition, useCallback, useState } from "react";
import { ViewTransition, addTransitionType } from "react";
import type { Route } from "./+types/collection";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { Button } from "../components/Button";
import { getAllPulls } from "../lib/pull";
import { MAJOR_ARCANA, MINOR_BY_SUIT, cardSlug } from "../lib/cards";
import type { CardDefinition, Rarity } from "../lib/cards";
import { Link, useNavigate } from "react-router";
import { DirectionalTransition } from "../components/DirectionalTransition";

interface BestPull {
  rarityScore: Rarity;
  isRadiant: boolean;
  isReversed: boolean;
}

export async function loader({ context, request }: Route.LoaderArgs) {
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

  return { user: context.user, bestByCard, origin: new URL(request.url).origin };
}

export function meta({ data }: Route.MetaArgs) {
  // data may be undefined if loader redirected
  const d = data as { user: { username?: string | null } | null; bestByCard: Record<number, unknown>; origin: string } | undefined;
  const discovered = d ? Object.keys(d.bestByCard ?? {}).length : 0;
  const username = d?.user?.username;
  const origin = d?.origin ?? "";
  const description = username
    ? `@${username} has discovered ${discovered}/78 cards on Arkhana.`
    : `${discovered}/78 cards discovered on Arkhana.`;
  const ogImage = username
    ? `${origin}/api/og.png?type=collection&username=${encodeURIComponent(username)}&discovered=${discovered}`
    : `${origin}/api/og.png?type=app`;
  return [
    { title: "Collection — Arkhana" },
    { name: "description", content: description },
    { property: "og:title", content: "My Collection — Arkhana" },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: ogImage },
  ];
}

const SUIT_ICONS: Record<string, string> = {
  wands: "⚡",
  cups: "♦",
  swords: "†",
  pentacles: "✧",
};

export default function Collection({ loaderData }: Route.ComponentProps) {
  const { user, bestByCard } = loaderData;
  const discoveredCount = Object.keys(bestByCard).length;
  const [hideUndiscovered, setHideUndiscovered] = useState(true);

  const majorDiscovered = MAJOR_ARCANA.filter((c) => bestByCard[c.id]).length;

  return (
    <DirectionalTransition>
      <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
        <Nav userName={user.name} isAnonymous={user.isAnonymous} />
        <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">

          <div className="text-center space-y-3">
            <h1
              className="text-2xl font-light tracking-widest"
              style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}
            >
              Collection
            </h1>
            <p
              className="text-xs tracking-widest uppercase opacity-40 whitespace-nowrap"
              style={{ color: "var(--color-text-primary)" }}
            >
              {discoveredCount}/78 discovered
            </p>
            <Button size="sm" onClick={() => setHideUndiscovered((v) => !v)}>
              {hideUndiscovered ? "Show all" : "Discovered only"}
            </Button>
          </div>

          {/* Category icon navigation */}
          <nav className="flex flex-wrap justify-center gap-6 sm:gap-10">
            {(!hideUndiscovered || majorDiscovered > 0) && (
              <a href="#major-arcana" className="flex flex-col items-center gap-2 group text-center">
                <span
                  className="text-3xl opacity-50 group-hover:opacity-90 transition-opacity"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  ✦
                </span>
                <p className="text-xs tracking-widest uppercase opacity-40 group-hover:opacity-70 transition-opacity"
                  style={{ color: "var(--color-text-primary)" }}>
                  Major Arcana
                </p>
                <p className="text-xs opacity-30" style={{ color: "var(--color-text-primary)" }}>
                  {majorDiscovered}/{MAJOR_ARCANA.length}
                </p>
              </a>
            )}
            {MINOR_BY_SUIT.map(({ suit, cards }) => {
              const discovered = cards.filter((c) => bestByCard[c.id]).length;
              if (hideUndiscovered && discovered === 0) return null;
              return (
                <a key={suit} href={`#${suit}`} className="flex flex-col items-center gap-2 group text-center">
                  <span
                    className="text-3xl opacity-50 group-hover:opacity-90 transition-opacity"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {SUIT_ICONS[suit]}
                  </span>
                  <p
                    className="text-xs tracking-widest uppercase opacity-40 capitalize group-hover:opacity-70 transition-opacity"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {suit}
                  </p>
                  <p className="text-xs opacity-30" style={{ color: "var(--color-text-primary)" }}>
                    {discovered}/{cards.length}
                  </p>
                </a>
              );
            })}
          </nav>

          {(!hideUndiscovered || majorDiscovered > 0) && (
            <section id="major-arcana" className="space-y-4">
              <h2
                className="text-xs tracking-widest uppercase opacity-50 flex items-baseline gap-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                Major Arcana
                <span className="opacity-60">
                  {majorDiscovered}/{MAJOR_ARCANA.length}
                </span>
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {MAJOR_ARCANA.filter((c) => !hideUndiscovered || bestByCard[c.id]).map((card) => (
                  <CardTile key={card.id} card={card} best={bestByCard[card.id]} />
                ))}
              </div>
            </section>
          )}

          {MINOR_BY_SUIT.filter(({ cards }) => !hideUndiscovered || cards.some((c) => bestByCard[c.id])).map(({ suit, cards }) => {
            const suitDiscovered = cards.filter((c) => bestByCard[c.id]).length;
            return (
              <section key={suit} id={suit} className="space-y-4">
                <h2
                  className="text-xs tracking-widest uppercase opacity-50 capitalize flex items-baseline gap-2"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {suit}
                  <span className="opacity-60">
                    {suitDiscovered}/{cards.length}
                  </span>
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4">
                  {cards.filter((c) => !hideUndiscovered || bestByCard[c.id]).map((card) => (
                    <CardTile key={card.id} card={card} best={bestByCard[card.id]} />
                  ))}
                </div>
              </section>
            );
          })}
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
