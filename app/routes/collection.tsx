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
import { getOrigin } from "../lib/utils";
import { Moon, Lightning, Drop, Sword, Coin } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";


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

  return { user: context.user, bestByCard, origin: getOrigin(request) };
}

export function meta({ data }: Route.MetaArgs) {
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

const SUIT_ICONS: Record<string, Icon> = {
  wands: Lightning,
  cups: Drop,
  swords: Sword,
  pentacles: Coin,
};

export default function Collection({ loaderData }: Route.ComponentProps) {
  const { user, bestByCard } = loaderData;
  const discoveredCount = Object.keys(bestByCard).length;
  const [hideUndiscovered, setHideUndiscovered] = useState(true);

  const majorDiscovered = MAJOR_ARCANA.filter((c) => bestByCard[c.id]).length;

  return (
    <DirectionalTransition>
      <div className="min-h-screen">
        <Nav userName={user.name} isAnonymous={user.isAnonymous} />
        <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">

          <div className="text-center space-y-3">
            <h1 className="text-2xl font-light tracking-widest text-primary font-serif">
              Collection
            </h1>
            <p className="text-xs tracking-widest uppercase opacity-40 whitespace-nowrap text-secondary">
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
                <Moon weight="light" size={28} className="opacity-50 group-hover:opacity-90 transition-opacity" />
                <p className="text-xs tracking-widest uppercase opacity-40 group-hover:opacity-70 transition-opacity text-secondary">
                  Major Arcana
                </p>
                <p className="text-xs opacity-30 text-secondary">
                  {majorDiscovered}/{MAJOR_ARCANA.length}
                </p>
              </a>
            )}
            {MINOR_BY_SUIT.map(({ suit, cards }) => {
              const discovered = cards.filter((c) => bestByCard[c.id]).length;
              if (hideUndiscovered && discovered === 0) return null;
              const Icon = SUIT_ICONS[suit];
              return (
                <a key={suit} href={`#${suit}`} className="flex flex-col items-center gap-2 group text-center">
                  <Icon weight="light" size={28} className="opacity-50 group-hover:opacity-90 transition-opacity" />
                  <p className="text-xs tracking-widest uppercase opacity-40 capitalize group-hover:opacity-70 transition-opacity text-secondary">
                    {suit}
                  </p>
                  <p className="text-xs opacity-30 text-secondary">
                    {discovered}/{cards.length}
                  </p>
                </a>
              );
            })}
          </nav>

          {(!hideUndiscovered || majorDiscovered > 0) && (
            <section id="major-arcana" className="space-y-4">
              <h2 className="text-xs tracking-widest uppercase opacity-50 flex items-baseline gap-2 text-secondary">
                Major Arcana
                <span className="opacity-60">
                  {majorDiscovered}/{MAJOR_ARCANA.length}
                </span>
              </h2>
              <div className="flex flex-wrap justify-center gap-4 *:w-[calc((100%_-_2rem)/3)] sm:*:w-[calc((100%_-_3rem)/4)] md:*:w-[calc((100%_-_6rem)/7)]">
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
                <h2 className="text-xs tracking-widest uppercase opacity-50 capitalize flex items-baseline gap-2 text-secondary">
                  {suit}
                  <span className="opacity-60">
                    {suitDiscovered}/{cards.length}
                  </span>
                </h2>
                <div className="flex flex-wrap justify-center gap-4 *:w-[calc((100%_-_2rem)/3)] sm:*:w-[calc((100%_-_3rem)/4)] md:*:w-[calc((100%_-_6rem)/7)]">
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
      <div
        style={{
          aspectRatio: "350 / 600",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-default)",
          borderRadius: "6px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "0.4rem",
          opacity: 0.35,
        }}
        aria-label={`${card.name} — not yet discovered`}
      >
        <span
          style={{
            fontSize: "0.5rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--color-text-secondary)",
            opacity: 0.4,
            textAlign: "center",
            lineHeight: 1.2,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
          aria-hidden="true"
        >
          {card.name}
        </span>
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
