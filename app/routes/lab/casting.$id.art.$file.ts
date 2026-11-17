// Serves a casting deck's generated card art. Like the deck itself, readable by anyone with the link.
import type { Route } from "./+types/casting.$id.art.$file";
import { artMime, readArt } from "../../lib/casting/art";
import { isDeckId } from "../../lib/casting/store";

export async function loader({ params }: Route.LoaderArgs) {
  const data = isDeckId(params.id) ? await readArt(params.id, params.file) : null;
  if (!data) throw new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": artMime(params.file),
      // Every drawing gets a new file name, so a URL never changes content.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Robots-Tag": "noindex",
    },
  });
}
