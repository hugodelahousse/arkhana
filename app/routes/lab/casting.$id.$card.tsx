import { useEffect, useRef, useState } from "react";
import { data, Link, useFetcher } from "react-router";
import { Reorder, useDragControls } from "motion/react";
import { DotsSixVertical, X } from "@phosphor-icons/react";
import type { Route } from "./+types/casting.$id.$card";
import { buttonClass } from "../../components/Button";
import { ARCANA_CASTING } from "../../lib/casting/arcana";
import {
  addProposal,
  deleteProposal,
  getCardVotes,
  getCastingDeck,
  isDeckId,
  saveRanking,
  voter,
} from "../../lib/casting/store";
import { CASTING_LIMITS, countVoters, resolveOrder, tally } from "../../lib/casting/tally";
import { CARD_BY_ID, CARD_BY_SLUG, MAJOR_ARCANA, cardSlug } from "../../lib/cards";
import { romanNumeral } from "../../lib/deck/prompts";

export function meta({ data: d }: Route.MetaArgs) {
  const name = d ? CARD_BY_ID[d.cardId].name : "Casting Lab";
  return [
    { title: `${name}${d ? ` · ${d.deck.title}` : ""} — Arkhana` },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

async function find(params: { id?: string; card?: string }) {
  const card = CARD_BY_SLUG[params.card ?? ""];
  const deck = isDeckId(params.id) ? await getCastingDeck(params.id) : null;
  if (!deck || card?.arcana !== "major") throw new Response("Not found", { status: 404 });
  return { deck, card };
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const { deck, card } = await find(params);
  const me = voter(context.user);
  const isOwner = me?.id === deck.ownerId;
  const { proposals, rankings } = await getCardVotes(deck.id, card.id);
  const ids = proposals.map((p) => p.id);
  const orders = rankings.map((r) => r.order);

  return {
    deck: { id: deck.id, title: deck.title, theme: deck.theme },
    cardId: card.id,
    signedIn: !!me,
    proposals: proposals.map((p) => ({
      id: p.id,
      name: p.name,
      pitch: p.pitch,
      canDelete: !!me && (isOwner || p.proposerId === me.id),
    })),
    myOrder: me ? (rankings.find((r) => r.userId === me.id)?.order ?? null) : null,
    standing: tally(ids, orders),
    voters: countVoters(ids, orders),
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const { deck, card } = await find(params);
  const me = voter(context.user);
  if (!me) return data({ ok: false, error: "Sign in to propose and rank." }, { status: 401 });
  const where = { deckId: deck.id, cardId: card.id };
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "propose") {
    const name = String(form.get("name") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const pitch = String(form.get("pitch") ?? "").trim();
    if (!name) return data({ ok: false, error: "Name your pick." }, { status: 400 });
    if (name.length > CASTING_LIMITS.name || pitch.length > CASTING_LIMITS.pitch)
      return data({ ok: false, error: "That name or pitch is too long." }, { status: 400 });
    const result = await addProposal({ ...where, proposerId: me.id, name, pitch });
    return data(
      { ok: result.ok, error: result.ok ? null : result.error },
      { status: result.ok ? 200 : 400 }
    );
  }

  if (intent === "rank") {
    let order: unknown;
    try {
      order = JSON.parse(String(form.get("order") ?? ""));
    } catch {
      order = null;
    }
    if (!Array.isArray(order) || order.some((id) => typeof id !== "string"))
      return data({ ok: false, error: "That ranking could not be read." }, { status: 400 });
    await saveRanking({ ...where, userId: me.id, order: order as string[] });
    return data({ ok: true, error: null });
  }

  if (intent === "delete") {
    const removed = await deleteProposal({
      ...where,
      proposalId: String(form.get("proposalId") ?? ""),
      userId: me.id,
      isOwner: me.id === deck.ownerId,
    });
    return removed
      ? data({ ok: true, error: null })
      : data({ ok: false, error: "You can only remove your own proposals." }, { status: 403 });
  }

  return data({ ok: false, error: "Unknown action." }, { status: 400 });
}

type Data = Route.ComponentProps["loaderData"];
type Proposal = Data["proposals"][number];
type ActionResult = { ok: boolean; error: string | null };

const FIELD =
  "w-full border border-border bg-card px-3 py-2.5 text-base text-card-foreground placeholder:text-faint-foreground focus:border-ring focus:outline-none";
const ROW = "flex items-stretch border border-border bg-card text-card-foreground";

export default function CastingCard({ loaderData }: Route.ComponentProps) {
  // Keyed so ranking state resets when moving to the previous or next card.
  return <CardView key={loaderData.cardId} {...loaderData} />;
}

function CardView({ deck, cardId, signedIn, proposals, myOrder, standing, voters }: Data) {
  const card = CARD_BY_ID[cardId];
  const info = ARCANA_CASTING[cardId];
  const prev = MAJOR_ARCANA[(cardId + 21) % 22];
  const next = MAJOR_ARCANA[(cardId + 1) % 22];
  const [view, setView] = useState<"mine" | "group">(signedIn ? "mine" : "group");
  const canRank = signedIn && proposals.length > 1;

  return (
    <div className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-8 sm:py-8">
      <div className="mx-auto max-w-xl space-y-8">
        <nav className="type-ghost flex items-center justify-between gap-3">
          <Link
            to={`/lab/casting/${deck.id}`}
            className="min-w-0 truncate py-2 hover:text-foreground"
          >
            ← {deck.title}
          </Link>
          <span className="flex shrink-0 gap-5">
            <Link
              to={`/lab/casting/${deck.id}/${cardSlug(prev)}`}
              className="py-2 hover:text-foreground"
              aria-label={`Previous card: ${prev.name}`}
            >
              ← {romanNumeral(prev.id)}
            </Link>
            <Link
              to={`/lab/casting/${deck.id}/${cardSlug(next)}`}
              className="py-2 hover:text-foreground"
              aria-label={`Next card: ${next.name}`}
            >
              {romanNumeral(next.id)} →
            </Link>
          </span>
        </nav>

        <header className="space-y-4">
          <div>
            <h1 className="type-page-title flex flex-wrap items-baseline gap-x-3 text-4xl">
              <span className="lining-nums text-faint-foreground">{romanNumeral(cardId)}</span>
              {card.name}
            </h1>
            <p className="type-caption mt-1">{info.themes.join(" · ")}</p>
          </div>
          <dl className="space-y-3 text-[0.9375rem] leading-relaxed text-muted-foreground">
            <Meaning term="Upright" text={info.upright} />
            <Meaning term="Reversed" text={info.reversed} />
            <Meaning term="Cast" text={info.brief} />
          </dl>
          <p className="font-serif text-xl italic leading-snug text-primary">{info.ask}</p>
        </header>

        <section className="space-y-3">
          {canRank && (
            <div
              className="flex gap-5 border-b border-border text-xs uppercase tracking-widest"
              role="tablist"
            >
              {(["mine", "group"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`-mb-px border-b py-2 outline-none focus-visible:text-primary focus-visible:underline ${view === v ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
                >
                  {v === "mine" ? "My ranking" : `Group${voters > 0 ? ` · ${voters}` : ""}`}
                </button>
              ))}
            </div>
          )}

          {proposals.length === 0 ? (
            <p className="type-caption">No proposals yet.</p>
          ) : view === "mine" && canRank ? (
            <MyRanking proposals={proposals} myOrder={myOrder} />
          ) : (
            <GroupStanding proposals={proposals} standing={standing} voters={voters} />
          )}

          {signedIn ? (
            proposals.length < CASTING_LIMITS.proposalsPerCard && <ProposeForm />
          ) : (
            <p className="type-caption">
              <Link to="/auth/signin" className="underline underline-offset-2">
                Sign in
              </Link>{" "}
              to propose and rank.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Meaning({ term, text }: { term: string; text: string }) {
  return (
    <div className="flex gap-3">
      <dt className="type-ghost w-20 shrink-0 pt-0.5 text-xs">{term}</dt>
      <dd className="min-w-0 flex-1">{text}</dd>
    </div>
  );
}

// ── My ranking ───────────────────────────────────────────────────────────

function MyRanking({ proposals, myOrder }: { proposals: Proposal[]; myOrder: string[] | null }) {
  const fetcher = useFetcher<ActionResult>();
  // The order as last arranged here; null until the voter moves something.
  const [local, setLocal] = useState<string[] | null>(null);
  const ids = proposals.map((p) => p.id);
  const { order } = resolveOrder(ids, local ?? myOrder);
  const byId = new Map(proposals.map((p) => [p.id, p]));
  // A drag ends after its last reorder has rendered, so the drop handler reads the order here.
  const latest = useRef(order);
  useEffect(() => {
    latest.current = order;
  });

  function save(next: string[]) {
    setLocal(next);
    fetcher.submit({ intent: "rank", order: JSON.stringify(next) }, { method: "post" });
  }
  function move(index: number, by: -1 | 1) {
    const to = index + by;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [id] = next.splice(index, 1);
    next.splice(to, 0, id);
    save(next);
  }

  return (
    <div className="space-y-3">
      <Reorder.Group as="ol" axis="y" values={order} onReorder={setLocal} className="space-y-2">
        {order.map((id, i) => (
          <RankRow
            key={id}
            proposal={byId.get(id)!}
            position={i + 1}
            onMove={(by) => move(i, by)}
            onDrop={() => save(latest.current)}
          />
        ))}
      </Reorder.Group>
      {fetcher.data?.error && <p className="text-sm text-rarity-arcane">{fetcher.data.error}</p>}
      {!local && !myOrder && <p className="type-caption">Drag to rank. Best fit first.</p>}
    </div>
  );
}

function RankRow({
  proposal,
  position,
  onMove,
  onDrop,
}: {
  proposal: Proposal;
  position: number;
  onMove: (by: -1 | 1) => void;
  onDrop: () => void;
}) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="li"
      value={proposal.id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      className={`relative ${ROW}`}
    >
      <button
        type="button"
        aria-label={`Reorder ${proposal.name}: drag, or use the arrow keys`}
        onPointerDown={(e) => controls.start(e)}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          onMove(e.key === "ArrowUp" ? -1 : 1);
        }}
        className="flex w-11 shrink-0 cursor-grab touch-none items-center justify-center text-faint-foreground active:cursor-grabbing"
      >
        <DotsSixVertical size={20} aria-hidden />
      </button>
      <ProposalBody proposal={proposal} position={position} />
    </Reorder.Item>
  );
}

// ── Group standing ───────────────────────────────────────────────────────

function GroupStanding({
  proposals,
  standing,
  voters,
}: {
  proposals: Proposal[];
  standing: Data["standing"];
  voters: number;
}) {
  const byId = new Map(proposals.map((p) => [p.id, p]));
  return (
    <ol className="space-y-2">
      {standing.map((s, i) => (
        <li key={s.id} className={`${ROW} pl-4`}>
          <ProposalBody
            proposal={byId.get(s.id)!}
            position={voters > 0 ? i + 1 : null}
            points={voters > 0 ? s.points : undefined}
          />
        </li>
      ))}
    </ol>
  );
}

const formatPoints = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// ── Shared ───────────────────────────────────────────────────────────────

function ProposalBody({
  proposal,
  position,
  points,
}: {
  proposal: Proposal;
  position: number | null;
  points?: number;
}) {
  const fetcher = useFetcher<ActionResult>();
  return (
    <div
      className={`flex min-w-0 flex-1 items-start gap-3 py-3 ${fetcher.state !== "idle" ? "opacity-40" : ""}`}
    >
      {position !== null && (
        <span className="w-4 shrink-0 pt-1 text-right text-sm tabular-nums text-faint-foreground">
          {position}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="break-words font-serif text-xl leading-tight text-primary">{proposal.name}</p>
        {proposal.pitch && (
          <p className="mt-0.5 break-words text-[0.9375rem] leading-snug text-muted-foreground">
            {proposal.pitch}
          </p>
        )}
        {fetcher.data?.error && <p className="text-sm text-rarity-arcane">{fetcher.data.error}</p>}
      </div>
      {points !== undefined && (
        <span className="type-caption shrink-0 pr-4 pt-1 tabular-nums">
          {formatPoints(points)} pts
        </span>
      )}
      {proposal.canDelete && (
        <button
          type="button"
          aria-label={`Remove ${proposal.name}`}
          className="-my-3 flex size-11 shrink-0 items-center justify-center self-center text-faint-foreground hover:text-primary"
          onClick={() => {
            if (confirm(`Remove ${proposal.name}?`))
              fetcher.submit({ intent: "delete", proposalId: proposal.id }, { method: "post" });
          }}
        >
          <X weight="light" size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}

function ProposeForm() {
  const fetcher = useFetcher<ActionResult>();
  const form = useRef<HTMLFormElement>(null);
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) form.current?.reset();
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form ref={form} method="post" className="space-y-2 pt-3">
      <input type="hidden" name="intent" value="propose" />
      <div className="flex gap-2">
        <input
          name="name"
          required
          maxLength={CASTING_LIMITS.name}
          autoComplete="off"
          aria-label="Who or what to propose"
          placeholder="Propose someone"
          className={FIELD}
        />
        <button type="submit" disabled={busy} className={buttonClass("md", "fill", "shrink-0")}>
          Add
        </button>
      </div>
      <input
        name="pitch"
        maxLength={CASTING_LIMITS.pitch}
        autoComplete="off"
        aria-label="Why they fit"
        placeholder="Why they fit (optional)"
        className={FIELD}
      />
      {fetcher.data?.error && <p className="text-sm text-rarity-arcane">{fetcher.data.error}</p>}
    </fetcher.Form>
  );
}
