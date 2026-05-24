import { data } from "react-router";
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
  cardSlug,
  type Rarity,
} from "../lib/cards";
import { Link, useNavigate } from "react-router";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { ShareButton } from "../components/ShareButton";

export async function loader({ context, params }: Route.LoaderArgs) {
  const card = CARD_BY_SLUG[params.slug];
  if (!card) throw data("Card not found", { status: 404 });

  const history =
    context.user ? await getUserCardHistory(context.user.id, card.id) : [];

  return { user: context.user ?? null, card, history };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Arkhana" }];
  const { card } = loaderData;
  const description = card.descriptions[2];
  const ogImage = `/api/og.png?type=card&cardId=${card.id}&rarity=3`;
  return [
    { title: `${card.name} — Arkhana` },
    { name: "description", content: description },
    { property: "og:title", content: `${card.name} — Arkhana` },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: `${card.name} — Arkhana` },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];
}

export default function CardDetail({ loaderData, params }: Route.ComponentProps) {
  const { user, card, history } = loaderData;
  const slug = params.slug ?? cardSlug(card);
  const mostRecent = history.length > 0 ? history[history.length - 1] : null;
  const navigate = useNavigate();

  const [activePull, setActivePull] = useState<number | null>(null);
  const displayPull =
    activePull !== null
      ? history.find((p) => p.id === activePull) ?? mostRecent
      : mostRecent;

  function goBack(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(() => {
      addTransitionType("nav-back");
      navigate(user ? "/collection" : "/");
    });
  }

  const defaultRarity: Rarity = displayPull
    ? (displayPull.rarityScore as Rarity)
    : 3;

  return (
    <DirectionalTransition>
      <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
        {user ? (
          <Nav userName={user.name} isAnonymous={user.isAnonymous} />
        ) : (
          <header
            className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b"
            style={{ borderColor: "var(--color-border-default)", opacity: 0.8 }}
          >
            <Link
              to="/"
              className="text-lg sm:text-xl tracking-widest font-serif"
              style={{ color: "var(--color-text-muted)" }}
            >
              ARKHANA
            </Link>
            <Link
              to="/auth/signup"
              className="text-xs tracking-widest uppercase opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-text-primary)" }}
            >
              Sign up
            </Link>
          </header>
        )}
        <main className="max-w-2xl mx-auto px-6 py-12 space-y-10">
          <div className="space-y-2 text-center">
            <a
              href={user ? "/collection" : "/"}
              onClick={goBack}
              className="inline-block text-xs tracking-widest uppercase opacity-30 hover:opacity-60 transition-opacity mb-4"
              style={{ color: "var(--color-text-primary)" }}
            >
              ← {user ? "Collection" : "Home"}
            </a>
            <p
              className="text-xs tracking-widest uppercase opacity-50"
              style={{ color: "var(--color-text-primary)" }}
            >
              {card.arcana === "major"
                ? "Major Arcana"
                : `${card.suit} · Minor Arcana`}
            </p>
            <h1
              className="text-4xl font-light"
              style={{
                color: "var(--color-text-muted)",
                fontFamily: "var(--font-serif)",
              }}
            >
              {card.name}
            </h1>
          </div>

          <div className="flex justify-center">
            <ViewTransition name={`card-${card.id}`} share="morph" default="none">
              <TarotCard
                key={activePull}
                card={card}
                rarityScore={defaultRarity}
                isReversed={displayPull?.isReversed ?? false}
                isRadiant={displayPull?.isRadiant ?? false}
                revealed={true}
                size="lg"
              />
            </ViewTransition>
          </div>

          {/* Share button */}
          <div className="flex justify-center">
            <ShareButton
              title={`${card.name} — Arkhana`}
              url={`/collection/${slug}`}
              text={`${card.name} · ${card.arcana === "major" ? "Major Arcana" : card.suit}`}
              label="Share card"
            />
          </div>

          {/* Personal pull history — only for authenticated users who have pulled this card */}
          {user && history.length > 0 ? (
            <section className="space-y-6">
              <h2
                className="text-xs tracking-widest uppercase opacity-50"
                style={{ color: "var(--color-text-primary)" }}
              >
                Your pulls
              </h2>
              <div className="space-y-4">
                {[...history].reverse().map((pull) => {
                  const rarityLabel = RARITY_LABELS[pull.rarityScore as Rarity]?.toLowerCase();
                  const isActive =
                    (activePull === null && pull.id === mostRecent?.id) ||
                    pull.id === activePull;
                  const description = getCardDescription(
                    card,
                    pull.rarityScore as Rarity,
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
                          aria-label={
                            [
                              RARITY_LABELS[pull.rarityScore as Rarity],
                              pull.isRadiant ? "Radiant" : null,
                              pull.isReversed ? "Reversed" : null,
                            ]
                              .filter(Boolean)
                              .join(", ") || undefined
                          }
                        >
                          <span aria-hidden="true">
                            {RARITY_LABELS[pull.rarityScore as Rarity]}
                            {pull.isRadiant && " ✦"}
                            {pull.isReversed && " · Reversed"}
                          </span>
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
          ) : user ? (
            /* Auth'd but hasn't drawn this card yet */
            <section
              className="p-6 text-center space-y-3 border"
              style={{
                borderColor: "var(--color-border-default)",
                background: "var(--color-bg-surface)",
              }}
            >
              <p
                className="text-sm opacity-50"
                style={{
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-serif)",
                }}
              >
                You haven't drawn this card yet.
              </p>
              <Link
                to="/"
                className="text-xs tracking-widest uppercase opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "var(--color-text-primary)" }}
              >
                Pull today's card →
              </Link>
            </section>
          ) : (
            /* Public view — card info */
            <section className="space-y-6">
              <h2
                className="text-xs tracking-widest uppercase opacity-50"
                style={{ color: "var(--color-text-primary)" }}
              >
                The card
              </h2>
              <div className="space-y-4">
                {(card.descriptions as string[]).map((desc: string, i: number) => {
                  const rarity = (i + 1) as Rarity;
                  const label = RARITY_LABELS[rarity as Rarity];
                  return (
                    <div
                      key={i}
                      className="p-5 border space-y-2"
                      style={{
                        borderColor: `var(--color-rarity-${label?.toLowerCase()})`,
                        background: "var(--color-bg-surface)",
                        opacity: 0.8,
                      }}
                    >
                      <span
                        className="text-xs tracking-widest uppercase"
                        style={{
                          color: `var(--color-rarity-${label?.toLowerCase()})`,
                        }}
                      >
                        {label}
                      </span>
                      <p
                        className="text-sm leading-relaxed"
                        style={{
                          color: "var(--color-text-primary)",
                          fontFamily: "var(--font-serif)",
                          opacity: 0.85,
                        }}
                      >
                        {desc}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div
                className="text-center pt-4 space-y-4 border-t"
                style={{ borderColor: "var(--color-border-default)" }}
              >
                <p
                  className="text-sm opacity-50"
                  style={{
                    color: "var(--color-text-primary)",
                    fontFamily: "var(--font-serif)",
                  }}
                >
                  Pull this card in your daily reading.
                </p>
                <Link
                  to="/auth/signup"
                  className="inline-block px-6 py-3 text-xs tracking-widest uppercase border transition-opacity hover:opacity-80"
                  style={{
                    borderColor: "var(--color-text-primary)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  Start your journey →
                </Link>
              </div>
            </section>
          )}
        </main>
      </div>
    </DirectionalTransition>
  );
}
