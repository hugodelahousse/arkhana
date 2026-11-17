import { useEffect, useState } from "react";
import {
  data,
  Form,
  Link,
  redirect,
  useFetcher,
  useNavigation,
  useRevalidator,
} from "react-router";
import { Check, LinkSimple, UploadSimple } from "@phosphor-icons/react";
import type { Route } from "./+types/casting.$id";
import { Button, buttonClass } from "../../components/Button";
import { OpenAIKey } from "../../components/casting/OpenAIKey";
import { CardBack, CardFrame, FRAMES } from "../../components/deck/CardFrame";
import {
  artUrl,
  frameOf,
  isOpenAIKey,
  presetOf,
  removeArt,
  removeDeckArt,
  saveUpload,
  startBack,
} from "../../lib/casting/art";
import {
  deleteCastingDeck,
  getCastingDeck,
  getDeckVotes,
  isDeckId,
  patchCastingDeck,
  updateCastingDeck,
  voter,
} from "../../lib/casting/store";
import { CASTING_LIMITS, countVoters, resolveOrder, tally } from "../../lib/casting/tally";
import { MAJOR_ARCANA, cardSlug } from "../../lib/cards";
import { CASTING_PRESETS } from "../../lib/casting/styles";
import { useApiKey } from "../../lib/deck/client";
import { FRAME_IDS, type FrameId } from "../../lib/deck/presets";
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
    // Oldest first until someone votes, then by points.
    const topId = tally(ids, orders)[0]?.id;
    const top = mine.find((p) => p.id === topId);
    const myBallot = me ? (ballots.find((b) => b.userId === me.id)?.order ?? null) : null;
    return {
      cardId: card.id,
      proposals: ids.length,
      voters,
      leader: voters > 0 ? (top?.name ?? null) : null,
      // The card face: the top-ranked pick's art, if it has been drawn.
      art: artUrl(deck.id, top?.artFile ?? null),
      // Proposals this voter has not placed yet.
      toRank: me ? resolveOrder(ids, myBallot).unranked.length : 0,
    };
  });

  return {
    deck: {
      id: deck.id,
      title: deck.title,
      theme: deck.theme,
      presetId: presetOf(deck).id,
      frameId: frameOf(deck),
      // An uploaded style image, which then replaces the preset.
      anchor: artUrl(deck.id, deck.anchorFile),
      back: artUrl(deck.id, deck.backFile),
      backDrawing: deck.backStatus === "running",
      backError: deck.backStatus === "error" ? deck.backError : null,
    },
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

  // Refuse an oversized body before reading it: uploads are capped at 12 MB.
  if (Number(request.headers.get("content-length") ?? 0) > 13 * 1024 * 1024)
    return data({ error: "That image is over 12 MB." }, { status: 413 });
  const form = await request.formData();
  if (form.get("intent") === "delete") {
    await deleteCastingDeck(deck.id);
    await removeDeckArt(deck.id);
    return redirect("/lab/casting");
  }
  const intent = form.get("intent");
  if (intent === "style") {
    const preset = CASTING_PRESETS.find((p) => p.id === form.get("presetId"));
    const frameId = String(form.get("frameId") ?? "");
    if (!preset || (frameId && !FRAME_IDS.includes(frameId as FrameId)))
      return data({ error: "Unknown style." }, { status: 400 });
    // The preset's own frame is stored as "no override", so it follows the preset.
    const override = frameId && frameId !== preset.frameId ? frameId : null;
    // Choosing a preset (not just a frame) drops an uploaded style image.
    const dropAnchor = !!form.get("dropAnchor") && !!deck.anchorFile;
    await patchCastingDeck(deck.id, {
      presetId: preset.id,
      frameId: override,
      ...(dropAnchor ? { anchorFile: null } : {}),
    });
    if (dropAnchor) await removeArt(deck.id, deck.anchorFile);
    return data({ error: null });
  }
  // A back being drawn would overwrite whatever is chosen meanwhile, so it has to land first.
  if ((intent === "back" || intent === "back-pattern") && deck.backStatus === "running")
    return data(
      { error: "The back is still being drawn. Try again once it lands." },
      { status: 409 }
    );
  if (intent === "anchor" || intent === "back") {
    const saved = await saveUpload(deck.id, intent, form.get("image"));
    if ("error" in saved) return data({ error: saved.error }, { status: 400 });
    const old = intent === "anchor" ? deck.anchorFile : deck.backFile;
    await patchCastingDeck(
      deck.id,
      intent === "anchor"
        ? { anchorFile: saved.file }
        : { backFile: saved.file, backError: null, backStatus: "none" }
    );
    await removeArt(deck.id, old);
    return data({ error: null });
  }
  if (intent === "back-pattern") {
    await patchCastingDeck(deck.id, { backFile: null, backStatus: "none", backError: null });
    await removeArt(deck.id, deck.backFile);
    return data({ error: null });
  }
  if (intent === "back-draw") {
    const apiKey = form.get("key");
    if (!isOpenAIKey(apiKey))
      return data({ error: "Add your OpenAI API key first." }, { status: 400 });
    const design = String(form.get("design") ?? "")
      .trim()
      .slice(0, 500);
    return (await startBack({ apiKey, deck, design }))
      ? data({ error: null })
      : data({ error: "The back is already being drawn." }, { status: 409 });
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

const PICKED = "outline outline-2 outline-ring";
const UNPICKED = "opacity-75 hover:opacity-100";
const SMALL = buttonClass("sm", "outline", "inline-flex items-center gap-1.5 disabled:opacity-40");

/** A button that opens the file chooser and submits the image as soon as one is picked. */
function UploadButton({ intent, label }: { intent: "anchor" | "back"; label: string }) {
  const fetcher = useFetcher<{ error: string | null }>();
  const busy = fetcher.state !== "idle";
  return (
    <fetcher.Form method="post" encType="multipart/form-data" className="inline-block">
      <input type="hidden" name="intent" value={intent} />
      <label className={`${SMALL} cursor-pointer ${busy ? "opacity-40" : ""}`}>
        <UploadSimple weight="light" size={13} aria-hidden />
        {busy ? "Uploading…" : label}
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            if (e.currentTarget.files?.length) void fetcher.submit(e.currentTarget.form);
          }}
        />
      </label>
      {fetcher.data?.error && (
        <span className="ml-2 text-sm text-rarity-arcane">{fetcher.data.error}</span>
      )}
    </fetcher.Form>
  );
}

/** The deck builder's style and frame pickers, saving to this deck, plus a style image of your own. */
function StylePicker({
  presetId,
  frameId,
  anchor,
}: {
  presetId: string;
  frameId: FrameId;
  anchor: string | null;
}) {
  const fetcher = useFetcher();
  // Show the choice at once while it saves.
  const pending = fetcher.formData;
  const preset = String(pending?.get("presetId") ?? presetId);
  const frame = (pending?.get("frameId") as FrameId | null) ?? frameId;
  const custom = !!anchor && !pending?.get("dropAnchor");
  const sample = custom ? anchor : CASTING_PRESETS.find((p) => p.id === preset)?.anchorUrl;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="type-caption">Art style for every card drawn in this deck</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {CASTING_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={!custom && p.id === preset}
              onClick={() =>
                fetcher.submit(
                  { intent: "style", presetId: p.id, frameId: p.frameId, dropAnchor: "1" },
                  { method: "post" }
                )
              }
              className={`space-y-1 text-left outline-offset-4 ${!custom && p.id === preset ? PICKED : UNPICKED}`}
            >
              <CardFrame
                frameId={p.frameId}
                artUrl={p.anchorUrl}
                numeral="XVIII"
                title="The Moon"
              />
              <span className="block text-xs text-foreground">{p.name}</span>
            </button>
          ))}
          {custom && (
            <div className={`space-y-1 outline-offset-4 ${PICKED}`}>
              <CardFrame frameId={frame} artUrl={anchor} numeral="★" title="Your image" htmlArt />
              <span className="block text-xs text-foreground">Your image</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <UploadButton
            intent="anchor"
            label={custom ? "Replace style image" : "Use my own image"}
          />
          <p className="type-caption text-xs">
            {custom
              ? "Cards copy how this image is made, not its colours or subject. Pick a preset to drop it."
              : "Upload a picture in the look you want, and cards are drawn to match it."}
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <p className="type-caption">Frame. Switching it never redraws anything.</p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={f.id === frame}
              onClick={() =>
                fetcher.submit(
                  { intent: "style", presetId: preset, frameId: f.id },
                  { method: "post" }
                )
              }
              className={`space-y-1 text-left outline-offset-4 ${f.id === frame ? PICKED : UNPICKED}`}
            >
              <CardFrame frameId={f.id} artUrl={sample} numeral="0" title="The Fool" />
              <span className="block text-[0.6875rem] leading-tight text-foreground">{f.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The deck's one card back: the frame's pattern, an uploaded image, or art drawn in the deck's style. */
function BackPicker({
  frameId,
  back,
  drawing,
  error,
}: {
  frameId: FrameId;
  back: string | null;
  drawing: boolean;
  error: string | null;
}) {
  const fetcher = useFetcher<{ error: string | null }>();
  const [apiKey, setApiKey] = useApiKey();
  const busy = fetcher.state !== "idle";
  const isDrawing = drawing || (busy && fetcher.formData?.get("intent") === "back-draw");

  return (
    <div className="space-y-2">
      <p className="type-caption">Card back, shown for every card without art yet</p>
      <div className="flex items-start gap-4">
        <div className="w-24 shrink-0">
          {isDrawing ? (
            <CardFrame frameId={frameId} numeral="" title="" status="Drawing…" />
          ) : (
            <CardBack frameId={frameId} artUrl={back} htmlArt />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <fetcher.Form method="post" className="space-y-2">
            <input type="hidden" name="key" value={apiKey ?? ""} />
            <input
              name="design"
              maxLength={500}
              autoComplete="off"
              aria-label="What the back shows"
              placeholder="What the back shows (optional)"
              className={`${FIELD} py-1.5 text-sm`}
            />
            <div className="flex flex-wrap gap-2">
              <button
                name="intent"
                value="back-draw"
                disabled={!apiKey || busy || isDrawing}
                className={SMALL}
              >
                {back ? "Redraw back" : "Draw a back"}
              </button>
              {back && (
                <button name="intent" value="back-pattern" disabled={busy} className={SMALL}>
                  Use the pattern
                </button>
              )}
            </div>
          </fetcher.Form>
          <UploadButton intent="back" label="Upload a back" />
          <OpenAIKey apiKey={apiKey} setApiKey={setApiKey} cost="about $0.07 a back" />
          {(fetcher.data?.error ?? error) && (
            <p className="text-sm text-rarity-arcane">{fetcher.data?.error ?? error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CastingDeck({ loaderData, actionData }: Route.ComponentProps) {
  const { deck, isOwner, signedIn, cards } = loaderData;
  const busy = useNavigation().state !== "idle";
  // A back being drawn finishes on the server; look again until it lands.
  const { revalidate } = useRevalidator();
  useEffect(() => {
    if (!deck.backDrawing) return;
    const timer = setInterval(() => void revalidate(), 3000);
    return () => clearInterval(timer);
  }, [deck.backDrawing, revalidate]);
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

        <ol className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4">
          {MAJOR_ARCANA.map((card) => {
            const state = cards[card.id];
            return (
              <li key={card.id}>
                <Link
                  to={`/lab/casting/${deck.id}/${cardSlug(card)}`}
                  className="group block space-y-1.5"
                >
                  <div className="relative transition-transform group-hover:-translate-y-0.5">
                    {state.art ? (
                      <CardFrame
                        frameId={deck.frameId}
                        artUrl={state.art}
                        numeral={romanNumeral(card.id)}
                        title={card.name}
                        htmlArt
                      />
                    ) : (
                      <CardBack frameId={deck.frameId} artUrl={deck.back} htmlArt />
                    )}
                    {state.toRank > 0 && (
                      <span className="absolute right-1 top-1 bg-accent px-1.5 py-0.5 text-[0.6875rem] leading-none text-accent-foreground">
                        {state.toRank} to rank
                      </span>
                    )}
                  </div>
                  <div className="leading-tight">
                    <p className="font-serif text-[0.9375rem] text-primary lining-nums">
                      <span className="text-faint-foreground">{romanNumeral(card.id)}</span>{" "}
                      {card.name}
                    </p>
                    <p className="type-caption truncate text-xs">
                      {state.leader ??
                        (state.proposals > 0
                          ? `${state.proposals} ${state.proposals === 1 ? "proposal" : "proposals"}`
                          : "No proposals")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>

        {isOwner && (
          <details className="border border-border bg-card text-card-foreground">
            <summary className="type-label cursor-pointer px-4 py-3 text-sm">
              Style and settings
            </summary>
            <div className="space-y-6 border-t border-border px-4 py-4">
              <StylePicker presetId={deck.presetId} frameId={deck.frameId} anchor={deck.anchor} />
              <BackPicker
                frameId={deck.frameId}
                back={deck.back}
                drawing={deck.backDrawing}
                error={deck.backError}
              />
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
