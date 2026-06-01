import { resolve, join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { generateCard } from "./procgen-tarot";

const FONT_PATH = resolve(process.cwd(), "public/fonts/cormorant-garamond.ttf");
const FONT_FILES = existsSync(FONT_PATH) ? [FONT_PATH] : [];
const CACHE_DIR = resolve(process.cwd(), "data/procgen-cache");

function generateOne(cardId: number, seed: number, width: number, palette?: string): void {
  const parts = [cardId, seed, width];
  if (palette) parts.push(palette as unknown as number);
  const key = parts.join("-");
  const path = join(CACHE_DIR, `${key}.png`);

  if (existsSync(path)) return;

  const svgStr = generateCard(cardId, seed, { palette });
  const resvg = new Resvg(svgStr, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: FONT_FILES, loadSystemFonts: true, defaultFontFamily: "Cormorant Garamond" },
  });
  writeFileSync(path, Buffer.from(resvg.render().asPng() as Uint8Array));
}

/**
 * Pre-generate all 78 cards, prioritizing the given card IDs first.
 * Yields to the event loop between cards so the server stays responsive.
 */
export async function prefetchAll(
  seed: number,
  width = 752,
  palette?: string,
  priorityCardIds?: number[],
): Promise<void> {
  mkdirSync(CACHE_DIR, { recursive: true });

  const done = new Set<number>();

  if (priorityCardIds) {
    for (const cardId of priorityCardIds) {
      generateOne(cardId, seed, width, palette);
      done.add(cardId);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  for (let cardId = 0; cardId < 78; cardId++) {
    if (done.has(cardId)) continue;
    generateOne(cardId, seed, width, palette);
    await new Promise((r) => setTimeout(r, 0));
  }
}
