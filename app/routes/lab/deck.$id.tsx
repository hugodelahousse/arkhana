import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/deck.$id";
import { config } from "../../../config/index.js";
import { api, rememberDeck, useApiKey, useDeck } from "../../lib/deck/client";
import { KeyGate } from "../../components/deck/KeyGate";
import { SpendMeter } from "../../components/deck/SpendMeter";
import { DeckChat } from "../../components/deck/DeckChat";
import { Wizard, type StepId } from "../../components/deck/Wizard";
import { Button } from "../../components/Button";

export function meta() {
  return [{ title: "Deck Lab — Arkhana" }, { name: "robots", content: "noindex, nofollow" }];
}

export function loader({ params, context }: Route.LoaderArgs) {
  if (!config.labDeckEnabled) throw new Response("Not found", { status: 404 });
  return { id: params.id, signedIn: !!context.user && !context.user.isAnonymous };
}

export default function DeckWorkspace({ loaderData }: Route.ComponentProps) {
  const { id, signedIn } = loaderData;
  const [apiKey, setApiKey] = useApiKey();
  const { data, error, refresh } = useDeck(id);
  // null = automatic: open while the deck is still empty, closed once it has briefs.
  const [agentPanel, setAgentPanel] = useState<boolean | null>(null);
  const sendToAgent = useRef<((text: string) => void) | null>(null);
  const registerSend = useCallback((send: (text: string) => void) => {
    sendToAgent.current = send;
  }, []);

  useEffect(() => {
    if (data) rememberDeck(id, data.deck.title);
  }, [id, data?.deck.title]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !data) {
    return (
      <div className="min-h-screen bg-background p-8 text-foreground">
        <p className="type-body">{error}</p>
        <Link className="underline" to="/lab/deck">
          Back to decks
        </Link>
      </div>
    );
  }
  if (!data)
    return <div className="min-h-screen bg-background p-8 type-caption">Loading deck…</div>;

  if (!data.canEdit) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
        <div className="mx-auto max-w-xl space-y-4">
          <p className="type-ghost">Deck Lab</p>
          <h1 className="type-page-title text-3xl">{data.deck.title}</h1>
          <p className="type-body">
            {signedIn
              ? "This deck belongs to someone else, so you can view it but not change it."
              : "Sign in as this deck's owner to edit it."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/lab/deck/${id}/preview`}
              className="border border-border px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-muted"
            >
              Open the preview
            </Link>
            {!signedIn && (
              <Link
                to="/auth/signin"
                className="border border-border px-3 py-1.5 text-xs uppercase tracking-widest hover:bg-muted"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const started = data.cards.some((c) => c.subject.trim()) || data.messages.length > 0;
  const agentOpen = agentPanel ?? !data.cards.some((c) => c.subject.trim());
  const setStep = async (s: StepId) => {
    await api(`/decks/${id}`, { method: "PATCH", body: JSON.stringify({ wizardStep: s }) });
    await refresh();
  };
  const ctx = {
    data,
    apiKey,
    refresh,
    notifyAgent: (text: string) => {
      setAgentPanel(true);
      sendToAgent.current?.(text);
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:h-screen">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2">
        <Link to="/lab/deck" className="type-ghost hover:text-foreground">
          ← Decks
        </Link>
        <input
          key={data.deck.title}
          defaultValue={data.deck.title}
          onBlur={(e) =>
            e.target.value !== data.deck.title &&
            api(`/decks/${id}`, {
              method: "PATCH",
              body: JSON.stringify({ title: e.target.value }),
            }).then(refresh)
          }
          className="min-w-0 flex-1 bg-transparent font-serif text-xl text-primary outline-none"
          aria-label="Deck title"
        />
        <SpendMeter
          data={data}
          onBudget={(budgetMicros) =>
            api(`/decks/${id}`, { method: "PATCH", body: JSON.stringify({ budgetMicros }) }).then(
              refresh
            )
          }
        />
        <KeyGate apiKey={apiKey} setApiKey={setApiKey} compact />
        <Link
          to={`/lab/deck/${id}/preview`}
          className="border border-border px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Preview deck
        </Link>
        <a
          href={`/api/lab-deck/decks/${id}/bundle`}
          download
          title="Download the whole deck (briefs, cast, images) to import it elsewhere"
          className="border border-border px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          Export
        </a>
        <Button
          size="sm"
          variant={agentOpen ? "fill" : "outline"}
          onClick={() => setAgentPanel(!agentOpen)}
          aria-expanded={agentOpen}
        >
          Agent{data.agentRunning && " ·  working…"}
        </Button>
      </header>

      {!apiKey && (
        <div className="border-b border-border p-4">
          <div className="mx-auto max-w-2xl">
            <KeyGate apiKey={apiKey} setApiKey={setApiKey} />
          </div>
        </div>
      )}

      <div className="flex flex-1 lg:min-h-0">
        <main className="min-w-0 flex-1 p-4 sm:p-8 lg:min-h-0 lg:overflow-y-auto">
          {!started && (
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-5 text-card-foreground">
              <div className="space-y-1">
                <p className="font-serif text-xl text-primary">Start with the agent</p>
                <p className="type-caption max-w-xl">
                  Describe a theme or paste your cast. It proposes styles for you to pick, then
                  fills in the cast and all 22 card briefs here, step by step. You can also set
                  everything by hand below.
                </p>
              </div>
              {!agentOpen && (
                <Button variant="fill" onClick={() => setAgentPanel(true)}>
                  Open the agent
                </Button>
              )}
            </div>
          )}
          <Wizard ctx={ctx} step={data.deck.wizardStep as StepId} onStep={setStep} />
        </main>

        {/* Docked on wide screens, a bottom sheet on narrow ones. Always mounted,
            so closing it never interrupts or loses a turn. */}
        <aside
          aria-label="Agent"
          className={`${agentOpen ? "flex" : "hidden"} flex-col bg-background
            max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:h-[80vh] max-lg:border-t max-lg:border-border max-lg:shadow-2xl
            lg:min-h-0 lg:w-[28rem] lg:shrink-0 lg:border-l lg:border-border`}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="type-ghost">Agent</span>
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setAgentPanel(false)}
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <DeckChat
              deckId={id}
              apiKey={apiKey}
              serverMessages={data.messages}
              agentRunning={data.agentRunning}
              onProgress={refresh}
              onOpenStep={setStep}
              registerSend={registerSend}
              compact
            />
          </div>
        </aside>
      </div>

      {!agentOpen && (
        <button
          onClick={() => setAgentPanel(true)}
          className="fixed bottom-5 right-5 z-30 border border-primary/60 bg-background px-4 py-2 text-xs uppercase tracking-widest text-primary shadow-lg hover:border-primary"
        >
          {data.agentRunning ? "Agent · working…" : "Ask the agent"}
        </button>
      )}
    </div>
  );
}
