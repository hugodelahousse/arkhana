import { Link, redirect } from "react-router";
import { ArrowRight, UsersThree } from "@phosphor-icons/react";
import type { Route } from "./+types/circle";
import { TarotCard } from "../components/TarotCard";
import { DirectionalTransition } from "../components/DirectionalTransition";
import { getTodayPull } from "../lib/pull";
import { getCircleDailyPulls, type CircleEntry } from "../lib/follows";
import { CARD_BY_ID, RARITY_LABELS, type Rarity } from "../lib/cards";
import { nowForUser, todayForUser } from "../lib/utils";

export async function loader({ context }: Route.LoaderArgs) {
  const viewer = context.user;
  if (!viewer) return redirect("/");

  if (viewer.isAnonymous) {
    return { state: "anon" as const };
  }

  const todayLabel = nowForUser(viewer.timezone).toFormat("cccc, LLLL d");
  const localToday = todayForUser(viewer.timezone);
  const todayPull = await getTodayPull(viewer.id, localToday);

  if (!todayPull) {
    return { state: "gated" as const, todayLabel };
  }

  const feed = await getCircleDailyPulls(viewer.id);
  return { state: "ready" as const, feed, todayLabel };
}

export function meta() {
  return [
    { title: "Your Circle — Arkhana" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export default function Circle({ loaderData }: Route.ComponentProps) {
  if (loaderData.state === "anon") {
    return (
      <DirectionalTransition>
        <CenteredPrompt
          title="Your circle awaits"
          body="Create an account to follow other readers and see what your circle drew today."
          cta={{ to: "/auth/signup", label: "Sign up" }}
        />
      </DirectionalTransition>
    );
  }

  if (loaderData.state === "gated") {
    return (
      <DirectionalTransition>
        <CenteredPrompt
          eyebrow={`Today · ${loaderData.todayLabel}`}
          title="Draw your card to reveal your circle"
          body="The cards your circle drew today are hidden until you draw your own."
          cta={{ to: "/", label: "Draw today's card" }}
        />
      </DirectionalTransition>
    );
  }

  const { feed, todayLabel } = loaderData;
  const drawnCount = feed.filter((e) => e.pull).length;

  return (
    <DirectionalTransition>
      <div className="min-h-screen">
        <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
          <div className="text-center space-y-3">
            <p className="type-label">Today · {todayLabel}</p>
            <h1 className="type-page-title text-2xl">Your Circle</h1>
            {feed.length > 0 && (
              <p className="type-ghost whitespace-nowrap">
                {drawnCount}/{feed.length} have drawn
              </p>
            )}
          </div>

          {feed.length === 0 ? (
            <div className="text-center py-12 space-y-6 border border-border bg-card">
              <UsersThree weight="light" size={40} className="mx-auto opacity-50" aria-hidden />
              <div className="space-y-2">
                <p className="type-body-serif">Your circle is empty.</p>
                <p className="type-label">
                  Share your profile link or open a friend's to follow them.
                </p>
              </div>
              <Link
                to="/collection"
                className="inline-flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase border border-primary text-primary transition-opacity hover:opacity-80"
              >
                Explore your collection <ArrowRight weight="light" size={14} aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-6 *:w-[calc((100%_-_2rem)/2)] sm:*:w-[calc((100%_-_4rem)/3)] md:*:w-[calc((100%_-_6rem)/4)]">
              {feed.map((entry) => (
                <CircleTile key={entry.user.id} entry={entry} />
              ))}
            </div>
          )}
        </main>
      </div>
    </DirectionalTransition>
  );
}

function CircleTile({ entry }: { entry: CircleEntry }) {
  const handle = entry.user.displayUsername ?? entry.user.username ?? "reader";
  const profileHref = entry.user.username ? `/u/${entry.user.username}` : undefined;

  if (!entry.pull) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          style={{
            aspectRatio: "350 / 600",
            width: "100%",
            background: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.4,
          }}
          aria-label={`${handle} hasn't drawn yet today`}
        >
          <span className="type-label">Not drawn</span>
        </div>
        <Caption handle={handle} href={profileHref} sub="Hasn't drawn yet" />
      </div>
    );
  }

  const card = CARD_BY_ID[entry.pull.cardId];
  const rarityLabel = RARITY_LABELS[entry.pull.rarityScore as Rarity];
  const pullHref = entry.user.username
    ? `/u/${entry.user.username}/pull/${entry.pull.pullDate}`
    : undefined;

  const cardEl = (
    <TarotCard
      card={card}
      rarityScore={entry.pull.rarityScore as Rarity}
      isReversed={entry.pull.isReversed}
      isRadiant={entry.pull.isRadiant}
      revealed={true}
      size="sm"
    />
  );

  return (
    <div className="flex flex-col items-center gap-3">
      {pullHref ? <Link to={pullHref} className="w-full">{cardEl}</Link> : cardEl}
      <Caption
        handle={handle}
        href={profileHref}
        sub={rarityLabel}
        subColor={`var(--color-rarity-${rarityLabel?.toLowerCase()})`}
      />
    </div>
  );
}

function Caption({
  handle,
  href,
  sub,
  subColor,
}: {
  handle: string;
  href?: string;
  sub: string;
  subColor?: string;
}) {
  return (
    <div className="text-center space-y-1">
      {href ? (
        <Link to={href} className="type-body-serif hover:text-foreground transition-colors block">
          @{handle}
        </Link>
      ) : (
        <span className="type-body-serif block">@{handle}</span>
      )}
      <span
        className="text-xs tracking-widest uppercase"
        style={subColor ? { color: subColor } : { color: "var(--muted-foreground)" }}
      >
        {sub}
      </span>
    </div>
  );
}

function CenteredPrompt({
  eyebrow,
  title,
  body,
  cta,
}: {
  eyebrow?: string;
  title: string;
  body: string;
  cta: { to: string; label: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        {eyebrow && <p className="type-label">{eyebrow}</p>}
        <UsersThree weight="light" size={48} className="mx-auto opacity-50" aria-hidden />
        <h1 className="text-3xl font-light text-primary font-serif">{title}</h1>
        <p className="type-body-serif text-muted-foreground">{body}</p>
        <Link
          to={cta.to}
          className="inline-flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase border border-primary text-primary transition-opacity hover:opacity-80"
        >
          {cta.label} <ArrowRight weight="light" size={14} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
