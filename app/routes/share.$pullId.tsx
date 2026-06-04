import { data } from "react-router";
import { Link } from "react-router";
import { ArrowRight } from "@phosphor-icons/react";
import type { Route } from "./+types/share.$pullId";
import { getPullById } from "../lib/pull";
import {
  CARD_BY_ID,
  RARITY_LABELS,
  getCardDescription,
  cardSlug,
  type Rarity,
} from "../lib/cards";
import { db } from "../../db/index.js";
import { user } from "../../db/schema/auth.js";
import { eq } from "drizzle-orm";
import { TarotCard } from "../components/TarotCard";
import { ShareButton } from "../components/ShareButton";
import { getOrigin } from "../lib/utils";

export async function loader({ params, request }: Route.LoaderArgs) {
  const pullId = parseInt(params.pullId, 10);
  if (isNaN(pullId) || pullId <= 0 || pullId > 2147483647) throw data("Not found", { status: 404 });

  const pull = await getPullById(pullId);
  if (!pull || pull.pullType !== "daily") throw data("Not found", { status: 404 });

  const card = CARD_BY_ID[pull.cardId];
  if (!card) throw data("Not found", { status: 404 });

  const [profile] = await db
    .select({ displayUsername: user.displayUsername, username: user.username })
    .from(user)
    .where(eq(user.id, pull.userId))
    .limit(1);

  const handle = profile?.displayUsername ?? profile?.username ?? null;
  const username = profile?.username ?? null;

  return { pull, card, handle, username, origin: getOrigin(request) };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Arkhana" }];
  const { pull, card, handle, origin } = loaderData;
  const rarity = pull.rarityScore as Rarity;
  const rarityLabel = RARITY_LABELS[rarity];
  const who = handle ? `@${handle} drew ` : "";
  const modifier = [
    pull.isReversed ? "Reversed" : null,
    pull.isRadiant ? "Radiant" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const title = `${who}${card.name}${modifier ? ` (${modifier})` : ""} — Daily Pull on Arkhana`;
  const cardDescription = getCardDescription(card, rarity, pull.isReversed);
  const description = `${rarityLabel} pull. ${cardDescription}`;
  const ogImage = `${origin}/api/og.png?type=card&cardId=${pull.cardId}&rarity=${rarity}&reversed=${pull.isReversed}&radiant=${pull.isRadiant}${handle ? `&username=${encodeURIComponent(handle)}` : ""}${pull.pullDate ? `&date=${pull.pullDate}` : ""}`;

  return [
    { title },
    { name: "description", content: description.slice(0, 200) },
    { name: "robots", content: "noindex, nofollow" },
    { property: "og:title", content: title },
    { property: "og:description", content: description.slice(0, 200) },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: "Arkhana" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description.slice(0, 200) },
    { name: "twitter:image", content: ogImage },
  ];
}

export default function SharePull({ loaderData }: Route.ComponentProps) {
  const { pull, card, handle, username } = loaderData;
  const rarity = pull.rarityScore as Rarity;
  const rarityLabel = RARITY_LABELS[rarity];
  const description = getCardDescription(card, rarity, pull.isReversed);

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border opacity-80">
        <Link to="/" className="text-lg sm:text-xl tracking-widest font-serif text-primary">
          ARKHANA
        </Link>
        <div className="flex items-center gap-3 sm:gap-6 text-xs tracking-widest uppercase">
          <Link
            to="/auth/signup"
            className="text-faint-foreground hover:text-foreground transition-colors"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16 space-y-10 text-center">
        {handle && (
          <p className="type-label">
            @{handle} drew
          </p>
        )}

        <div className="flex justify-center">
          <TarotCard
            card={card}
            rarityScore={rarity}
            isReversed={pull.isReversed}
            isRadiant={pull.isRadiant}
            revealed={true}
            size="lg"
          />
        </div>

        <div className="space-y-4">
          <p
            className="text-xs tracking-widest uppercase"
            style={{ color: `var(--color-rarity-${rarityLabel?.toLowerCase()})` }}
            aria-label={
              [rarityLabel, pull.isRadiant ? "Radiant" : null, pull.isReversed ? "Reversed" : null]
                .filter(Boolean)
                .join(", ") || undefined
            }
          >
            <span aria-hidden="true">
              {rarityLabel}
              {pull.isRadiant && " ✦"}
              {pull.isReversed && " · Reversed"}
            </span>
          </p>
          <h1 className="text-4xl font-light text-primary font-serif">
            {card.name}
          </h1>
          <div
            className="w-8 h-px mx-auto opacity-50"
            style={{ background: `var(--color-rarity-${rarityLabel?.toLowerCase()})` }}
          />
          <p className="type-body-serif max-w-xs mx-auto">
            {description}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <ShareButton
            title={`${card.name} — Arkhana`}
            url={username ? `/u/${username}/pull/${pull.pullDate}` : `/share/${pull.id}`}
            text={`${rarityLabel} ${card.name}${pull.isReversed ? " (Reversed)" : ""}`}
            label="Share this pull"
          />
          <Link
            to={`/collection/${cardSlug(card)}`}
            className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-faint-foreground hover:text-foreground transition-colors"
          >
            View card <ArrowRight weight="light" size={13} aria-hidden />
          </Link>
        </div>

        <div className="py-8 space-y-4 border-t border-border">
          <p className="type-body-serif">
            The cards await your question.
          </p>
          <Link
            to="/auth/signup"
            className="inline-flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase border border-primary text-primary transition-opacity hover:opacity-80"
          >
            Start your journey <ArrowRight weight="light" size={14} aria-hidden />
          </Link>
        </div>
      </main>
    </div>
  );
}
