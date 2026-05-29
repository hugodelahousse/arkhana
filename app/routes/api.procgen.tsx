import { Resvg } from "@resvg/resvg-js";
import { resolve, join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { generateCard, CARD_DATA } from "../lib/procgen-tarot";
import type { Route } from "./+types/api.procgen";

const FONT_PATH = resolve(process.cwd(), "public/fonts/cormorant-garamond.ttf");
const FONT_FILES = existsSync(FONT_PATH) ? [FONT_PATH] : [];

const CACHE_DIR = resolve(process.cwd(), "data/procgen-cache");

function cacheKey(cardId: number, seed: number, width: number, palette?: string): string {
  const parts = [cardId, seed, width];
  if (palette) parts.push(palette as unknown as number);
  return parts.join("-");
}

function cachePath(key: string): string {
  return join(CACHE_DIR, `${key}.png`);
}

function renderCard(cardId: number, seed: number, width: number, palette?: string): Buffer {
  const svgStr = generateCard(cardId, seed, { palette });
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: true,
      defaultFontFamily: "Cormorant Garamond",
    },
  });
  return Buffer.from(resvg.render().asPng() as Uint8Array);
}

function getOrGenerate(cardId: number, seed: number, width: number, palette?: string): Buffer {
  const key = cacheKey(cardId, seed, width, palette);
  const path = cachePath(key);

  if (existsSync(path)) {
    return readFileSync(path);
  }

  const png = renderCard(cardId, seed, width, palette);

  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(path, png);

  return png;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  const rawId = parseInt(url.searchParams.get("id") ?? "0", 10);
  const cardId = Number.isNaN(rawId) || rawId < 0 || rawId > 77 ? 0 : rawId;
  const seedParam = url.searchParams.get("seed");
  const seed = seedParam ? (parseInt(seedParam, 10) || 12345) : Math.floor(Math.random() * 2147483647);
  const palette = url.searchParams.get("palette") ?? undefined;
  const width = Math.min(1200, Math.max(100, parseInt(url.searchParams.get("w") ?? "376", 10) || 376));

  const png = getOrGenerate(cardId, seed, width, palette);

  const card = CARD_DATA[cardId];
  const slug = card.name.toLowerCase().replace(/\s+/g, "-");
  const etag = `"${cacheKey(cardId, seed, width, palette)}"`;

  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304 });
  }

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${slug}.png"`,
      "Cache-Control": "public, max-age=604800, s-maxage=604800, immutable",
      "ETag": etag,
    },
  });
}
