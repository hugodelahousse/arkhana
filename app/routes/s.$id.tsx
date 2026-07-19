import { data } from "react-router";
import { Link } from "react-router";
import type { SpreadPosition } from "../lib/spreads";
import { ArrowRight } from "@phosphor-icons/react";
import type { Route } from "./+types/s.$id";
import { getSpreadById } from "../lib/spread-pull";
import type { SpreadCardResult } from "../lib/spread-pull";
import { getSpreadType } from "../lib/spreads";
import { SpreadSummaryGrid } from "../components/SpreadSummaryGrid";
import { ShareButton } from "../components/ShareButton";
import { Nav } from "../components/layout/nav";
import { db } from "../../db/index.js";
import { user } from "../../db/schema/auth.js";
import { eq } from "drizzle-orm";
import { getOrigin } from "../lib/utils";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const spreadId = parseInt(params.id, 10);
  if (isNaN(spreadId) || spreadId <= 0 || spreadId > 2147483647) throw data("Not found", { status: 404 });

  const spread = await getSpreadById(spreadId);
  if (!spread) throw data("Not found", { status: 404 });

  const spreadDef = getSpreadType(spread.spreadType);
  if (!spreadDef) throw data("Not found", { status: 404 });

  const [profile] = await db
    .select({ displayUsername: user.displayUsername, username: user.username })
    .from(user)
    .where(eq(user.id, spread.userId))
    .limit(1);

  const handle = profile?.displayUsername ?? profile?.username ?? null;
  const viewer = context.user
    ? { name: context.user.name, isAnonymous: context.user.isAnonymous }
    : null;

  return {
    spreadId,
    handle,
    username: profile?.username ?? null,
    name: spreadDef.name,
    subtitle: spreadDef.subtitle,
    positions: spreadDef.positions,
    cards: spread.cards,
    spreadDate: spread.spreadDate,
    viewer,
    origin: getOrigin(request),
  };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Arkhana" }];
  const { name, subtitle, positions, cards, handle, spreadDate, origin } = loaderData;
  const positionLabels = positions.map((p: SpreadPosition) => p.label).join(",");
  const cardIds = cards.map((c: SpreadCardResult) => c.cardId).join(",");
  const rarities = cards.map((c: SpreadCardResult) => c.rarityScore).join(",");
  const reversals = cards.map((c: SpreadCardResult) => c.isReversed).join(",");
  const who = handle ? `@${handle}'s ` : "";
  const usernameParam = handle ? `&username=${encodeURIComponent(handle)}` : "";
  const dateParam = spreadDate ? `&date=${spreadDate}` : "";
  const ogImage =
    `${origin}/api/og.png?type=spread` +
    `&spreadName=${encodeURIComponent(name)}` +
    `&spreadSubtitle=${encodeURIComponent(subtitle)}` +
    `&positions=${encodeURIComponent(positionLabels)}` +
    `&cardIds=${cardIds}&rarities=${rarities}&reversals=${reversals}` +
    usernameParam + dateParam;
  return [
    { title: `${who}${name} — Arkhana` },
    { name: "robots", content: "noindex, nofollow" },
    { property: "og:title", content: `${who}${name} — Arkhana` },
    { property: "og:description", content: subtitle },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: "Arkhana" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: ogImage },
  ];
}

export default function SpreadByIdRoute({ loaderData }: Route.ComponentProps) {
  const { spreadId, handle, username, name, subtitle, positions, cards, spreadDate, viewer } = loaderData;
  const shareUrl = username ? `/u/${username}/pull/${spreadDate}` : `/s/${spreadId}`;
  const isRealAccount = !!viewer && !viewer.isAnonymous;

  return (
    <div className="min-h-screen">
      {isRealAccount && viewer ? (
        <Nav userName={viewer.name} isAnonymous={false} />
      ) : (
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border opacity-80">
          <Link to="/" className="text-lg sm:text-xl tracking-widest font-serif text-primary">
            ARKHANA
          </Link>
          <Link
            to="/"
            className="text-xs tracking-widest uppercase text-faint-foreground hover:text-foreground transition-colors"
          >
            Draw your card
          </Link>
        </header>
      )}

      <main className="max-w-lg mx-auto px-6 py-12 space-y-10 text-center">
        <div className="space-y-3">
          {handle && (
            <p className="type-label">
              {username ? (
                <Link to={`/u/${username}`} className="hover:text-foreground transition-colors">
                  @{handle}
                </Link>
              ) : (
                `@${handle}`
              )}
            </p>
          )}
          <h1 className="type-page-title text-3xl">
            {name}
          </h1>
          <p className="type-label">
            {subtitle}
          </p>
        </div>

        <SpreadSummaryGrid cards={cards} positions={positions} />

        <div className="flex justify-center">
          <ShareButton
            title={handle ? `@${handle}'s ${name} — Arkhana` : `${name} — Arkhana`}
            url={shareUrl}
            text=""
            label="Share reading"
          />
        </div>

        <div className="py-8 space-y-4 border-t border-border">
          <p className="type-body-serif">
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
