import { redirect, data } from "react-router";
import { motion } from "motion/react";
import { DateTime } from "luxon";
import type { Route } from "./+types/spread.$type.$date";
import { Link } from "react-router";
import { Nav } from "../components/layout/nav";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { SpreadSummaryGrid } from "../components/SpreadSummaryGrid";
import { getSpreadType } from "../lib/spreads";
import { getTodaySpread } from "../lib/spread-pull";
import { getOrigin } from "../lib/utils";

export async function loader({ context, params, request }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");

  const spreadDef = getSpreadType(params.type);
  if (!spreadDef) throw data("Spread not found", { status: 404 });

  // Validate date param
  const date = DateTime.fromISO(params.date, { zone: "utc" });
  if (!date.isValid) throw data("Invalid date", { status: 404 });
  const spreadDate = date.toISODate()!;

  const cards = await getTodaySpread(context.user.id, params.type, spreadDate);
  if (!cards) throw data("Reading not found", { status: 404 });

  const isToday = spreadDate === DateTime.utc().toISODate();
  const formattedDate = date.toFormat("cccc, LLLL d, yyyy");

  return {
    user: context.user,
    name: spreadDef.name,
    subtitle: spreadDef.subtitle,
    positions: spreadDef.positions,
    cards,
    formattedDate,
    isToday,
    origin: getOrigin(request),
  };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Arkhana" }];
  const { name, subtitle, positions, cards, origin } = loaderData;
  const positionLabels = positions.map((p) => p.label).join(",");
  const cardIds = cards.map((c) => c.cardId).join(",");
  const rarities = cards.map((c) => c.rarityScore).join(",");
  const reversals = cards.map((c) => c.isReversed).join(",");
  const ogImage =
    `${origin}/api/og.png?type=spread` +
    `&spreadName=${encodeURIComponent(name)}` +
    `&spreadSubtitle=${encodeURIComponent(subtitle)}` +
    `&positions=${encodeURIComponent(positionLabels)}` +
    `&cardIds=${cardIds}&rarities=${rarities}&reversals=${reversals}`;
  return [
    { title: `${name} — Arkhana` },
    { property: "og:title", content: `${name} — Arkhana` },
    { property: "og:description", content: subtitle },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: ogImage },
  ];
}

export default function SpreadDateRoute({ loaderData }: Route.ComponentProps) {
  const { user, name, subtitle, positions, cards, formattedDate, isToday } = loaderData;

  return (
    <DirectionalTransition>
      <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
        <Nav userName={user.name} isAnonymous={user.isAnonymous} />
        <main className="max-w-lg mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-10"
          >
            <div className="text-center space-y-3">
              <p
                className="text-xs tracking-widest uppercase opacity-40"
                style={{ color: "var(--color-text-primary)" }}
              >
                {isToday ? subtitle : formattedDate}
              </p>
              <h1
                className="text-2xl font-light tracking-wide"
                style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
              >
                {name}
              </h1>
              {!isToday && (
                <p
                  className="text-xs opacity-30 tracking-widest uppercase"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            <SpreadSummaryGrid cards={cards} positions={positions} />

            <div className="text-center pt-4 space-y-3">
              <Link
                to="/history"
                className="block text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity"
                style={{ color: "var(--color-text-primary)" }}
              >
                ← All readings
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    </DirectionalTransition>
  );
}
