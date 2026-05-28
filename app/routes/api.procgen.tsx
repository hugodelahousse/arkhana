import { Resvg } from "@resvg/resvg-js";
import { generateCard, CARD_DATA } from "../lib/procgen-tarot";
import type { Route } from "./+types/api.procgen";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);

  const rawId = parseInt(url.searchParams.get("id") ?? "0", 10);
  const cardId = Number.isNaN(rawId) || rawId < 0 || rawId > 77 ? 0 : rawId;
  const seed = parseInt(url.searchParams.get("seed") ?? "12345", 10) || 12345;
  const palette = url.searchParams.get("palette") ?? undefined;
  const width = Math.min(1200, Math.max(100, parseInt(url.searchParams.get("w") ?? "376", 10) || 376));

  const svg = generateCard(cardId, seed, { palette });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles: [],
      loadSystemFonts: false,
      defaultFontFamily: "serif",
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
