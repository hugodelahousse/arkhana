import { CARDS, cardSlug } from "../lib/cards";

const SITE_URL = "https://arkhana.delaho-h.com";

export function loader() {
  const urls = [
    { loc: SITE_URL, priority: "1.0", changefreq: "daily" },
    ...CARDS.map((card) => ({
      loc: `${SITE_URL}/collection/${cardSlug(card)}`,
      priority: "0.8",
      changefreq: "monthly",
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
