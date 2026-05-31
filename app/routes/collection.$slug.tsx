import { data } from "react-router";
import { useState, startTransition } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { ViewTransition, addTransitionType } from "react";
import type { Route } from "./+types/collection.$slug";
import { Nav } from "../components/layout/nav";
import { TarotCard } from "../components/TarotCard";
import { getUserCardHistory } from "../lib/pull";
import {
  CARD_BY_SLUG,
  RARITY_LABELS,
  cardSlug,
  type Rarity,
} from "../lib/cards";
import { Link, useNavigate } from "react-router";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { ShareButton } from "../components/ShareButton";
import { getOrigin } from "../lib/utils";
import { DateTime } from "luxon";
import { useT, useLocale } from "../i18n/provider";
import { getLocalizedCardName, getLocalizedCardDescription } from "../i18n/cards";

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const card = CARD_BY_SLUG[params.slug];
  if (!card) throw data("Card not found", { status: 404 });

  const history =
    context.user ? await getUserCardHistory(context.user.id, card.id) : [];

  return { user: context.user ?? null, card, history, origin: getOrigin(request) };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Arkhana" }];
  const { card, origin } = loaderData;
  const description = card.descriptions[2];
  const ogImage = `${origin}/api/og.png?type=card&cardId=${card.id}&rarity=3`;
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
  const t = useT();
  const locale = useLocale();
  const slug = params.slug ?? cardSlug(card);
  const mostRecent = history.length > 0 ? history[history.length - 1] : null;
  const navigate = useNavigate();
  const localizedCardName = getLocalizedCardName(card, locale);

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
      <div className="min-h-screen">
        {user ? (
          <Nav userName={user.name} isAnonymous={user.isAnonymous} />
        ) : (
          <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border opacity-80">
            <Link
              to="/"
              className="text-lg sm:text-xl tracking-widest font-serif text-primary"
            >
              ARKHANA
            </Link>
            <Link
              to="/auth/signup"
              className="type-label hover:opacity-100 transition-opacity"
            >
              {t("cardDetail.signUp")}
            </Link>
          </header>
        )}
        <main className="max-w-2xl mx-auto px-6 py-12 space-y-10">
          <div className="space-y-2 text-center">
            <a
              href={user ? "/collection" : "/"}
              onClick={goBack}
              className="inline-flex items-center gap-1.5 type-ghost hover:opacity-60 transition-opacity mb-4"
            >
              <ArrowLeft weight="light" size={13} aria-hidden />{user ? t("nav.collection") : "Arkhana"}
            </a>
            <p className="type-label">
              {card.arcana === "major"
                ? t("collection.majorArcana")
                : `${t(`collection.suits.${card.suit?.toLowerCase()}`)} · ${t("collection.minorArcana")}`}
            </p>
            <h1 className="type-page-title text-4xl">
              {localizedCardName}
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

          <div className="flex justify-center">
            <ShareButton
              title={`${localizedCardName} — Arkhana`}
              url={`/collection/${slug}`}
              text={`${localizedCardName} · ${card.arcana === "major" ? t("collection.majorArcana") : t(`collection.suits.${card.suit?.toLowerCase()}`)}`}
            />
          </div>

          {user && history.length > 0 ? (
            <section className="space-y-6">
              <h2 className="type-label">
                {t("cardDetail.pullHistory")} ({history.length})
              </h2>
              <div className="space-y-4">
                {[...history].reverse().map((pull) => {
                  const rarityLabel = RARITY_LABELS[pull.rarityScore as Rarity]?.toLowerCase();
                  const isActive =
                    (activePull === null && pull.id === mostRecent?.id) ||
                    pull.id === activePull;
                  const description = getLocalizedCardDescription(
                    card,
                    pull.rarityScore as Rarity,
                    pull.isReversed,
                    locale,
                  );
                  const formattedDate = DateTime.fromISO(pull.pullDate, { zone: "utc" }).toFormat("LLLL d, yyyy");
                  return (
                    <button
                      key={pull.id}
                      type="button"
                      onClick={() => setActivePull(pull.id)}
                      className="w-full text-left p-6 border space-y-3 transition-opacity bg-card"
                      style={{
                        borderColor: `var(--color-rarity-${rarityLabel})`,
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
                              pull.isRadiant ? t("cards.radiant") : null,
                              pull.isReversed ? t("cards.reversed") : null,
                            ]
                              .filter(Boolean)
                              .join(", ") || undefined
                          }
                        >
                          <span aria-hidden="true">
                            {RARITY_LABELS[pull.rarityScore as Rarity]}
                            {pull.isRadiant && " ✦"}
                            {pull.isReversed && ` · ${t("cards.reversed")}`}
                          </span>
                        </span>
                        <span className="type-caption">
                          {formattedDate}
                        </span>
                      </div>
                      <p className="type-body-serif">
                        {description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : user ? (
            <section className="p-6 text-center space-y-3 border border-border bg-card">
              <p className="type-body-serif">
                {t("cardDetail.noPulls")}
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 type-label hover:opacity-100 transition-opacity"
              >
                {t("cardDetail.draw")} <ArrowRight weight="light" size={13} aria-hidden />
              </Link>
            </section>
          ) : (
            <div className="text-center pt-4 space-y-4 border-t border-border">
              <p className="type-body-serif">
                {t("cardDetail.draw")}
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase border border-primary text-primary transition-opacity hover:opacity-80"
              >
                {t("nav.today")} <ArrowRight weight="light" size={14} aria-hidden />
              </Link>
            </div>
          )}
        </main>
      </div>
    </DirectionalTransition>
  );
}
