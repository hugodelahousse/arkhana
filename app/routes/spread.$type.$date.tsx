import { redirect, data } from "react-router";
import { motion } from "motion/react";
import { DateTime } from "luxon";
import { ArrowLeft } from "@phosphor-icons/react";
import type { Route } from "./+types/spread.$type.$date";
import { Link } from "react-router";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { SpreadSummaryGrid } from "../components/SpreadSummaryGrid";
import { ShareButton } from "../components/ShareButton";
import { getSpreadType } from "../lib/spreads";
import { getTodaySpread } from "../lib/spread-pull";
import { getOrigin } from "../lib/utils";

export async function loader({ context, params, request }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");

  const spreadDef = getSpreadType(params.type);
  if (!spreadDef) throw data("Spread not found", { status: 404 });

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
    spreadDate,
    formattedDate,
    isToday,
    origin: getOrigin(request),
  };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Arkhana" }];
  const { name, subtitle, positions, cards, spreadDate, user, origin } = loaderData;
  const positionLabels = positions.map((p) => p.label).join(",");
  const cardIds = cards.map((c) => c.cardId).join(",");
  const rarities = cards.map((c) => c.rarityScore).join(",");
  const reversals = cards.map((c) => c.isReversed).join(",");
  const usernameParam = user.username ? `&username=${encodeURIComponent(user.username)}` : "";
  const ogImage =
    `${origin}/api/og.png?type=spread` +
    `&spreadName=${encodeURIComponent(name)}` +
    `&spreadSubtitle=${encodeURIComponent(subtitle)}` +
    `&positions=${encodeURIComponent(positionLabels)}` +
    `&cardIds=${cardIds}&rarities=${rarities}&reversals=${reversals}` +
    usernameParam + `&date=${spreadDate}`;
  return [
    { title: `${name} — Arkhana` },
    { property: "og:title", content: `${name} — Arkhana` },
    { property: "og:description", content: subtitle },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: ogImage },
  ];
}

export default function SpreadDateRoute({ loaderData, params }: Route.ComponentProps) {
  const { user, name, subtitle, positions, cards, formattedDate, isToday } = loaderData;

  return (
    <DirectionalTransition>
      <div className="min-h-screen">
        <main className="max-w-lg mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-10"
          >
            <div className="text-center space-y-3">
              <p className="type-label">
                {isToday ? subtitle : formattedDate}
              </p>
              <h1 className="type-page-title text-3xl">
                {name}
              </h1>
              {!isToday && (
                <p className="type-label">
                  {subtitle}
                </p>
              )}
            </div>

            <SpreadSummaryGrid cards={cards} positions={positions} />

            <div className="flex flex-col items-center pt-4 space-y-4">
              <ShareButton
                title={user.username ? `@${user.username}'s ${name} — Arkhana` : `${name} — Arkhana`}
                url={user.username ? `/u/${user.username}/pull/${params.date}` : `/spread/${params.type}/${params.date}`}
                text={`${name}: ${subtitle}`}
                label="Share reading"
              />
              <Link
                to="/history"
                className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-faint-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft weight="light" size={13} aria-hidden />All readings
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    </DirectionalTransition>
  );
}
