import { useState } from "react";
import { api } from "../../lib/deck/client";
import { Button } from "../Button";

/** Enter / check / forget the user's OpenAI key (stored only in this browser). */
export function KeyGate({ apiKey, setApiKey, compact = false }: { apiKey: string | null; setApiKey: (k: string | null) => void; compact?: boolean }) {
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function check(k: string) {
    setStatus("checking");
    setMessage("");
    try {
      const r = await api<{ ok: boolean; error?: string }>("/preflight", { method: "POST", key: k });
      if (r.ok) {
        setApiKey(k);
        setDraft("");
        setStatus("ok");
        setMessage("Key works and can use GPT Image 2.6.");
      } else {
        setStatus("error");
        setMessage(r.error ?? "That key can't be used.");
      }
    } catch (e) {
      setStatus("error");
      setMessage((e as Error).message);
    }
  }

  if (compact) {
    if (!apiKey) return null; // the full gate is shown below the header
    return (
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-rarity-wandering" />
        Key …{apiKey.slice(-4)}
        <button className="underline underline-offset-2 hover:text-foreground" onClick={() => setApiKey(null)}>
          forget
        </button>
      </span>
    );
  }

  return (
    <div className="space-y-3 border border-border bg-card p-4 text-card-foreground">
      <div className="space-y-1">
        <p className="text-sm text-foreground">Your OpenAI API key</p>
        <p className="type-caption">
          It stays in this browser and is sent with each request; the server uses it for that request only and never stores it. Every
          generation is billed to your OpenAI account. Use a{" "}
          <a className="underline underline-offset-2" href="https://platform.openai.com/settings/organization/projects" target="_blank" rel="noreferrer">
            project key with a monthly budget
          </a>{" "}
          as a safety net.
        </p>
      </div>
      {apiKey ? (
        <div className="flex items-center gap-3 text-sm text-foreground">
          <span>Using key …{apiKey.slice(-4)}</span>
          <Button size="sm" onClick={() => check(apiKey)} disabled={status === "checking"}>
            Re-check
          </Button>
          <Button size="sm" onClick={() => setApiKey(null)}>
            Forget
          </Button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) void check(draft.trim());
          }}
        >
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 flex-1 border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus:border-ring"
          />
          <Button type="submit" variant="fill" disabled={status === "checking" || !draft.trim()}>
            {status === "checking" ? "Checking…" : "Use key"}
          </Button>
        </form>
      )}
      {message && <p className={`text-xs ${status === "error" ? "text-rarity-arcane" : "text-muted-foreground"}`}>{message}</p>}
      <p className="type-caption">The check confirms model access but not your credit balance; an empty balance shows up on the first generation.</p>
    </div>
  );
}
