// Client-side exports for the deck preview: raw art, composited card images,
// and a self-contained preview artifact. Everything is rendered in the browser
// so the frames' live text uses the same fonts as on screen.
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import type { ReactElement } from "react";
import { zipSync, type Zippable } from "fflate";
import { CARD_H, CARD_W } from "../../components/deck/CardFrame";

export const VIEWER_BUNDLE = {
  js: "/lab-deck/viewer/viewer.js",
  css: "/lab-deck/viewer/viewer.css",
};

export function slugify(s: string): string {
  return (
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "card"
  );
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch ${url} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([bytes as BlobPart], { type: mime }));
  });
}

export async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch ${url} (${res.status})`);
  const blob = await res.blob();
  return bytesToDataUrl(new Uint8Array(await blob.arrayBuffer()), blob.type || "image/jpeg");
}

// ── Fonts ────────────────────────────────────────────────────────────────

const fontCssCache = new Map<string, Promise<string>>();

/** The page's @font-face rules for these families, with every font file inlined as a data URL. */
function embeddedFontCss(families: string[]): Promise<string> {
  const key = [...families].sort().join("|");
  let cached = fontCssCache.get(key);
  if (!cached) {
    cached = (async () => {
      const wanted = new Set(families.map((f) => f.toLowerCase()));
      const rules: CSSFontFaceRule[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        let list: CSSRuleList;
        try {
          list = sheet.cssRules;
        } catch {
          continue; // cross-origin sheet
        }
        for (const rule of Array.from(list)) {
          if (rule instanceof CSSFontFaceRule) {
            const fam = rule.style
              .getPropertyValue("font-family")
              .replace(/["']/g, "")
              .trim()
              .toLowerCase();
            if (wanted.has(fam)) rules.push(rule);
          }
        }
      }
      const out: string[] = [];
      for (const rule of rules) {
        let css = rule.cssText;
        const urls = [...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);
        for (const u of new Set(urls)) {
          if (u.startsWith("data:")) continue;
          const abs = new URL(u, (rule.parentStyleSheet?.href ?? location.href) as string).href;
          const mime = /\.woff2(\?|$)/.test(abs)
            ? "font/woff2"
            : /\.woff(\?|$)/.test(abs)
              ? "font/woff"
              : "font/ttf";
          const dataUrl = await bytesToDataUrl(await fetchBytes(abs), mime);
          css = css.split(u).join(dataUrl);
        }
        out.push(css);
      }
      return out.join("\n");
    })();
    fontCssCache.set(key, cached);
  }
  return cached;
}

function fontFamiliesIn(svg: SVGSVGElement): string[] {
  const fams = new Set<string>();
  svg.querySelectorAll("[font-family]").forEach((el) => {
    const first = el.getAttribute("font-family")!.split(",")[0].replace(/["']/g, "").trim();
    if (first) fams.add(first);
  });
  return [...fams];
}

// ── Rendering ────────────────────────────────────────────────────────────

/**
 * Render a card component (CardFrame or CardBack, with its art already as a
 * data URL) to a PNG (or JPEG) at the card's native 1024×1536.
 */
export type ImageFormat = { type: "image/png" } | { type: "image/jpeg"; quality: number };

export async function renderCardImage(
  element: ReactElement,
  format: ImageFormat = { type: "image/png" },
  scale = 1
): Promise<Blob> {
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${CARD_W}px;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(element));
    const svg = host.querySelector("svg");
    if (!svg) throw new Error("The card didn't render an SVG.");
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("width", String(CARD_W * scale));
    clone.setAttribute("height", String(CARD_H * scale));
    const fonts = await embeddedFontCss(fontFamiliesIn(clone));
    if (fonts) {
      const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
      style.textContent = fonts;
      clone.insertBefore(style, clone.firstChild);
    }
    const markup = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      // Fonts inside an SVG image can land a frame after decode; give them a moment.
      await new Promise((r) => setTimeout(r, 60));
      const canvas = document.createElement("canvas");
      canvas.width = CARD_W * scale;
      canvas.height = CARD_H * scale;
      const ctx = canvas.getContext("2d")!;
      if (format.type === "image/jpeg") {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Couldn't encode the image."))),
          format.type,
          "quality" in format ? format.quality : undefined
        )
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    root.unmount();
    host.remove();
  }
}

// ── Packaging ────────────────────────────────────────────────────────────

export async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

/** Zip without recompressing (images are already compressed). */
export function zipFiles(files: Record<string, Uint8Array | string>): Blob {
  const entries: Zippable = {};
  for (const [path, data] of Object.entries(files)) {
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
    entries[path] = [bytes, { level: /\.(png|jpe?g|woff2?)$/i.test(path) ? 0 : 6 }];
  }
  return new Blob([zipSync(entries) as BlobPart], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export type ArtifactCard = { key: string; label: string; front: string; reason?: string };

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** index.html for the offline preview: a classic script (works from file://) reading inline deck data. */
export function artifactHtml(title: string, back: string, cards: ArtifactCard[]): string {
  // Escape "<" so the JSON can't close the script tag.
  const data = JSON.stringify({ title, back, cards }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="viewer.css">
</head>
<body class="bg-background text-foreground">
<div id="root"></div>
<script>window.__ARKHANA_DECK__ = ${data};</script>
<script src="viewer.js"></script>
</body>
</html>
`;
}
