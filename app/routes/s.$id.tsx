import { data } from "react-router";
import { Link } from "react-router";
import type { Route } from "./+types/s.$id";
import { getSpreadById } from "../lib/spread-pull";
import type { SpreadCardResult } from "../lib/spread-pull";
import { getSpreadType } from "../lib/spreads";
import { SpreadSummaryGrid } from "../components/SpreadSummaryGrid";
import { ShareButton } from "../components/ShareButton";
import { db } from "../../db/index.js";
import { user } from "../../db/schema/auth.js";
import { eq } from "drizzle-orm";
import { getOrigin } from "../lib/utils";

export async function loader({ params, request }: Route.LoaderArgs) {
  const spreadId = parseInt(params.id, 10);
  if (isNaN(spreadId)) throw data("Not found", { status: 404 });

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

  return {
    spreadId,
    handle,
    username: profile?.username ?? null,
    name: spreadDef.name,
    subtitle: spreadDef.subtitle,
    positions: spreadDef.positions,
    cards: spread.cards,
    spreadDate: spread.spreadDate,
    origin: getOrigin(request),
  };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Arkhana" }];
  const { name, subtitle, positions, cards, handle, origin } = loaderData;
  const positionLabels = positions.map((p: any) => p.label).join(",");
  const cardIds = cards.map((c: SpreadCardResult) => c.cardId).join(",");
  const rarities = cards.map((c: SpreadCardResult) => c.rarityScore).join(",");
  const reversals = cards.map((c: SpreadCardResult) => c.isReversed).join(",");
  const who = handle ? `@${handle}'s ` : "";
  const ogImage =
    `${origin}/api/og.png?type=spread` +
    `&spreadName=${encodeURIComponent(name)}` +
    `&spreadSubtitle=${encodeURIComponent(subtitle)}` +
    `&positions=${encodeURIComponent(positionLabels)}` +
    `&cardIds=${cardIds}&rarities=${rarities}&reversals=${reversals}`;
  return [
    { title: `${who}${name} — Arkhana` },
    { property: "og:title", content: `${who}${name} — Arkhana` },
    { property: "og:description", content: subtitle },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: ogImage },
  ];
}

export default function SpreadByIdRoute({ loaderData }: Route.ComponentProps) {
  const { spreadId, handle, username, name, subtitle, positions, cards, spreadDate } = loaderData;
  const shareUrl = username ? `/u/${username}/pull/${spreadDate}` : `/s/${spreadId}`;

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
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
          to="/"
          className="text-xs tracking-widest uppercase opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "var(--color-text-primary)" }}
        >
          Draw your card
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12 space-y-10 text-center">
        <div className="space-y-3">
          {handle && (
            <p
              className="text-xs tracking-widest uppercase opacity-40"
              style={{ color: "var(--color-text-primary)" }}
            >
              {username ? (
                <Link to={`/u/${username}`} className="hover:opacity-100 transition-opacity">
                  @{handle}
                </Link>
              ) : (
                `@${handle}`
              )}
            </p>
          )}
          <h1
            className="text-2xl font-light tracking-wide"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
          >
            {name}
          </h1>
          <p
            className="text-xs opacity-30 tracking-widest uppercase"
            style={{ color: "var(--color-text-primary)" }}
          >
            {subtitle}
          </p>
        </div>

        <SpreadSummaryGrid cards={cards} positions={positions} />

        <div className="flex justify-center">
          <ShareButton
            title={`${name} — Arkhana`}
            url={shareUrl}
            text=""
            label="Share reading"
          />
        </div>

        <div
          className="py-8 space-y-4 border-t"
          style={{ borderColor: "var(--color-border-default)" }}
        >
          <p
            className="text-sm opacity-50"
            style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
          >
            The cards await your question.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-3 text-xs tracking-widest uppercase border transition-opacity hover:opacity-80"
            style={{ borderColor: "var(--color-text-primary)", color: "var(--color-text-primary)" }}
          >
            Draw your card →
          </Link>
        </div>
      </main>
    </div>
  );
}
