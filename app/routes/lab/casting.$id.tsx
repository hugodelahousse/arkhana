import { useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";
import { CaretRight, Check, LinkSimple } from "@phosphor-icons/react";
import type { Route } from "./+types/casting.$id";
import { Button, buttonClass } from "../../components/Button";
import { ARCANA_CASTING } from "../../lib/casting/arcana";
import {
  deleteCastingDeck,
  getCastingDeck,
  getDeckVotes,
  isDeckId,
  updateCastingDeck,
  voter,
} from "../../lib/casting/store";
import { CASTING_LIMITS, countVoters, resolveOrder, tally } from "../../lib/casting/tally";
import { MAJOR_ARCANA, cardSlug } from "../../lib/cards";
import { romanNumeral } from "../../lib/deck/prompts";

export function meta({ data: d }: Route.MetaArgs) {
  return [
    { title: `${d?.deck.title ?? "Casting Lab"} — Arkhana` },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const deck = isDeckId(params.id) ? await getCastingDeck(params.id) : null;
  if (!deck) throw new Response("Not found", { status: 404 });
  const me = voter(context.user);
  const { proposals, rankings } = await getDeckVotes(deck.id);

  const cards = MAJOR_ARCANA.map((card) => {
    const mine = proposals.filter((p) => p.cardId === card.id);
    const ids = mine.map((p) => p.id);
    const ballots = rankings.filter((r) => r.cardId === card.id);
    const orders = ballots.map((b) => b.order);
    const voters = countVoters(ids, orders);
    const leaderId = voters > 0 ? tally(ids, orders)[0]?.id : undefined;
    const myBallot = me ? (ballots.find((b) => b.userId === me.id)?.order ?? null) : null;
    return {
      cardId: card.id,
      proposals: ids.length,
      voters,
      leader: mine.find((p) => p.id === leaderId)?.name ?? null,
      // Proposals this voter has not placed yet.
      toRank: me ? resolveOrder(ids, myBallot).unranked.length : 0,
    };
  });

  return {
    deck: { id: deck.id, title: deck.title, theme: deck.theme },
    isOwner: me?.id === deck.ownerId,
    signedIn: !!me,
    cards,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const deck = isDeckId(params.id) ? await getCastingDeck(params.id) : null;
  if (!deck) throw new Response("Not found", { status: 404 });
  const me = voter(context.user);
  if (!me || me.id !== deck.ownerId)
    return data({ error: "Only this deck's owner can change it." }, { status: 403 });

  const form = await request.formData();
  if (form.get("intent") === "delete") {
    await deleteCastingDeck(deck.id);
    return redirect("/lab/casting");
  }
  const title = String(form.get("title") ?? "").trim();
  const theme = String(form.get("theme") ?? "").trim();
  if (!title) return data({ error: "Give the deck a name." }, { status: 400 });
  if (title.length > CASTING_LIMITS.title || theme.length > CASTING_LIMITS.theme)
    return data({ error: "That name or theme is too long." }, { status: 400 });
  await updateCastingDeck(deck.id, { title, theme });
  return data({ error: null });
}

const FIELD =
  "w-full border border-border bg-card px-3 py-2.5 text-base text-card-foreground placeholder:text-faint-foreground focus:border-ring focus:outline-none";

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Copy this link", window.location.href);
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className={buttonClass("md", "outline", "inline-flex items-center gap-2")}
    >
      {copied ? (
        <Check weight="light" size={14} aria-hidden />
      ) : (
        <LinkSimple weight="light" size={14} aria-hidden />
      )}
      {copied ? "Copied" : "Invite link"}
    </button>
  );
}

export default function CastingDeck({ loaderData, actionData }: Route.ComponentProps) {
  const { deck, isOwner, signedIn, cards } = loaderData;
  const busy = useNavigation().state !== "idle";
  const cast = cards.filter((c) => c.proposals > 0).length;
  const toRank = cards.reduce((sum, c) => sum + c.toRank, 0);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-xl space-y-8">
        <header className="space-y-3">
          <Link to="/lab/casting" className="type-ghost hover:text-foreground">
            ← Decks
          </Link>
          <h1 className="type-page-title text-4xl">{deck.title}</h1>
          {deck.theme && <p className="type-body">{deck.theme}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <CopyLinkButton />
            <p className="type-caption">
              {signedIn ? (
                toRank > 0 ? (
                  `${toRank} to rank`
                ) : (
                  `${cast} of 22 cast`
                )
              ) : (
                <>
                  <Link to="/auth/signin" className="underline underline-offset-2">
                    Sign in
                  </Link>{" "}
                  to propose and rank.
                </>
              )}
            </p>
          </div>
        </header>

        <ol className="divide-y divide-border border border-border">
          {MAJOR_ARCANA.map((card) => {
            const state = cards[card.id];
            return (
              <li key={card.id}>
                <Link
                  to={`/lab/casting/${deck.id}/${cardSlug(card)}`}
                  className="flex min-h-16 items-center gap-3 bg-card px-3 py-3 text-card-foreground hover:bg-muted sm:px-4"
                >
                  <span className="type-ghost w-9 shrink-0 text-center font-serif text-base lining-nums">
                    {romanNumeral(card.id)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-xl leading-tight text-primary">
                      {card.name}
                    </span>
                    <span className="type-caption block truncate">
                      {state.leader ? (
                        <>
                          <span className="text-foreground">{state.leader}</span>
                          {state.proposals > 1 && ` · ${state.proposals} proposals`}
                        </>
                      ) : state.proposals > 0 ? (
                        `${state.proposals} ${state.proposals === 1 ? "proposal" : "proposals"}`
                      ) : (
                        ARCANA_CASTING[card.id].themes.join(" · ")
                      )}
                    </span>
                  </span>
                  {state.toRank > 0 && (
                    <span className="shrink-0 border border-accent px-2 py-0.5 text-xs text-accent-text">
                      {state.toRank} to rank
                    </span>
                  )}
                  <CaretRight
                    weight="light"
                    size={16}
                    className="shrink-0 text-faint-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ol>

        {isOwner && (
          <details className="border border-border bg-card text-card-foreground">
            <summary className="type-label cursor-pointer px-4 py-3 text-sm">Deck settings</summary>
            <div className="space-y-6 border-t border-border px-4 py-4">
              <Form method="post" className="space-y-3">
                <label className="block space-y-1">
                  <span className="type-caption">Name</span>
                  <input
                    name="title"
                    required
                    defaultValue={deck.title}
                    maxLength={CASTING_LIMITS.title}
                    className={FIELD}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="type-caption">Where the cast comes from</span>
                  <input
                    name="theme"
                    defaultValue={deck.theme}
                    maxLength={CASTING_LIMITS.theme}
                    className={FIELD}
                  />
                </label>
                {actionData?.error && (
                  <p className="text-sm text-rarity-arcane">{actionData.error}</p>
                )}
                <Button type="submit" disabled={busy}>
                  Save
                </Button>
              </Form>
              <Form
                method="post"
                onSubmit={(e) => {
                  if (!confirm("Delete this deck, with every proposal and ranking in it?"))
                    e.preventDefault();
                }}
              >
                <input type="hidden" name="intent" value="delete" />
                <button
                  type="submit"
                  disabled={busy}
                  className="text-sm text-rarity-arcane underline underline-offset-2"
                >
                  Delete this deck
                </button>
              </Form>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
