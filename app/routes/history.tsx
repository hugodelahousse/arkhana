import { redirect } from "react-router";
import { motion } from "motion/react";
import { DateTime } from "luxon";
import { ArrowRight } from "@phosphor-icons/react";
import type { Route } from "./+types/history";
import { Link } from "react-router";
import { Nav } from "../components/layout/nav";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { TarotCard } from "../components/TarotCard";
import { SpreadSummaryGrid } from "../components/SpreadSummaryGrid";
import { CARD_BY_ID, RARITY_LABELS, getCardDescription, cardSlug, type Rarity } from "../lib/cards";
import { getSpreadType } from "../lib/spreads";
import { getDailyPullHistory } from "../lib/pull";
import { getSpreadHistory } from "../lib/spread-pull";
import type { SpreadCardResult } from "../lib/spread-pull";

type DailyEntry = {
  kind: "daily";
  id: number;
  pullDate: string;
  cardId: number;
  rarityScore: number;
  isRadiant: boolean;
  isReversed: boolean;
};

type SpreadEntry = {
  kind: "spread";
  spreadId: number;
  spreadType: string;
  spreadDate: string;
  cards: SpreadCardResult[];
};

type HistoryEntry = DailyEntry | SpreadEntry;

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) return redirect("/auth/signin");

  const userId = context.user.id;
  const [dailyPulls, spreadHistory] = await Promise.all([
    getDailyPullHistory(userId),
    getSpreadHistory(userId),
  ]);

  const entries: HistoryEntry[] = [
    ...dailyPulls.map((p): DailyEntry => ({
      kind: "daily",
      id: p.id,
      pullDate: p.pullDate,
      cardId: p.cardId,
      rarityScore: p.rarityScore,
      isRadiant: p.isRadiant,
      isReversed: p.isReversed,
    })),
    ...spreadHistory.map((s): SpreadEntry => ({
      kind: "spread",
      spreadId: s.spreadId,
      spreadType: s.spreadType,
      spreadDate: s.spreadDate,
      cards: s.cards,
    })),
  ].sort((a, b) => {
    const dateA = a.kind === "daily" ? a.pullDate : a.spreadDate;
    const dateB = b.kind === "daily" ? b.pullDate : b.spreadDate;
    return dateB.localeCompare(dateA);
  });

  return { user: context.user, entries };
}

export function meta() {
  return [{ title: "History — Arkhana" }];
}

export default function History({ loaderData }: Route.ComponentProps) {
  const { user, entries } = loaderData;

  return (
    <DirectionalTransition>
      <div className="min-h-screen">
        <Nav userName={user.name} isAnonymous={user.isAnonymous} />
        <main className="max-w-2xl mx-auto px-6 py-12 space-y-12">
          <div className="space-y-1">
            <h1 className="text-2xl font-light tracking-widest text-primary font-serif">
              History
            </h1>
            <p className="text-xs tracking-widest uppercase opacity-40 text-secondary">
              All your pulls, in order
            </p>
          </div>

          {entries.length === 0 ? (
            <p className="text-sm opacity-40 text-center py-12 text-secondary font-serif">
              No readings yet. Draw your first card.
            </p>
          ) : (
            <div className="space-y-10">
              {entries.map((entry) => (
                <HistoryItem key={entry.kind === "daily" ? `d-${entry.id}` : `s-${entry.spreadId}`} entry={entry} />
              ))}
            </div>
          )}
        </main>
      </div>
    </DirectionalTransition>
  );
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  if (entry.kind === "daily") {
    const card = CARD_BY_ID[entry.cardId];
    const rarityLabel = RARITY_LABELS[entry.rarityScore]?.toLowerCase();
    const slug = cardSlug(card);
    const date = DateTime.fromISO(entry.pullDate, { zone: "utc" }).toFormat("LLLL d, yyyy");

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-3"
      >
        <p className="text-xs tracking-widest uppercase opacity-40 text-secondary">
          {date}
        </p>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <Link to={`/collection/${slug}`} className="block w-28 shrink-0">
            <TarotCard
              card={card}
              rarityScore={entry.rarityScore as Rarity}
              isReversed={entry.isReversed}
              isRadiant={entry.isRadiant}
              revealed={true}
              size="sm"
            />
          </Link>
          <div className="space-y-2 text-center sm:text-left">
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: `var(--color-rarity-${rarityLabel})` }}
            >
              {RARITY_LABELS[entry.rarityScore]}
              {entry.isRadiant && " ✦"}
              {entry.isReversed && " · Reversed"}
            </p>
            <p className="text-lg font-light text-secondary font-serif">
              {card.name}
            </p>
            <p className="text-sm leading-relaxed opacity-70 text-secondary font-serif">
              {getCardDescription(card, entry.rarityScore as Rarity, entry.isReversed)}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Spread entry
  const spreadDef = getSpreadType(entry.spreadType);
  const name = spreadDef?.name ?? entry.spreadType;
  const positions = spreadDef?.positions ?? [];
  const date = DateTime.fromISO(entry.spreadDate, { zone: "utc" }).toFormat("LLLL d, yyyy");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="space-y-1">
        <p className="text-xs tracking-widest uppercase opacity-40 text-secondary">
          {date}
        </p>
        <p className="text-lg font-light text-secondary font-serif">
          {name}
        </p>
      </div>
      <SpreadSummaryGrid cards={entry.cards} positions={positions} />
      <Link
        to={`/spread/${entry.spreadType}/${entry.spreadDate}`}
        className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity text-secondary"
      >
        View full reading <ArrowRight weight="light" size={13} aria-hidden />
      </Link>
    </motion.div>
  );
}
