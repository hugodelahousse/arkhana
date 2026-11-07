import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import Markdown from "react-markdown";
import "./DeckChat.css";
import { DefaultChatTransport } from "ai";
import type { DeckAgentUIMessage } from "../../../server/lab-deck/agent";
import { api, storedApiKey } from "../../lib/deck/client";
import { PRESET_BY_ID } from "../../lib/deck/presets";
import { Button } from "../Button";

const TOOL_LABEL: Record<string, (input: Record<string, unknown> | undefined, output: unknown) => string> = {
  get_deck: () => "Read the deck",
  update_deck: () => "Updated title / theme",
  suggest_styles: () => "Suggested styles",
  choose_style: (i) => `Style: ${PRESET_BY_ID[String(i?.presetId)]?.name ?? String(i?.presetId ?? "")}`,
  customize_style: () => "Customized the Style Bible",
  upsert_cast: (i) => `Cast: ${String(i?.name ?? "")}`,
  remove_cast: () => "Removed a cast member",
  write_briefs: (i, o) => {
    const n = (o as { written?: number } | undefined)?.written ?? (i?.briefs as unknown[] | undefined)?.length ?? 0;
    return `Wrote ${n} card brief${n === 1 ? "" : "s"}`;
  },
  open_wizard: (i) => `Wizard → ${String(i?.step ?? "")}`,
};

type ToolPart = { type: string; toolCallId: string; state: string; input?: Record<string, unknown>; output?: unknown; errorText?: string };

export function DeckChat({
  deckId,
  apiKey,
  serverMessages,
  agentRunning,
  onProgress,
  onOpenStep,
  registerSend,
  compact = false,
}: {
  deckId: string;
  apiKey: string | null;
  /** Messages persisted on the server (source of truth across reloads). */
  serverMessages: unknown[];
  /** A run is in progress on the server (e.g. started before a reload). */
  agentRunning: boolean;
  /** Called whenever the agent changes the deck, so the wizard updates live. */
  onProgress: () => void;
  /** Jump the wizard to a step (e.g. after the agent suggests styles). */
  onOpenStep?: (step: "style" | "cards" | "drafts" | "finals") => void;
  /** Lets the wizard send the agent a message (e.g. "I picked X in the Style tab"). */
  registerSend?: (send: (text: string) => void) => void;
  compact?: boolean;
}) {
  const [transport] = useState(
    () =>
      new DefaultChatTransport<DeckAgentUIMessage>({
        api: `/api/lab-deck/decks/${deckId}/chat`,
        prepareSendMessagesRequest: ({ messages }) => ({
          headers: storedApiKey() ? { "x-openai-key": storedApiKey()! } : ({} as Record<string, string>),
          body: { messages },
        }),
      })
  );
  const { messages, setMessages, sendMessage, status, error, stop } = useChat<DeckAgentUIMessage>({
    id: deckId,
    messages: serverMessages as DeckAgentUIMessage[],
    transport,
    onFinish: () => onProgress(),
  });
  const [input, setInput] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const busy = status === "submitted" || status === "streaming";

  // Keep the chat in sync with the server when we're not streaming locally
  // (after a reload mid-run, or a run that finished while we were away).
  useEffect(() => {
    if (!busy && serverMessages.length > messages.length) setMessages(serverMessages as DeckAgentUIMessage[]);
  }, [busy, serverMessages, messages.length, setMessages]);

  // Refresh the deck each time one of the agent's tools completes.
  const doneTools = messages.reduce(
    (n, m) => n + m.parts.filter((p) => p.type.startsWith("tool-") && (p as ToolPart).state === "output-available").length,
    0
  );
  const lastDone = useRef(doneTools);
  useEffect(() => {
    if (doneTools !== lastDone.current) {
      lastDone.current = doneTools;
      onProgress();
    }
  }, [doneTools, onProgress]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length, status]);

  useEffect(() => {
    registerSend?.((text: string) => {
      if (storedApiKey()) void sendMessage({ text });
    });
  }, [registerSend, sendMessage]);

  function send() {
    const text = input.trim();
    if (!text || busy || agentRunning) return;
    if (!apiKey) return alert("Add your OpenAI API key first.");
    void sendMessage({ text });
    setInput("");
  }

  async function stopRun() {
    await api(`/decks/${deckId}/chat/stop`, { method: "POST" }).catch(() => {});
    void stop();
    onProgress();
  }

  const working = busy || agentRunning;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`min-h-0 flex-1 space-y-5 overflow-y-auto ${compact ? "p-3" : "p-4 sm:p-6"}`}>
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl space-y-3 py-6 text-center">
            <p className="type-page-title text-2xl">What should this deck be?</p>
            <p className="type-body">
              Describe a theme, or paste a cast of characters with descriptions. The agent suggests styles for you to pick, then fills in
              the cast and all 22 Major Arcana briefs, asking about anything thin. You'll see it all appear in the wizard.
            </p>
          </div>
        )}
        {messages.map((m, mi) => (
          <div key={m.id || `m${mi}`} className={m.role === "user" ? "ml-auto max-w-[85%]" : "max-w-full"}>
            {m.parts.map((part, i) => {
              if (part.type === "text") {
                return m.role === "user" ? (
                  <div key={i} className="max-h-72 overflow-y-auto whitespace-pre-wrap border border-border bg-muted px-3 py-2 text-sm text-foreground">
                    {part.text}
                  </div>
                ) : (
                  <div key={i} className="deck-chat-md type-body-serif">
                    <Markdown>{part.text}</Markdown>
                  </div>
                );
              }
              if (part.type === "tool-suggest_styles" && (part as unknown as ToolPart).state === "output-available") {
                const p = part as unknown as ToolPart;
                const opts = (p.input?.options as { presetId: string }[] | undefined) ?? [];
                return (
                  <div key={i} className="my-2 flex flex-wrap items-center gap-3 border border-border px-3 py-2 text-sm">
                    <span className="text-muted-foreground">
                      Suggested {opts.map((o) => PRESET_BY_ID[o.presetId]?.name ?? o.presetId).join(", ")}
                    </span>
                    {onOpenStep && (
                      <Button size="sm" onClick={() => onOpenStep("style")}>
                        Pick in the Style tab →
                      </Button>
                    )}
                  </div>
                );
              }
              if (part.type.startsWith("tool-")) {
                const p = part as unknown as ToolPart;
                const name = p.type.slice(5);
                const label = TOOL_LABEL[name]?.(p.input, p.output) ?? name;
                const done = p.state === "output-available";
                return (
                  <div key={i} className="my-1 mr-1 inline-flex items-center gap-2 border border-border px-2 py-0.5 text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    <span aria-hidden>{p.state === "output-error" ? "✕" : done ? "✓" : "…"}</span>
                    {label}
                    {p.state === "output-error" && <span className="normal-case">{p.errorText}</span>}
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}
        {status === "submitted" && <p className="type-caption">Thinking…</p>}
        {agentRunning && !busy && (
          <p className="type-caption animate-pulse">The agent is still working on this deck; its progress appears here as it saves.</p>
        )}
        {error && <p className="text-sm text-rarity-arcane">{error.message || "The agent hit an error."}</p>}
        <div ref={bottom} />
      </div>
      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={compact ? 3 : 4}
          placeholder={apiKey ? "Describe your deck, paste your cast, or ask for changes…" : "Add your OpenAI key to start"}
          className="w-full resize-y border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="type-caption">Agent turns cost about $0.01–0.08 · Enter to send</span>
          {working ? (
            <Button type="button" size="sm" onClick={stopRun}>
              Stop
            </Button>
          ) : (
            <Button type="submit" size="sm" variant="fill" disabled={!input.trim()}>
              Send
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
