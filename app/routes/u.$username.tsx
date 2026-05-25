import { data } from "react-router";
import { Link } from "react-router";
import type { Route } from "./+types/u.$username";
import { db } from "../../db/index.js";
import { user } from "../../db/schema/auth.js";
import { eq } from "drizzle-orm";
import { getUserPublicStats } from "../lib/pull";
import { CARD_BY_ID, RARITY_LABELS, type Rarity } from "../lib/cards";
import { ShareButton } from "../components/ShareButton";
import { getOrigin } from "../lib/utils";

export async function loader({ params, request }: Route.LoaderArgs) {
  const username = params.username.toLowerCase();
  const [profile] = await db
    .select({
      id: user.id,
      displayUsername: user.displayUsername,
      username: user.username,
      name: user.name,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  if (!profile) throw data("Not found", { status: 404 });

  const stats = await getUserPublicStats(profile.id);
  return { profile, stats, origin: getOrigin(request) };
}

export function meta({ data: loaderData, params }: Route.MetaArgs) {
  if (!loaderData) return [{ title: "Arkhana" }];
  const { profile, stats, origin } = loaderData;
  const handle = profile.displayUsername ?? params.username;
  const description = `${handle} has discovered ${stats.uniqueCards}/78 cards on Arkhana.`;
  const ogImage = `${origin}/api/og.png?type=collection&username=${encodeURIComponent(handle)}&discovered=${stats.uniqueCards}`;
  return [
    { title: `@${handle} — Arkhana` },
    { name: "description", content: description },
    { property: "og:title", content: `@${handle} on Arkhana` },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:type", content: "profile" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: `@${handle} on Arkhana` },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];
}

export default function PublicProfile({ loaderData }: Route.ComponentProps) {
  const { profile, stats } = loaderData;
  const handle = profile.displayUsername ?? profile.username ?? profile.name;
  const pct = Math.round((stats.uniqueCards / 78) * 100);
  const joinYear = new Date(profile.createdAt).getFullYear();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border opacity-80">
        <Link to="/" className="text-lg sm:text-xl tracking-widest font-serif text-primary">
          ARKHANA
        </Link>
        <div className="flex items-center gap-3 sm:gap-6 text-xs tracking-widest uppercase">
          <Link
            to="/auth/signup"
            className="opacity-60 hover:opacity-100 transition-opacity text-secondary"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs tracking-widest uppercase opacity-40 text-secondary">
              Keeper of the Arkhive
            </p>
            <h1 className="text-4xl font-light text-primary font-serif">
              @{handle}
            </h1>
            <p className="text-xs opacity-40 text-secondary">
              Keeper since {joinYear}
            </p>
          </div>

          <ShareButton
            title={`@${handle} on Arkhana`}
            url={`/u/${profile.username}`}
            text={`${handle} has discovered ${stats.uniqueCards}/78 tarot cards on Arkhana.`}
            label="Share profile"
          />
        </div>

        <section className="p-6 space-y-6 border border-border bg-surface">
          <div className="flex gap-10">
            <div>
              <p className="text-3xl font-light text-primary font-serif">
                {stats.uniqueCards}
                <span className="text-base opacity-40">/78</span>
              </p>
              <p className="text-xs tracking-widest uppercase opacity-40 mt-1 text-secondary">
                Cards discovered
              </p>
            </div>
            <div>
              <p className="text-3xl font-light text-primary font-serif">
                {stats.totalPulls}
              </p>
              <p className="text-xs tracking-widest uppercase opacity-40 mt-1 text-secondary">
                Total pulls
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-1 rounded-full overflow-hidden bg-elevated">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background:
                    pct >= 80
                      ? "var(--color-rarity-primordial)"
                      : pct >= 50
                        ? "var(--color-rarity-arcane)"
                        : pct >= 25
                          ? "var(--color-rarity-mystic)"
                          : "var(--color-rarity-wandering)",
                }}
              />
            </div>
            <p className="text-xs opacity-30 tracking-widest uppercase text-secondary">
              {pct}% of the arkhive unlocked
            </p>
          </div>
        </section>

        {stats.recentCards.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xs tracking-widest uppercase opacity-50 text-secondary">
              Recent pulls
            </h2>
            <div className="space-y-2">
              {stats.recentCards.map((pull, i) => {
                const card = CARD_BY_ID[pull.cardId];
                const rarityLabel = RARITY_LABELS[pull.rarityScore as Rarity];
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b border-elevated opacity-70"
                  >
                    <span className="text-secondary font-serif">
                      {card?.name ?? "Unknown"}
                    </span>
                    <span
                      className="text-xs tracking-widest"
                      style={{ color: `var(--color-rarity-${rarityLabel?.toLowerCase()})` }}
                    >
                      {rarityLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="text-center py-8 space-y-4 border-t border-border">
          <p className="text-sm opacity-60 text-secondary font-serif">
            The cards await your question.
          </p>
          <Link
            to="/auth/signup"
            className="inline-block px-6 py-3 text-xs tracking-widest uppercase border border-primary text-primary transition-opacity hover:opacity-80"
          >
            Start your journey →
          </Link>
        </div>
      </main>
    </div>
  );
}
