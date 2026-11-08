import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/deck.$id.preview";
import { config } from "../../../config/index.js";
import { useDeck, type DeckData } from "../../lib/deck/client";
import { romanNumeral } from "../../lib/deck/prompts";
import { CardFrame } from "../../components/deck/CardFrame";
import type { FrameId } from "../../lib/deck/presets";
import { renderCardImage, urlToDataUrl } from "../../lib/deck/export";
import { DeckViewer, type ViewerCard } from "../../components/deck/DeckViewer";
import { backOf, frameOf } from "../../components/deck/Wizard";
import {
  DownloadMenu,
  PrintSheet,
  type ExportDeck,
  type PrintOptions,
} from "../../components/deck/DeckExport";

export function meta() {
  return [{ title: "Deck Preview — Arkhana" }, { name: "robots", content: "noindex, nofollow" }];
}

export function loader({ params }: Route.LoaderArgs) {
  if (!config.labDeckEnabled) throw new Response("Not found", { status: 404 });
  return { id: params.id };
}

type Source = "latest" | "approved";

/** Pick the art to show for a card: approved = accepted final, else approved draft; latest = newest final, else newest draft. */
function artFor(
  data: DeckData,
  cardId: number,
  source: Source
): { url: string | null; caption: string } {
  const card = data.cards.find((c) => c.cardId === cardId)!;
  const byId = (id: string | null) =>
    id ? data.images.find((i) => i.id === id && i.status === "done") : undefined;
  const newest = (kind: string) =>
    data.images.find((i) => i.kind === kind && i.cardId === cardId && i.status === "done"); // images are newest-first
  if (source === "approved") {
    const f = byId(card.finalImageId);
    if (f) return { url: f.url, caption: "accepted final" };
    const d = byId(card.approvedDraftId);
    if (d) return { url: d.url, caption: "approved draft" };
    return { url: null, caption: "nothing approved yet" };
  }
  const f = newest("final");
  if (f) return { url: f.url, caption: "latest final" };
  const d = newest("draft");
  if (d) return { url: d.url, caption: "latest draft" };
  return { url: null, caption: "no art yet" };
}

type FlatInput = { frameId: FrameId; artUrl: string; numeral: string; title: string };
const flatKey = (f: FlatInput) => [f.frameId, f.artUrl, f.numeral, f.title].join("|");

/**
 * Flatten each card front (frame, art and title) into one JPEG, a card at a time.
 * The viewer then moves plain images around in 3D instead of live SVG: some frames
 * carry filters (carved-block's roughened border is a turbulence filter) that phones
 * redraw on every frame of a swipe. Until a card is ready it shows the live SVG.
 */
function useFlatFronts(inputs: FlatInput[]): Record<string, string> {
  const [flat, setFlat] = useState<Record<string, string>>({});
  // Mirrors `flat` for the effect, which runs across renders; also everything to revoke.
  const made = useRef(new Map<string, string>());
  const wanted = inputs.map(flatKey).join("\n");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const input of inputs) {
        const key = flatKey(input);
        if (cancelled) return;
        if (made.current.has(key)) continue;
        try {
          const art = await urlToDataUrl(input.artUrl);
          if (cancelled) return;
          const blob = await renderCardImage(
            <CardFrame frameId={input.frameId} artUrl={art} numeral={input.numeral} title={input.title} />,
            { type: "image/jpeg", quality: 0.92 }
          );
          const url = URL.createObjectURL(blob);
          made.current.set(key, url);
          if (!cancelled) setFlat((f) => ({ ...f, [key]: url }));
        } catch {
          // Leave this card on the live SVG.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // `wanted` stands for `inputs`: re-run only when the set of cards changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  useEffect(() => {
    const urls = made.current;
    return () => {
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  return flat;
}

const plainImage = (src: string, alt: string, lazy = false) => (
  <img
    src={src}
    alt={alt}
    draggable={false}
    loading={lazy ? "lazy" : undefined}
    decoding="async"
    className="block aspect-[2/3] w-full select-none object-cover"
  />
);

export default function DeckPreview({ loaderData }: Route.ComponentProps) {
  const { id } = loaderData;
  const { data, error } = useDeck(id);
  const [source, setSource] = useState<Source>("latest");

  const flatInputs: FlatInput[] = useMemo(() => {
    if (!data) return [];
    return data.cards.flatMap((card) => {
      const url = artFor(data, card.cardId, source).url;
      return url
        ? [{ frameId: frameOf(data), artUrl: url, numeral: romanNumeral(card.cardId), title: card.name }]
        : [];
    });
  }, [data, source]);
  const flat = useFlatFronts(flatInputs);

  const cards: ViewerCard[] = useMemo(() => {
    if (!data) return [];
    return data.cards.map((card) => {
      const art = artFor(data, card.cardId, source);
      const label = `${romanNumeral(card.cardId)} · ${card.name}`;
      const flatUrl = art.url
        ? flat[flatKey({ frameId: frameOf(data), artUrl: art.url, numeral: romanNumeral(card.cardId), title: card.name })]
        : undefined;
      return {
        key: String(card.cardId),
        label,
        caption: art.caption,
        front: flatUrl ? (
          plainImage(flatUrl, label)
        ) : (
          <CardFrame
            frameId={frameOf(data)}
            artUrl={art.url}
            status={art.url ? undefined : art.caption}
            numeral={romanNumeral(card.cardId)}
            title={card.name}
          />
        ),
        thumb: flatUrl ? (
          plainImage(flatUrl, label)
        ) : art.url ? (
          plainImage(art.url, label, true)
        ) : (
          <div className="aspect-[2/3] w-full bg-muted" />
        ),
        back: backOf(data),
        reason: card.backText.trim() || undefined,
      };
    });
  }, [data, source, flat]);

  const exportDeck: ExportDeck | null = useMemo(() => {
    if (!data) return null;
    const backImageId = data.deck.backImageId;
    return {
      title: data.deck.title,
      frameId: frameOf(data),
      backArtUrl: backImageId
        ? (data.images.find((i) => i.id === backImageId && i.status === "done")?.url ?? null)
        : null,
      cards: data.cards.map((card) => ({
        cardId: card.cardId,
        numeral: romanNumeral(card.cardId),
        name: card.name,
        artUrl: artFor(data, card.cardId, source).url,
        reason: card.backText.trim() || undefined,
      })),
    };
  }, [data, source]);

  // Printing: mount the print sheet, wait for its art to load, then open the print dialog.
  const [printing, setPrinting] = useState<PrintOptions | null>(null);
  useEffect(() => {
    if (!printing || !exportDeck) return;
    let cancelled = false;
    const urls = [...exportDeck.cards.map((c) => c.artUrl), exportDeck.backArtUrl].filter(
      (u): u is string => !!u
    );
    const done = () => setPrinting(null);
    window.addEventListener("afterprint", done, { once: true });
    Promise.all(
      urls.map((u) => {
        const img = new Image();
        img.src = u;
        return img.decode().catch(() => {});
      })
    ).then(() => {
      if (!cancelled) requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", done);
    };
  }, [printing, exportDeck]);

  if (error && !data)
    return <div className="min-h-screen bg-background p-8 type-body">{error}</div>;
  if (!data)
    return <div className="min-h-screen bg-background p-8 type-caption">Loading deck…</div>;

  return (
    <>
      <div className="min-h-screen overflow-x-hidden bg-background px-4 py-6 text-foreground print:hidden">
        <header className="mx-auto mb-8 max-w-5xl space-y-3">
          {data.canEdit && (
            <Link to={`/lab/deck/${id}`} className="type-ghost inline-block hover:text-foreground">
              ← Back to the workspace
            </Link>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <h1 className="type-page-title text-2xl text-balance sm:text-3xl">{data.deck.title}</h1>
            <div className="relative flex flex-wrap items-center gap-2">
              <div
                className="flex border border-border text-xs uppercase tracking-widest"
                role="radiogroup"
                aria-label="Art to show"
              >
                {(["latest", "approved"] as const).map((s) => (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={source === s}
                    onClick={() => setSource(s)}
                    className={`whitespace-nowrap px-3 py-1.5 ${source === s ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                  >
                    {s === "latest" ? "Latest" : "Approved only"}
                  </button>
                ))}
              </div>
              {exportDeck && (
                <DownloadMenu
                  deck={exportDeck}
                  sourceLabel={source === "latest" ? "Latest" : "Approved only"}
                  onPrint={setPrinting}
                />
              )}
            </div>
          </div>
        </header>
        <DeckViewer key={source} cards={cards} />
      </div>
      {printing && exportDeck && <PrintSheet deck={exportDeck} options={printing} />}
    </>
  );
}
