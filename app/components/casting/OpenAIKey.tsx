import { useState } from "react";
import { buttonClass } from "../Button";

/**
 * The viewer's own OpenAI key for the casting lab's AI buttons. It is kept in this browser
 * (see useApiKey) and sent with each request; the server never stores it.
 */
export function OpenAIKey({
  apiKey,
  setApiKey,
  cost,
}: {
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  /** What a call costs, shown once a key is set: "about $0.05 a card". */
  cost: string;
}) {
  const [draft, setDraft] = useState("");
  if (apiKey)
    return (
      <p className="type-caption text-xs">
        Runs on your OpenAI key …{apiKey.slice(-4)}, {cost}.{" "}
        <button type="button" className="underline" onClick={() => setApiKey(null)}>
          Forget key
        </button>
      </p>
    );
  return (
    <div className="flex gap-2">
      <input
        type="password"
        autoComplete="off"
        spellCheck={false}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label="OpenAI API key"
        placeholder="OpenAI key (sk-…) to write or draw"
        className="w-full border border-border bg-card px-3 py-1.5 font-mono text-sm text-card-foreground placeholder:text-faint-foreground focus:border-ring focus:outline-none"
      />
      <button
        type="button"
        disabled={!draft.trim()}
        className={buttonClass("sm", "outline", "shrink-0 disabled:opacity-40")}
        onClick={() => {
          setApiKey(draft.trim());
          setDraft("");
        }}
      >
        Use
      </button>
    </div>
  );
}
