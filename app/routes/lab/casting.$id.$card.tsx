import { createContext, useContext, useEffect, useRef, useState } from "react";
import { data, Link, useFetcher, useRevalidator } from "react-router";
import { Reorder, useDragControls } from "motion/react";
import {
  ArrowLeft,
  CaretLeft,
  CaretRight,
  DotsSixVertical,
  ImageSquare,
  PencilSimple,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import type { Route } from "./+types/casting.$id.$card";
import { buttonClass } from "../../components/Button";
import { OpenAIKey } from "../../components/casting/OpenAIKey";
import { CardLightbox } from "../../components/casting/CardLightbox";
import { CardBack, CardFrame, cardEdgeColour } from "../../components/deck/CardFrame";
import { ARCANA_CASTING } from "../../lib/casting/arcana";
import {
  artUrl,
  frameOf,
  friendlyAIError,
  isOpenAIKey,
  removeArt,
  startArt,
  writeScene,
} from "../../lib/casting/art";
import {
  addProposal,
  deleteProposal,
  editProposal,
  getCardVotes,
  getCastingDeck,
  getProposal,
  isDeckId,
  saveRanking,
  saveScene,
  voter,
} from "../../lib/casting/store";
import { CASTING_LIMITS, countVoters, resolveOrder, tally } from "../../lib/casting/tally";
import { CARD_BY_ID, CARD_BY_SLUG, MAJOR_ARCANA, cardSlug } from "../../lib/cards";
import { useApiKey } from "../../lib/deck/client";
import type { FrameId } from "../../lib/deck/presets";
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
    deck: {
      id: deck.id,
      title: deck.title,
      theme: deck.theme,
      frameId: frameOf(deck),
      back: artUrl(deck.id, deck.backFile),
    },
    cardId: card.id,
    signedIn: !!me,
    proposals: proposals.map((p) => ({
      id: p.id,
      name: p.name,
      pitch: p.pitch,
      canEdit: !!me && (isOwner || p.proposerId === me.id),
      scene: p.scene,
      art: artUrl(deck.id, p.artFile),
      drawing: p.artStatus === "running",
      artError: p.artStatus === "error" ? p.artError : null,
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

  if (intent === "propose" || intent === "edit") {
    const name = String(form.get("name") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    const pitch = String(form.get("pitch") ?? "").trim();
    if (!name) return data({ ok: false, error: "Name your pick." }, { status: 400 });
    if (name.length > CASTING_LIMITS.name || pitch.length > CASTING_LIMITS.pitch)
      return data({ ok: false, error: "That name or pitch is too long." }, { status: 400 });
    const result =
      intent === "propose"
        ? await addProposal({ ...where, proposerId: me.id, name, pitch })
        : await editProposal({
            ...where,
            proposalId: String(form.get("proposalId") ?? ""),
            userId: me.id,
            isOwner: me.id === deck.ownerId,
            name,
            pitch,
          });
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
    if (!removed)
      return data({ ok: false, error: "You can only remove your own proposals." }, { status: 403 });
    await removeArt(deck.id, removed.artFile);
    return data({ ok: true, error: null });
  }

  // Scene and card art: open to any signed-in member, on their own OpenAI key.
  if (intent === "scene" || intent === "scene-ai" || intent === "art") {
    const proposal = await getProposal({
      ...where,
      proposalId: String(form.get("proposalId") ?? ""),
    });
    if (!proposal) return data({ ok: false, error: "That proposal is gone." }, { status: 404 });
    const scene = String(form.get("scene") ?? "")
      .trim()
      .replace(/\s+/g, " ");
    if (scene.length > CASTING_LIMITS.scene)
      return data({ ok: false, error: "Keep the scene shorter." }, { status: 400 });
    if (intent === "scene") {
      await saveScene(proposal.id, scene);
      return data({ ok: true, error: null });
    }

    const apiKey = form.get("key");
    if (!isOpenAIKey(apiKey))
      return data({ ok: false, error: "Add your OpenAI API key first." }, { status: 400 });
    if (intent === "scene-ai") {
      try {
        await saveScene(proposal.id, await writeScene({ apiKey, ...proposal, theme: deck.theme }));
        return data({ ok: true, error: null });
      } catch (err) {
        return data({ ok: false, error: friendlyAIError(err) }, { status: 502 });
      }
    }
    // Draw from the scene as typed, saved first so the card and its text match.
    if (scene !== proposal.scene) await saveScene(proposal.id, scene);
    const started = await startArt({ apiKey, deck, proposal: { ...proposal, scene } });
    return started
      ? data({ ok: true, error: null })
      : data({ ok: false, error: "This card is already being drawn." }, { status: 409 });
  }

  return data({ ok: false, error: "Unknown action." }, { status: 400 });
}

type Data = Route.ComponentProps["loaderData"];
type Proposal = Data["proposals"][number];
type ActionResult = { ok: boolean; error: string | null };

const FIELD =
  "w-full border border-border bg-card px-3 py-2.5 text-base text-card-foreground placeholder:text-faint-foreground focus:border-ring focus:outline-none";
const STEP =
  "flex min-h-11 min-w-14 items-center justify-center gap-1.5 border border-border px-3 font-serif text-base lining-nums text-foreground hover:border-primary hover:text-primary";
const ROW_ACTION =
  "flex h-11 w-10 items-center justify-center text-faint-foreground hover:text-primary";
const ROW = "flex items-stretch border border-border bg-card text-card-foreground";

/** What every proposal row needs to show or draw its card. */
const CardCtx = createContext<{
  frameId: FrameId;
  back: string | null;
  cardId: number;
  signedIn: boolean;
}>({ frameId: "carved-block", back: null, cardId: 0, signedIn: false });

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

  // A card being drawn finishes on the server; look again until it lands.
  const { revalidate } = useRevalidator();
  const drawing = proposals.some((p) => p.drawing);
  useEffect(() => {
    if (!drawing) return;
    const timer = setInterval(() => void revalidate(), 3000);
    return () => clearInterval(timer);
  }, [drawing, revalidate]);
  const canRank = signedIn && proposals.length > 1;

  return (
    <div className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-8 sm:py-8">
      <div className="mx-auto max-w-xl space-y-8">
        <nav className="flex items-center justify-between gap-3 border-b border-border pb-3 text-sm">
          <Link
            to={`/lab/casting/${deck.id}`}
            className="flex min-w-0 items-center gap-2 py-2 text-foreground hover:text-primary"
          >
            <ArrowLeft size={16} className="shrink-0" aria-hidden />
            <span className="truncate">{deck.title}</span>
          </Link>
          <span className="flex shrink-0 gap-2">
            <Link
              to={`/lab/casting/${deck.id}/${cardSlug(prev)}`}
              className={STEP}
              aria-label={`Previous card: ${prev.name}`}
            >
              <CaretLeft size={14} aria-hidden />
              {romanNumeral(prev.id)}
            </Link>
            <Link
              to={`/lab/casting/${deck.id}/${cardSlug(next)}`}
              className={STEP}
              aria-label={`Next card: ${next.name}`}
            >
              {romanNumeral(next.id)}
              <CaretRight size={14} aria-hidden />
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

        <CardCtx.Provider value={{ frameId: deck.frameId, back: deck.back, cardId, signedIn }}>
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
        </CardCtx.Provider>

        <nav className="grid grid-cols-2 gap-2 border-t border-border pt-4">
          <Link
            to={`/lab/casting/${deck.id}/${cardSlug(prev)}`}
            className={`${STEP} justify-start`}
          >
            <CaretLeft size={14} className="shrink-0" aria-hidden />
            <span className="truncate">{prev.name}</span>
          </Link>
          <Link to={`/lab/casting/${deck.id}/${cardSlug(next)}`} className={`${STEP} justify-end`}>
            <span className="truncate">{next.name}</span>
            <CaretRight size={14} className="shrink-0" aria-hidden />
          </Link>
        </nav>
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
  const [editing, setEditing] = useState(false);
  const [artOpen, setArtOpen] = useState(false);
  const { signedIn } = useContext(CardCtx);
  const busy = fetcher.state !== "idle";

  if (editing)
    return (
      // Closes on submit; if the save is refused, the row shows why.
      <fetcher.Form
        method="post"
        onSubmit={() => setEditing(false)}
        className="min-w-0 flex-1 space-y-2 py-3 pr-3"
      >
        <input type="hidden" name="intent" value="edit" />
        <input type="hidden" name="proposalId" value={proposal.id} />
        <input
          name="name"
          required
          autoFocus
          defaultValue={proposal.name}
          maxLength={CASTING_LIMITS.name}
          autoComplete="off"
          aria-label="Name"
          className={FIELD}
        />
        <input
          name="pitch"
          defaultValue={proposal.pitch}
          maxLength={CASTING_LIMITS.pitch}
          autoComplete="off"
          aria-label="Why they fit"
          placeholder="Why they fit (optional)"
          className={FIELD}
        />
        {fetcher.data?.error && <p className="text-sm text-rarity-arcane">{fetcher.data.error}</p>}
        <div className="flex gap-2">
          <button type="submit" className={buttonClass("md", "fill")}>
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className={buttonClass("md")}>
            Cancel
          </button>
        </div>
      </fetcher.Form>
    );

  return (
    <div className="min-w-0 flex-1">
      <div className={`flex items-start gap-3 py-3 ${busy ? "opacity-40" : ""}`}>
        {position !== null && (
          <span className="w-4 shrink-0 pt-1 text-right text-sm tabular-nums text-faint-foreground">
            {position}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words font-serif text-xl leading-tight text-primary">
            {proposal.name}
          </p>
          {proposal.pitch && (
            <p className="mt-0.5 break-words text-[0.9375rem] leading-snug text-muted-foreground">
              {proposal.pitch}
            </p>
          )}
          {fetcher.data?.error && (
            <p className="text-sm text-rarity-arcane">{fetcher.data.error}</p>
          )}
        </div>
        {points !== undefined && (
          <span className="type-caption shrink-0 pt-1 tabular-nums">
            {formatPoints(points)} pts
          </span>
        )}
        <span className="-my-3 flex shrink-0 self-center pr-1">
          {(signedIn || proposal.art) && (
            <button
              type="button"
              aria-label={`Card art for ${proposal.name}`}
              aria-expanded={artOpen}
              className={`${ROW_ACTION} ${artOpen ? "text-primary" : ""}`}
              onClick={() => setArtOpen((open) => !open)}
            >
              {proposal.art ? (
                <img
                  src={proposal.art}
                  alt=""
                  className={`h-9 w-6 object-cover ${proposal.drawing ? "animate-pulse" : ""}`}
                />
              ) : (
                <ImageSquare
                  weight="light"
                  size={16}
                  className={proposal.drawing ? "animate-pulse" : ""}
                  aria-hidden
                />
              )}
            </button>
          )}
          {proposal.canEdit && (
            <>
              <button
                type="button"
                aria-label={`Edit ${proposal.name}`}
                className={ROW_ACTION}
                onClick={() => setEditing(true)}
              >
                <PencilSimple weight="light" size={16} aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Remove ${proposal.name}`}
                className={ROW_ACTION}
                onClick={() => {
                  if (confirm(`Remove ${proposal.name}?`))
                    fetcher.submit(
                      { intent: "delete", proposalId: proposal.id },
                      { method: "post" }
                    );
                }}
              >
                <X weight="light" size={16} aria-hidden />
              </button>
            </>
          )}
        </span>
      </div>
      {artOpen && <ArtPanel proposal={proposal} />}
    </div>
  );
}

/** A proposal's card: the scene it shows, and the art drawn from it. Closed by default. */
function ArtPanel({ proposal }: { proposal: Proposal }) {
  const { frameId, back, cardId, signedIn } = useContext(CardCtx);
  const [fullScreen, setFullScreen] = useState(false);
  const fetcher = useFetcher<ActionResult>();
  const [apiKey, setApiKey] = useApiKey();
  const intent = fetcher.state !== "idle" ? fetcher.formData?.get("intent") : null;
  const drawing = proposal.drawing || intent === "art";
  const error = fetcher.data?.error ?? proposal.artError;
  const small = buttonClass(
    "sm",
    "outline",
    "inline-flex items-center gap-1.5 disabled:opacity-40"
  );

  return (
    <div className="space-y-3 border-t border-border py-3 pr-3">
      {drawing ? (
        <CardFrame
          frameId={frameId}
          numeral={romanNumeral(cardId)}
          title={CARD_BY_ID[cardId].name}
          status="Drawing… this takes about a minute"
          className="mx-auto w-48"
        />
      ) : (
        proposal.art && (
          <button
            type="button"
            aria-label={`Show ${proposal.name}'s card full screen`}
            className="mx-auto block w-48 cursor-zoom-in"
            onClick={() => setFullScreen(true)}
          >
            <CardFrame
              frameId={frameId}
              artUrl={proposal.art}
              numeral={romanNumeral(cardId)}
              title={CARD_BY_ID[cardId].name}
              htmlArt
            />
          </button>
        )
      )}
      {fullScreen && proposal.art && (
        <CardLightbox
          label={`${CARD_BY_ID[cardId].name}: ${proposal.name}`}
          edge={cardEdgeColour(frameId)}
          onClose={() => setFullScreen(false)}
          front={
            <CardFrame
              frameId={frameId}
              artUrl={proposal.art}
              numeral={romanNumeral(cardId)}
              title={CARD_BY_ID[cardId].name}
              htmlArt
            />
          }
          back={<CardBack frameId={frameId} artUrl={back} htmlArt />}
        />
      )}
      {signedIn ? (
        <fetcher.Form method="post" className="space-y-2">
          <input type="hidden" name="proposalId" value={proposal.id} />
          <input type="hidden" name="key" value={apiKey ?? ""} />
          <textarea
            // Remounts when the saved scene changes, so the AI's text shows up.
            key={proposal.scene}
            name="scene"
            rows={4}
            defaultValue={proposal.scene}
            maxLength={CASTING_LIMITS.scene}
            aria-label="Scene"
            placeholder="The scene on the card: who is shown, doing what, where."
            className={`${FIELD} text-[0.9375rem] leading-snug`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button name="intent" value="scene" disabled={!!intent} className={small}>
              Save
            </button>
            <button
              name="intent"
              value="scene-ai"
              disabled={!apiKey || !!intent || drawing}
              className={small}
            >
              <Sparkle weight="light" size={13} aria-hidden />
              {intent === "scene-ai" ? "Writing…" : "Write it"}
            </button>
            <button
              name="intent"
              value="art"
              disabled={!apiKey || !!intent || drawing}
              className={small}
            >
              <ImageSquare weight="light" size={13} aria-hidden />
              {proposal.art ? "Redraw" : "Draw card"}
            </button>
          </div>
          <OpenAIKey apiKey={apiKey} setApiKey={setApiKey} cost="about $0.05 a card" />
          {error && <p className="text-sm text-rarity-arcane">{error}</p>}
        </fetcher.Form>
      ) : (
        proposal.scene && (
          <p className="text-[0.9375rem] leading-snug text-muted-foreground">{proposal.scene}</p>
        )
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
