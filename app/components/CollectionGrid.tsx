import { memo, startTransition, useCallback } from "react";
import { ViewTransition, addTransitionType } from "react";
import { Link, useNavigate } from "react-router";
import { TarotCard } from "./TarotCard";
import { MAJOR_ARCANA, MINOR_BY_SUIT, cardSlug } from "../lib/cards";
import type { CardDefinition, Rarity } from "../lib/cards";
import { Moon, Lightning, Drop, Sword, Coin } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export interface BestPull {
  rarityScore: Rarity;
  isRadiant: boolean;
  isReversed: boolean;
}

const SUIT_ICONS: Record<string, Icon> = {
  wands: Lightning,
  cups: Drop,
  swords: Sword,
  pentacles: Coin,
};

// The 78-card grid (Major Arcana + 4 minor suits) with category nav.
// Read-only and presentational — `hideUndiscovered` is controlled by the page,
// so it's reused for both the owner's /collection and a friend's /u/:username.
export function CollectionGrid({
  bestByCard,
  hideUndiscovered,
}: {
  bestByCard: Record<number, BestPull>;
  hideUndiscovered: boolean;
}) {
  const majorDiscovered = MAJOR_ARCANA.filter((c) => bestByCard[c.id]).length;

  return (
    <div className="space-y-12">
      {/* Category icon navigation */}
      <nav className="flex flex-wrap justify-center gap-6 sm:gap-10">
        {(!hideUndiscovered || majorDiscovered > 0) && (
          <a href="#major-arcana" className="flex flex-col items-center gap-2 group text-center">
            <Moon weight="light" size={28} className="opacity-50 group-hover:opacity-90 transition-opacity" />
            <p className="type-label group-hover:opacity-70 transition-opacity">
              Major Arcana
            </p>
            <p className="text-ghost-foreground text-xs">
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
              <p className="type-label capitalize group-hover:opacity-70 transition-opacity">
                {suit}
              </p>
              <p className="text-ghost-foreground text-xs">
                {discovered}/{cards.length}
              </p>
            </a>
          );
        })}
      </nav>

      {(!hideUndiscovered || majorDiscovered > 0) && (
        <section id="major-arcana" className="space-y-4">
          <h2 className="type-label flex items-baseline gap-2">
            Major Arcana
            <span className="text-ghost-foreground">
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
            <h2 className="type-label capitalize flex items-baseline gap-2">
              {suit}
              <span className="text-ghost-foreground">
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
    </div>
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
          background: "var(--muted)",
          border: "1px solid var(--border)",
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
            color: "var(--muted-foreground)",
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
