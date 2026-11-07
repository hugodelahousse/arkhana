// Download menu and print sheet for the deck preview.
import { Fragment, useEffect, useRef, useState } from "react";
import { CardBack, CardFrame } from "./CardFrame";
import type { FrameId } from "../../lib/deck/presets";
import {
  VIEWER_BUNDLE,
  artifactHtml,
  blobBytes,
  downloadBlob,
  renderCardImage,
  type ImageFormat,
  slugify,
  urlToDataUrl,
  zipFiles,
  type ArtifactCard,
} from "../../lib/deck/export";

export type ExportCard = {
  cardId: number;
  numeral: string;
  name: string;
  artUrl: string | null;
  reason?: string;
};
export type ExportDeck = {
  title: string;
  frameId: FrameId;
  backArtUrl: string | null;
  cards: ExportCard[];
};

const fileBase = (c: ExportCard) => `${String(c.cardId).padStart(2, "0")}-${slugify(c.name)}`;

type Progress = { label: string; done: number; total: number } | null;

/** Composite every card (and the back) to images, reporting progress. */
async function renderCards(
  deck: ExportDeck,
  format: ImageFormat,
  onStep: (done: number, total: number) => void
) {
  const total = deck.cards.length + 1;
  const fronts: { card: ExportCard; bytes: Uint8Array }[] = [];
  let done = 0;
  for (const card of deck.cards) {
    const art = card.artUrl ? await urlToDataUrl(card.artUrl) : null;
    const image = await renderCardImage(
      <CardFrame frameId={deck.frameId} artUrl={art} numeral={card.numeral} title={card.name} />,
      format
    );
    fronts.push({ card, bytes: await blobBytes(image) });
    onStep(++done, total);
  }
  const backArt = deck.backArtUrl ? await urlToDataUrl(deck.backArtUrl) : null;
  const back = await blobBytes(
    await renderCardImage(<CardBack frameId={deck.frameId} artUrl={backArt} />, format)
  );
  onStep(total, total);
  return { fronts, back };
}

export function DownloadMenu({
  deck,
  sourceLabel,
  onPrint,
}: {
  deck: ExportDeck;
  sourceLabel: string;
  onPrint: (opts: PrintOptions) => void;
}) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<Progress>(null);
  const [error, setError] = useState<string | null>(null);
  const [paper, setPaper] = useState<PrintOptions["paper"]>("A4");
  const [backs, setBacks] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const slug = slugify(deck.title);
  const missing = deck.cards.filter((c) => !c.artUrl).length;

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const run = async (
    label: string,
    job: (step: (done: number, total: number) => void) => Promise<void>
  ) => {
    setError(null);
    setProgress({ label, done: 0, total: 1 });
    try {
      await job((done, total) => setProgress({ label, done, total }));
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  const downloadArt = () =>
    run("Collecting art", async (step) => {
      const files: Record<string, Uint8Array> = {};
      const withArt = deck.cards.filter((c) => c.artUrl);
      let done = 0;
      for (const c of withArt) {
        const res = await fetch(c.artUrl!);
        if (!res.ok) throw new Error(`Couldn't fetch the art for ${c.name}.`);
        files[`${slug}-art/${fileBase(c)}.jpg`] = new Uint8Array(await res.arrayBuffer());
        step(++done, withArt.length + 1);
      }
      if (deck.backArtUrl) {
        const res = await fetch(deck.backArtUrl);
        if (res.ok) files[`${slug}-art/back.jpg`] = new Uint8Array(await res.arrayBuffer());
      }
      step(withArt.length + 1, withArt.length + 1);
      downloadBlob(zipFiles(files), `${slug}-art.zip`);
    });

  const downloadCards = () =>
    run("Rendering cards", async (step) => {
      // Lossless masters for printing.
      const { fronts, back } = await renderCards(deck, { type: "image/png" }, step);
      const files: Record<string, Uint8Array> = { [`${slug}-cards/back.png`]: back };
      for (const { card, bytes } of fronts) files[`${slug}-cards/${fileBase(card)}.png`] = bytes;
      downloadBlob(zipFiles(files), `${slug}-cards.zip`);
    });

  const downloadPreview = () =>
    run("Building the preview", async (step) => {
      const [js, css] = await Promise.all(
        [VIEWER_BUNDLE.js, VIEWER_BUNDLE.css].map(async (u) => {
          const res = await fetch(u);
          if (!res.ok)
            throw new Error(
              "The offline viewer isn't built yet: run `pnpm build:lab-viewer` and try again."
            );
          return new Uint8Array(await res.arrayBuffer());
        })
      );
      // JPEG keeps the folder small enough to share (PNG would be ~60 MB).
      const { fronts, back } = await renderCards(deck, { type: "image/jpeg", quality: 0.9 }, step);
      const root = `${slug}-preview`;
      const files: Record<string, Uint8Array | string> = {
        [`${root}/viewer.js`]: js,
        [`${root}/viewer.css`]: css,
        [`${root}/cards/back.jpg`]: back,
      };
      const cards: ArtifactCard[] = fronts.map(({ card, bytes }) => {
        const path = `cards/${fileBase(card)}.jpg`;
        files[`${root}/${path}`] = bytes;
        return {
          key: String(card.cardId),
          label: `${card.numeral} · ${card.name}`,
          front: path,
          reason: card.reason,
        };
      });
      files[`${root}/index.html`] = artifactHtml(deck.title, "cards/back.jpg", cards);
      downloadBlob(zipFiles(files), `${root}.zip`);
    });

  const item = "block w-full px-3 py-2 text-left hover:bg-muted disabled:opacity-50";
  return (
    <div ref={ref} className="relative">
      <button
        className="border border-border px-3 py-1.5 text-xs uppercase tracking-widest text-foreground hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {progress ? `${progress.label}… ${progress.done}/${progress.total}` : "Download"}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-72 border border-border bg-card text-sm text-card-foreground shadow-lg"
        >
          <p className="border-b border-border px-3 py-2 type-caption">
            Uses the art shown ({sourceLabel}).
            {missing > 0 && ` ${missing} card${missing === 1 ? " has" : "s have"} no art yet.`}
          </p>
          <button role="menuitem" className={item} disabled={!!progress} onClick={downloadArt}>
            Art
            <span className="block type-caption">The raw artwork and back, as JPEGs (.zip)</span>
          </button>
          <button role="menuitem" className={item} disabled={!!progress} onClick={downloadCards}>
            Cards
            <span className="block type-caption">
              Finished cards with frames and titles, 1024×1536 PNGs (.zip)
            </span>
          </button>
          <button role="menuitem" className={item} disabled={!!progress} onClick={downloadPreview}>
            Preview artifact
            <span className="block type-caption">
              This preview as a folder: open index.html, works offline (.zip)
            </span>
          </button>
          <div className="space-y-2 border-t border-border px-3 py-2">
            <p>Print</p>
            <div className="flex flex-wrap items-center gap-3 type-caption">
              <label className="flex items-center gap-1">
                Paper
                <select
                  className="border border-border bg-background px-1 py-0.5 text-foreground"
                  value={paper}
                  onChange={(e) => setPaper(e.target.value as PrintOptions["paper"])}
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                </select>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={backs}
                  onChange={(e) => setBacks(e.target.checked)}
                />
                Backs (double-sided)
              </label>
            </div>
            <button
              className="border border-border px-3 py-1 text-xs uppercase tracking-widest hover:bg-muted disabled:opacity-50"
              disabled={!!progress}
              onClick={() => {
                setOpen(false);
                onPrint({ paper, backs });
              }}
            >
              Print…
            </button>
            <p className="type-caption">
              Cards print at 80 × 120 mm, four per page. Print at 100% scale; back pages are
              mirrored for long-edge flipping.
            </p>
          </div>
          {error && (
            <p className="border-t border-border px-3 py-2 text-xs text-rarity-arcane">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Print ────────────────────────────────────────────────────────────────

export type PrintOptions = { paper: "A4" | "Letter"; backs: boolean };
const PAPER_MM = { A4: { w: 210, h: 297 }, Letter: { w: 215.9, h: 279.4 } } as const;
const CARD_MM = { w: 80, h: 120 };
const GAP_MM = 4;

function PrintPage({
  paper,
  cells,
}: {
  paper: PrintOptions["paper"];
  cells: (React.ReactNode | null)[];
}) {
  const p = PAPER_MM[paper];
  return (
    <div
      style={{
        width: `${p.w}mm`,
        height: `${p.h}mm`,
        display: "grid",
        gridTemplateColumns: `${CARD_MM.w}mm ${CARD_MM.w}mm`,
        gridAutoRows: `${CARD_MM.h}mm`,
        gap: `${GAP_MM}mm`,
        justifyContent: "center",
        alignContent: "center",
        breakAfter: "page",
        overflow: "hidden",
      }}
    >
      {cells.map((cell, i) => (
        <div
          key={i}
          style={{
            width: `${CARD_MM.w}mm`,
            height: `${CARD_MM.h}mm`,
            outline: cell ? "0.2mm solid #c8c8c8" : "none",
          }}
        >
          {cell}
        </div>
      ))}
    </div>
  );
}

/**
 * Print-only layout: four cards per page at 80×120 mm. With backs, every
 * fronts page is followed by its backs page, columns swapped so each back
 * lands behind its front when flipped on the long edge.
 */
export function PrintSheet({ deck, options }: { deck: ExportDeck; options: PrintOptions }) {
  const pages: ExportCard[][] = [];
  for (let i = 0; i < deck.cards.length; i += 4) pages.push(deck.cards.slice(i, i + 4));
  const front = (c: ExportCard) => (
    <CardFrame
      frameId={deck.frameId}
      artUrl={c.artUrl}
      numeral={c.numeral}
      title={c.name}
      className="w-full"
    />
  );
  const back = <CardBack frameId={deck.frameId} artUrl={deck.backArtUrl} className="w-full" />;
  return (
    <div className="hidden bg-white print:block">
      <style>{`@page { size: ${options.paper === "A4" ? "A4" : "letter"} portrait; margin: 0; } @media print { html, body { background: #fff !important; } }`}</style>
      {pages.map((page, i) => {
        const slots = [0, 1, 2, 3].map((j) => page[j] ?? null);
        return (
          <Fragment key={i}>
            <PrintPage paper={options.paper} cells={slots.map((c) => (c ? front(c) : null))} />
            {options.backs && (
              <PrintPage
                paper={options.paper}
                cells={[slots[1], slots[0], slots[3], slots[2]].map((c) => (c ? back : null))}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
