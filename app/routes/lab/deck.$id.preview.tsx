import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/deck.$id.preview";
import { config } from "../../../config/index.js";
import { useDeckPreview, type PreviewData } from "../../lib/deck/client";
import { romanNumeral } from "../../lib/deck/prompts";
import { CardBack, CardFrame } from "../../components/deck/CardFrame";
import { DeckViewer, type ViewerCard } from "../../components/deck/DeckViewer";
import { frameOf } from "../../components/deck/Wizard";
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

/** Pick the art to show for a card: approved = accepted final, else approved draft; latest = the newest final or draft, whichever is more recent. */
function artFor(
  data: PreviewData,
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
  // The most recent art of either kind: drafts made after a final (a restyle) win over it.
  const f = newest("final");
  const d = newest("draft");
  const latest = f && d ? (data.images.indexOf(f) < data.images.indexOf(d) ? f : d) : (f ?? d);
  if (latest) return { url: latest.url, caption: latest === f ? "latest final" : "latest draft" };
  return { url: null, caption: "no art yet" };
}

const plainImage = (src: string, alt: string, lazy = false) => (
  <img
    src={src}
    alt={alt}
    draggable={false}
    loading={lazy ? "lazy" : undefined}
    // Thumbnails wait behind the cards on screen.
    fetchPriority={lazy ? "low" : undefined}
    decoding="async"
    className="block aspect-[2/3] w-full select-none object-cover"
  />
);

export default function DeckPreview({ loaderData }: Route.ComponentProps) {
  const { id } = loaderData;
  const { data, error } = useDeckPreview(id);
  const [source, setSource] = useState<Source>("latest");

  const cards: ViewerCard[] = useMemo(() => {
    if (!data) return [];
    const frameId = frameOf(data);
    const backUrl = data.deck.backImageId
      ? (data.images.find((i) => i.id === data.deck.backImageId)?.url ?? null)
      : null;
    return data.cards.map((card) => {
      const art = artFor(data, card.cardId, source);
      const label = `${romanNumeral(card.cardId)} · ${card.name}`;
      return {
        key: String(card.cardId),
        label,
        caption: art.caption,
        front: (
          <CardFrame
            frameId={frameId}
            artUrl={art.url}
            status={art.url ? undefined : art.caption}
            numeral={romanNumeral(card.cardId)}
            title={card.name}
            htmlArt
          />
        ),
        thumb: art.url ? (
          plainImage(art.url, label, true)
        ) : (
          <div className="aspect-[2/3] w-full bg-muted" />
        ),
        back: <CardBack frameId={frameId} artUrl={backUrl} htmlArt />,
        reason: card.backText.trim() || undefined,
      };
    });
  }, [data, source]);

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
