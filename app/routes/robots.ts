import { config } from "../../config/index.js";

export function loader() {
  const body = `User-agent: *
Allow: /
Allow: /collection/

Disallow: /api/
Disallow: /auth/
Disallow: /settings
Disallow: /history
Disallow: /streak
Disallow: /spread/
Disallow: /lab/
Disallow: /u/
Disallow: /share/
Disallow: /s/
Disallow: /circle
Disallow: /follow

Sitemap: ${config.appOrigin}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
