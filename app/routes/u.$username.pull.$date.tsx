import { data } from "react-router";
import { Link } from "react-router";
import { ArrowRight } from "@phosphor-icons/react";
import type { Route } from "./+types/u.$username.pull.$date";
import { db } from "../../db/index.js";
import { user } from "../../db/schema/auth.js";
import { userCards } from "../../db/schema/user-cards.js";
import { spreads, spreadCards } from "../../db/schema/spreads.js";
import { eq, and } from "drizzle-orm";
import { DateTime } from "luxon";
import { TarotCard } from "../components/TarotCard";
import { SpreadSummaryGrid } from "../components/SpreadSummaryGrid";
import { ShareButton } from "../components/ShareButton";
import {
  CARD_BY_ID,
  RARITY_LABELS,
  getCardDescription,
  type Rarity,
} from "../lib/cards";
import { getSpreadType } from "../lib/spreads";
import type { SpreadCardResult } from "../lib/spread-pull";
import { getOrigin } from "../lib/utils";

type LoaderData =
  | { type: "daily"; handle: string; date: string; formattedDate: string; pull: { cardId: number; rarityScore: Rarity; isRadiant: boolean; isReversed: boolean }; origin: string }
  | { type: "spread"; handle: string; date: string; formattedDate: string; spreadName: string; spreadSubtitle: string; positions: { index: number; label: string; contemplationPrompt: string }[]; cards: SpreadCardResult[]; origin: string };

export async function loader({ params, request }: Route.LoaderArgs) {
  const username = params.username.toLowerCase();
  const [profile] = await db
    .select({ id: user.id, displayUsername: user.displayUsername, username: user.username })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
  if (!profile) throw data("Not found", { status: 404 });

  const dateParam = params.date;
  const date = DateTime.fromISO(dateParam, { zone: "utc" });
  if (!date.isValid) throw data("Invalid date", { status: 404 });
  const pullDate = date.toISODate()!;
  const handle = profile.displayUsername ?? profile.username ?? username;
  const formattedDate = date.toFormat("cccc, LLLL d, yyyy");
  const origin = getOrigin(request);

  const [spreadRow] = await db
    .select({ id: spreads.id, spreadType: spreads.spreadType })
    .from(spreads)
    .where(and(eq(spreads.userId, profile.id), eq(spreads.spreadDate, pullDate)))
    .limit(1);

  if (spreadRow) {
    const spreadDef = getSpreadType(spreadRow.spreadType);
    if (!spreadDef) throw data("Not found", { status: 404 });

    const rows = await db
      .select({
        position: spreadCards.position,
        positionKey: spreadCards.positionKey,
        userCardId: userCards.id,
        cardId: userCards.cardId,
        rarityScore: userCards.rarityScore,
        isRadiant: userCards.isRadiant,
        isReversed: userCards.isReversed,
      })
      .from(spreadCards)
      .innerJoin(userCards, eq(userCards.id, spreadCards.userCardId))
      .where(eq(spreadCards.spreadId, spreadRow.id))
      .orderBy(spreadCards.position);

    const cards: SpreadCardResult[] = rows.map((row) => ({
      ...row,
      rarityScore: row.rarityScore as Rarity,
      card: CARD_BY_ID[row.cardId],
    }));

    return {
      type: "spread" as const,
      handle,
      date: pullDate,
      formattedDate,
      spreadName: spreadDef.name,
      spreadSubtitle: spreadDef.subtitle,
      positions: spreadDef.positions,
      cards,
      origin,
    };
  }

  const [pull] = await db
    .select({
      cardId: userCards.cardId,
      rarityScore: userCards.rarityScore,
      isRadiant: userCards.isRadiant,
      isReversed: userCards.isReversed,
    })
    .from(userCards)
    .where(
      and(
        eq(userCards.userId, profile.id),
        eq(userCards.pullDate, pullDate),
        eq(userCards.pullType, "daily"),
      )
    )
    .limit(1);

  if (!pull) throw data("Not found", { status: 404 });

  return {
    type: "daily" as const,
    handle,
    date: pullDate,
    formattedDate,
    pull: { ...pull, rarityScore: pull.rarityScore as Rarity },
    origin,
  };
}

export function meta({ data: loaderData, params }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Arkhana" }];
  const d = loaderData as LoaderData;
  const origin = d.origin;

  if (d.type === "spread") {
    const positionLabels = d.positions.map((p) => p.label).join(",");
    const cardIds = d.cards.map((c) => c.cardId).join(",");
    const rarities = d.cards.map((c) => c.rarityScore).join(",");
    const reversals = d.cards.map((c) => c.isReversed).join(",");
    const ogImage =
      `${origin}/api/og.png?type=spread` +
      `&spreadName=${encodeURIComponent(d.spreadName)}` +
      `&spreadSubtitle=${encodeURIComponent(d.spreadSubtitle)}` +
      `&positions=${encodeURIComponent(positionLabels)}` +
      `&cardIds=${cardIds}&rarities=${rarities}&reversals=${reversals}`;
    return [
      { title: `@${d.handle}'s ${d.spreadName} — Arkhana` },
      { property: "og:title", content: `@${d.handle}'s ${d.spreadName}` },
      { property: "og:description", content: d.spreadSubtitle },
      { property: "og:image", content: ogImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ogImage },
    ];
  }

  const card = CARD_BY_ID[d.pull.cardId];
  const rarity = d.pull.rarityScore;
  const rarityLabel = RARITY_LABELS[rarity];
  const modifier = [d.pull.isReversed ? "Reversed" : null, d.pull.isRadiant ? "Radiant" : null].filter(Boolean).join(", ");
  const title = `@${d.handle} drew ${card.name}${modifier ? ` · ${modifier}` : ""} — Arkhana`;
  const description = `${rarityLabel} · ${getCardDescription(card, rarity, d.pull.isReversed)}`;
  const ogImage = `${origin}/api/og.png?type=card&cardId=${d.pull.cardId}&rarity=${rarity}&reversed=${d.pull.isReversed}&radiant=${d.pull.isRadiant}`;

  return [
    { title },
    { name: "description", content: description.slice(0, 200) },
    { property: "og:title", content: title },
    { property: "og:description", content: description.slice(0, 200) },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: ogImage },
  ];
}

export default function PublicPull({ loaderData }: Route.ComponentProps) {
  const d = loaderData as LoaderData;

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border opacity-80">
        <Link to="/" className="text-lg sm:text-xl tracking-widest font-serif text-primary">
          ARKHANA
        </Link>
        <Link
          to="/"
          className="text-xs tracking-widest uppercase opacity-60 hover:opacity-100 transition-opacity text-secondary"
        >
          Draw your card
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12 space-y-10 text-center">
        <div className="space-y-2">
          <p className="text-xs tracking-widest uppercase opacity-40 text-secondary">
            <Link to={`/u/${d.handle}`} className="hover:opacity-100 transition-opacity">
              @{d.handle}
            </Link>
            {" · "}{d.formattedDate}
          </p>
          {d.type === "spread" && (
            <h1 className="text-2xl font-light tracking-wide text-secondary font-serif">
              {d.spreadName}
            </h1>
          )}
        </div>

        {d.type === "daily" ? <DailyView data={d} /> : <SpreadView data={d} />}

        <div className="flex justify-center">
          <ShareButton
            title={d.type === "spread"
              ? `${d.spreadName} — Arkhana`
              : `${CARD_BY_ID[d.pull.cardId].name} — Arkhana`}
            url={`/u/${d.handle}/pull/${d.date}`}
            text={d.type === "spread"
              ? d.spreadSubtitle
              : `${RARITY_LABELS[d.pull.rarityScore]} ${CARD_BY_ID[d.pull.cardId].name}`}
            label="Share"
          />
        </div>

        <div className="py-8 space-y-4 border-t border-border">
          <p className="text-sm opacity-50 text-secondary font-serif">
            The cards await your question.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase border border-primary text-primary transition-opacity hover:opacity-80"
          >
            Draw your card <ArrowRight weight="light" size={14} aria-hidden />
          </Link>
        </div>
      </main>
    </div>
  );
}

function DailyView({ data }: { data: Extract<LoaderData, { type: "daily" }> }) {
  const card = CARD_BY_ID[data.pull.cardId];
  const rarity = data.pull.rarityScore;
  const rarityLabel = RARITY_LABELS[rarity];

  return (
    <>
      <div className="flex justify-center">
        <TarotCard
          card={card}
          rarityScore={rarity}
          isReversed={data.pull.isReversed}
          isRadiant={data.pull.isRadiant}
          revealed={true}
          size="lg"
        />
      </div>
      <div className="space-y-3">
        <p
          className="text-xs tracking-widest uppercase"
          style={{ color: `var(--color-rarity-${rarityLabel?.toLowerCase()})` }}
        >
          {rarityLabel}
          {data.pull.isRadiant && " ✦"}
          {data.pull.isReversed && " · Reversed"}
        </p>
        <h1 className="text-3xl font-light text-primary font-serif">
          {card.name}
        </h1>
        <div
          className="w-8 h-px mx-auto opacity-50"
          style={{ background: `var(--color-rarity-${rarityLabel?.toLowerCase()})` }}
        />
        <p className="text-sm leading-relaxed max-w-xs mx-auto opacity-80 text-secondary font-serif">
          {getCardDescription(card, rarity, data.pull.isReversed)}
        </p>
      </div>
    </>
  );
}

function SpreadView({ data }: { data: Extract<LoaderData, { type: "spread" }> }) {
  return (
    <SpreadSummaryGrid cards={data.cards} positions={data.positions} />
  );
}
