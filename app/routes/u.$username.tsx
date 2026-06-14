import { data } from "react-router";
import { Link } from "react-router";
import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import type { Route } from "./+types/u.$username";
import { db } from "../../db/index.js";
import { user } from "../../db/schema/auth.js";
import { eq } from "drizzle-orm";
import { getUserPublicStats, getAllPulls } from "../lib/pull";
import { getFollowCounts, isFollowing } from "../lib/follows";
import { type Rarity } from "../lib/cards";
import { ShareButton } from "../components/ShareButton";
import { FollowButton } from "../components/FollowButton";
import { CollectionGrid, type BestPull } from "../components/CollectionGrid";
import { Nav } from "../components/layout/nav";
import { config } from "../../config/index.js";

export async function loader({ params, context }: Route.LoaderArgs) {
  const username = params.username.toLowerCase();
  const [profile] = await db
    .select({
      id: user.id,
      displayUsername: user.displayUsername,
      username: user.username,
      name: user.name,
      createdAt: user.createdAt,
      isAnonymous: user.isAnonymous,
    })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);

  if (!profile) throw data("Not found", { status: 404 });

  const [stats, allPulls, counts] = await Promise.all([
    getUserPublicStats(profile.id),
    getAllPulls(profile.id),
    getFollowCounts(profile.id),
  ]);

  const bestByCard: Record<number, BestPull> = {};
  for (const pull of allPulls) {
    const prev = bestByCard[pull.cardId];
    if (!prev || pull.rarityScore > prev.rarityScore) {
      bestByCard[pull.cardId] = {
        rarityScore: pull.rarityScore as Rarity,
        isRadiant: pull.isRadiant,
        isReversed: pull.isReversed,
      };
    }
  }

  const viewer = context.user;
  const isSelf = !!viewer && viewer.id === profile.id;
  const canFollow = !!viewer && !viewer.isAnonymous && !isSelf && !profile.isAnonymous;
  const following = canFollow ? await isFollowing(viewer!.id, profile.id) : false;

  return {
    profile,
    stats,
    counts,
    bestByCard,
    isSelf,
    canFollow,
    following,
    viewer: viewer ? { name: viewer.name, isAnonymous: viewer.isAnonymous } : null,
    origin: config.appOrigin,
  };
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
    { name: "robots", content: "noindex, nofollow" },
    { property: "og:title", content: `@${handle} on Arkhana` },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:type", content: "profile" },
    { property: "og:site_name", content: "Arkhana" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: `@${handle} on Arkhana` },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
  ];
}

export default function PublicProfile({ loaderData }: Route.ComponentProps) {
  const { profile, stats, counts, bestByCard, canFollow, following, isSelf, viewer } =
    loaderData;
  const isRealAccount = !!viewer && !viewer.isAnonymous;
  const handle = profile.displayUsername ?? profile.username ?? profile.name;
  const pct = Math.round((stats.uniqueCards / 78) * 100);
  const joinYear = new Date(profile.createdAt).getFullYear();
  const [hideUndiscovered, setHideUndiscovered] = useState(true);

  return (
    <div className="min-h-screen">
      {isRealAccount && viewer ? (
        <Nav userName={viewer.name} isAnonymous={false} />
      ) : (
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
      )}

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="type-label">
              Keeper of the Arkhive
            </p>
            <h1 className="text-4xl font-light text-primary font-serif">
              @{handle}
            </h1>
            <p className="type-caption">
              Keeper since {joinYear}
            </p>
            <p className="type-label">
              {isSelf ? (
                <Link to="/circle/people" className="hover:text-foreground transition-colors">
                  {counts.followers} followers · {counts.following} following
                </Link>
              ) : (
                <span>
                  {counts.followers} followers · {counts.following} following
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canFollow && profile.username && (
              <FollowButton username={profile.username} following={following} />
            )}
            <ShareButton
              title={`@${handle} on Arkhana`}
              url={`/u/${profile.username}`}
              text={`${handle} has discovered ${stats.uniqueCards}/78 tarot cards on Arkhana.`}
              label="Share profile"
              size="md"
            />
          </div>
        </div>

        <section className="p-6 space-y-6 border border-border bg-card">
          <div className="flex gap-10">
            <div>
              <p className="text-3xl font-light text-primary font-serif">
                {stats.uniqueCards}
                <span className="text-base text-faint-foreground">/78</span>
              </p>
              <p className="type-label mt-1">
                Cards discovered
              </p>
            </div>
            <div>
              <p className="text-3xl font-light text-primary font-serif">
                {stats.totalPulls}
              </p>
              <p className="type-label mt-1">
                Total pulls
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: "var(--accent)",
                  boxShadow: "0 0 12px 1px var(--accent)",
                }}
              />
            </div>
            <p className="type-label">
              {pct}% of the arkhive unlocked
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="type-label">Collection</h2>
            <button
              onClick={() => setHideUndiscovered((v) => !v)}
              className="text-xs tracking-widest uppercase text-faint-foreground hover:text-foreground transition-colors"
            >
              {hideUndiscovered ? "Show all" : "Discovered only"}
            </button>
          </div>
          <CollectionGrid bestByCard={bestByCard} hideUndiscovered={hideUndiscovered} />
        </section>

        {!isRealAccount && (
          <div className="text-center py-8 space-y-4 border-t border-border">
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
        )}
      </main>
    </div>
  );
}
