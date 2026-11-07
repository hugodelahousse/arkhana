import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/deck";
import { config } from "../../../config/index.js";
import { KeyGate } from "../../components/deck/KeyGate";
import { Button } from "../../components/Button";
import { api, rememberDeck, useApiKey, useRememberedDecks } from "../../lib/deck/client";

export function meta() {
  return [{ title: "Deck Lab — Arkhana" }, { name: "robots", content: "noindex, nofollow" }];
}

export function loader({ context }: Route.LoaderArgs) {
  if (!config.labDeckEnabled) throw new Response("Not found", { status: 404 });
  return { signedIn: !!context.user && !context.user.isAnonymous };
}

export default function DeckLabIndex({ loaderData }: Route.ComponentProps) {
  const { signedIn } = loaderData;
  const [apiKey, setApiKey] = useApiKey();
  const decks = useRememberedDecks();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const navigate = useNavigate();

  const [importing, setImporting] = useState(false);
  async function importBundle(file: File) {
    setImporting(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/lab-deck/import", {
        method: "POST",
        headers: { "Content-Type": "application/zip" },
        body: file,
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !body.id) throw new Error(body.error ?? `Import failed (${res.status})`);
      rememberDeck(body.id, "Imported deck");
      navigate(`/lab/deck/${body.id}`);
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function create() {
    setCreating(true);
    setCreateError(null);
    try {
      const { id } = await api<{ id: string }>("/decks", { method: "POST" });
      rememberDeck(id, "Untitled deck");
      navigate(`/lab/deck/${id}`);
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-2">
          <p className="type-ghost">Lab</p>
          <h1 className="type-page-title text-4xl">Make your own Major Arcana</h1>
          <p className="type-body">
            Describe a theme or paste your cast. An agent drafts the style and all 22 card briefs,
            you approve cheap drafts, then render finals. Images are generated with your own OpenAI
            key, with a hard budget per deck and every cent shown.
          </p>
        </header>

        <KeyGate apiKey={apiKey} setApiKey={setApiKey} />

        <div className="space-y-3">
          {signedIn ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="fill" onClick={create} disabled={creating || importing}>
                {creating ? "Creating…" : "New deck"}
              </Button>
              <label className="cursor-pointer border border-border px-3 py-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
                {importing ? "Importing…" : "Import a deck (.zip)"}
                <input
                  type="file"
                  accept=".zip,application/zip"
                  className="sr-only"
                  disabled={importing}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void importBundle(f);
                  }}
                />
              </label>
            </div>
          ) : (
            <p className="type-body">
              <Link to="/auth/signin" className="underline underline-offset-2">
                Sign in
              </Link>{" "}
              to create or import a deck. Anyone with a deck's link can view its preview.
            </p>
          )}
          {createError && <p className="text-sm text-rarity-arcane">{createError}</p>}
          {decks.length > 0 && (
            <ul className="divide-y divide-border border border-border">
              {decks.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/lab/deck/${d.id}`}
                    className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted"
                  >
                    <span className="text-foreground">{d.title}</span>
                    <span className="type-caption">
                      {new Date(d.openedAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="type-caption">
            Decks you open in this browser are listed above; keep a deck's link to get back to it
            from elsewhere. Only a deck's owner can change it; anyone with its link can view the
            preview.
          </p>
        </div>
      </div>
    </div>
  );
}
