import { redirect } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/collection";
import { Button } from "../components/Button";
import { getAllPulls } from "../lib/pull";
import type { Rarity } from "../lib/cards";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { CollectionGrid, type BestPull } from "../components/CollectionGrid";
import { config } from "../../config/index.js";

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");
  const allPulls = await getAllPulls(context.user.id);

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

  return { user: context.user, bestByCard, origin: config.appOrigin };
}

export function meta({ data }: Route.MetaArgs) {
  const d = data as { user: { username?: string | null } | null; bestByCard: Record<number, unknown>; origin: string } | undefined;
  const discovered = d ? Object.keys(d.bestByCard ?? {}).length : 0;
  const username = d?.user?.username;
  const origin = d?.origin ?? "";
  const description = username
    ? `@${username} has discovered ${discovered}/78 cards on Arkhana.`
    : `${discovered}/78 cards discovered on Arkhana.`;
  const ogImage = username
    ? `${origin}/api/og.png?type=collection&username=${encodeURIComponent(username)}&discovered=${discovered}`
    : `${origin}/api/og.png?type=app`;
  return [
    { title: "Collection — Arkhana" },
    { name: "description", content: description },
    { name: "robots", content: "noindex, nofollow" },
    { property: "og:title", content: "My Collection — Arkhana" },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:site_name", content: "Arkhana" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:image", content: ogImage },
  ];
}

export default function Collection({ loaderData }: Route.ComponentProps) {
  const { bestByCard } = loaderData;
  const discoveredCount = Object.keys(bestByCard).length;
  const [hideUndiscovered, setHideUndiscovered] = useState(true);

  return (
    <DirectionalTransition>
      <div className="min-h-screen">
        <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
          <div className="text-center space-y-3">
            <h1 className="type-page-title text-2xl">
              Collection
            </h1>
            <p className="type-ghost whitespace-nowrap">
              {discoveredCount}/78 discovered
            </p>
            <Button size="sm" onClick={() => setHideUndiscovered((v) => !v)}>
              {hideUndiscovered ? "Show all" : "Discovered only"}
            </Button>
          </div>

          <CollectionGrid bestByCard={bestByCard} hideUndiscovered={hideUndiscovered} />
        </main>
      </div>
    </DirectionalTransition>
  );
}
