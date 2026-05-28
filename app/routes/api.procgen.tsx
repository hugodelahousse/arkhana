import { Resvg } from "@resvg/resvg-js";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { generateCard, CARD_DATA } from "../lib/procgen-tarot";
import type { Route } from "./+types/api.procgen";

const FONT_PATH = resolve(process.cwd(), "public/fonts/cormorant-garamond.ttf");
const FONT_FILES = existsSync(FONT_PATH) ? [FONT_PATH] : [];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  const rawId = parseInt(url.searchParams.get("id") ?? "0", 10);
  const cardId = Number.isNaN(rawId) || rawId < 0 || rawId > 77 ? 0 : rawId;
  const seedParam = url.searchParams.get("seed");
  const seed = seedParam ? (parseInt(seedParam, 10) || 12345) : Math.floor(Math.random() * 2147483647);
  const palette = url.searchParams.get("palette") ?? undefined;
  const width = Math.min(1200, Math.max(100, parseInt(url.searchParams.get("w") ?? "376", 10) || 376));

  const svgStr = generateCard(cardId, seed, { palette });

  const resvg = new Resvg(svgStr, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: true,
      defaultFontFamily: "Cormorant Garamond",
    },
  });
  const png = resvg.render().asPng() as Uint8Array;

  const card = CARD_DATA[cardId];
  const slug = card.name.toLowerCase().replace(/\s+/g, "-");

  return new Response(Buffer.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${slug}.png"`,
      "Cache-Control": "public, max-age=604800, s-maxage=604800",
    },
  });
}
