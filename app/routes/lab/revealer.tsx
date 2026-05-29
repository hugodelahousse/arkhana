import { useState } from "react";
import { CARDS, CARD_BY_ID } from "../../lib/cards";
import { cardImageUrl } from "../../lib/cardImages";

export function meta() {
  return [{ title: "Revealer — Arkhana Lab" }];
}

export async function loader() {
  return { utcDate: new Date().toISOString().slice(0, 10) };
}

function dailyCardId(dateStr: string): number {
  let h = 0;
  for (const ch of dateStr) h = (h * 31 + ch.charCodeAt(0)) & 0x7fffffff;
  return h % 78;
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/);
  return m ? m[0].trim() : text.slice(0, 70) + "…";
}

const CLUE_LABELS = ["Essence", "Nature", "Number", "Shrouded", "Unveiled"] as const;
// 0 = text clue, non-zero = image clue with that blur radius
const IMAGE_BLUR = [0, 0, 0, 22, 9] as const;
const MAX_GUESSES = 5;

type Status = "playing" | "won" | "lost";

export default function Revealer({ loaderData }: { loaderData: { utcDate: string } }) {
  const { utcDate } = loaderData;
  const card = CARD_BY_ID[dailyCardId(utcDate)];

  const clueValues: (string | null)[] = [
    firstSentence(card.descriptions[0]),
    card.arcana === "major"
      ? "Major Arcana"
      : `Minor Arcana · ${card.suit![0].toUpperCase() + card.suit!.slice(1)}`,
    `Number ${card.number}`,
    null,
    null,
  ];

  const [wrongCount, setWrongCount] = useState(0);
  const [guesses, setGuesses] = useState<{ text: string; correct: boolean }[]>([]);
  const [status, setStatus] = useState<Status>("playing");
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const cluesShown = Math.min(wrongCount + 1, MAX_GUESSES);
  const suggestions =
    query.length >= 1
      ? CARDS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
      : [];

  function submit(name: string) {
    const text = name.trim();
    if (!text || status !== "playing") return;
    const correct = text.toLowerCase() === card.name.toLowerCase();
    setGuesses((g) => [...g, { text, correct }]);
    setQuery("");
    setShowDropdown(false);
    if (correct) {
      setStatus("won");
    } else if (wrongCount >= MAX_GUESSES - 1) {
      setStatus("lost");
    } else {
      setWrongCount((n) => n + 1);
    }
  }

  function share() {
    const guessStr = guesses.map((g) => (g.correct ? "✅" : "❌")).join("");
    const result =
      status === "won"
        ? `Named in ${wrongCount + 1} clue${wrongCount + 1 === 1 ? "" : "s"} ${guessStr}`
        : `Unsolved ${guessStr}`;
    navigator.clipboard
      .writeText(`Arkhana Revealer · ${utcDate}\n${result}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-md mx-auto px-5 py-10 space-y-6">
        {/* Header */}
        <div className="space-y-0.5">
          <p
            className="text-[0.6rem] tracking-[0.2em] uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            {utcDate}
          </p>
          <h1
            className="text-2xl font-light tracking-widest"
            style={{ color: "var(--foreground)", fontFamily: "var(--font-serif)" }}
          >
            The Revealer
          </h1>
          <p
            className="text-[0.65rem] tracking-[0.15em] uppercase"
            style={{ color: "var(--muted-foreground)" }}
          >
            Name the hidden card
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_GUESSES }, (_, i) => {
            const isWon = status === "won" && i === wrongCount;
            const isWrong = i < wrongCount || status === "lost";
            const isCurrent = status === "playing" && i === wrongCount;
            return (
              <div
                key={i}
                className="h-0.5 flex-1 transition-colors duration-500"
                style={{
                  background: isWon
                    ? "var(--accent)"
                    : isWrong
                      ? "var(--border)"
                      : isCurrent
                        ? "var(--foreground)"
                        : "var(--muted)",
                }}
              />
            );
          })}
        </div>

        {/* Clue cards */}
        <div className="space-y-2">
          {Array.from({ length: cluesShown }, (_, i) => (
            <div
              key={i}
              className="p-4 border"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <p
                className="text-[0.58rem] tracking-[0.18em] uppercase mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                {i + 1} · {CLUE_LABELS[i]}
              </p>
              {IMAGE_BLUR[i] === 0 ? (
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    color: "var(--foreground)",
                    fontFamily: i === 0 ? "var(--font-serif)" : "inherit",
                    opacity: 0.9,
                  }}
                >
                  {clueValues[i]}
                </p>
              ) : (
                <div className="flex justify-center pt-1">
                  <img
                    src={cardImageUrl(card.id)}
                    alt="hidden card"
                    style={{
                      width: 90,
                      height: 156,
                      objectFit: "cover",
                      filter: `blur(${IMAGE_BLUR[i]}px)`,
                      borderRadius: 3,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Result */}
        {status !== "playing" && (
          <div
            className="p-5 border text-center space-y-4"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <img
              src={cardImageUrl(card.id)}
              alt={card.name}
              className="mx-auto"
              style={{ width: 90, height: 156, objectFit: "cover", borderRadius: 3 }}
            />
            <div className="space-y-1">
              <p
                className="text-lg font-light tracking-wide"
                style={{ color: "var(--foreground)", fontFamily: "var(--font-serif)" }}
              >
                {card.name}
              </p>
              <p
                className="text-[0.65rem] tracking-[0.15em] uppercase"
                style={{
                  color: status === "won" ? "var(--accent)" : "var(--muted-foreground)",
                }}
              >
                {status === "won"
                  ? `Named after ${wrongCount + 1} clue${wrongCount + 1 === 1 ? "" : "s"}`
                  : "The card eludes you"}
              </p>
            </div>
            <button
              onClick={share}
              className="px-5 py-2 text-[0.65rem] tracking-[0.15em] uppercase border hover:opacity-75 transition-opacity cursor-pointer"
              style={{
                background: "transparent",
                color: "var(--foreground)",
                borderColor: "var(--border)",
              }}
            >
              {copied ? "Copied" : "Share"}
            </button>
          </div>
        )}

        {/* Guess input */}
        {status === "playing" && (
          <div className="space-y-2">
            <div className="relative">
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit(query);
                    if (e.key === "Escape") setShowDropdown(false);
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  onFocus={() => query.length >= 1 && setShowDropdown(true)}
                  placeholder="Name the card…"
                  className="flex-1 px-4 py-2.5 text-sm border outline-none"
                  style={{
                    background: "var(--muted)",
                    color: "var(--foreground)",
                    borderColor: "var(--border)",
                    fontFamily: "var(--font-serif)",
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  onClick={() => submit(query)}
                  className="px-5 py-2.5 text-[0.65rem] tracking-[0.15em] uppercase border cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    background: "transparent",
                    color: "var(--foreground)",
                    borderColor: "var(--border)",
                  }}
                >
                  Guess
                </button>
              </div>

              {showDropdown && suggestions.length > 0 && (
                <div
                  className="absolute top-full left-0 z-10 border border-t-0"
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    width: "calc(100% - 5.5rem)",
                  }}
                >
                  {suggestions.map((c) => (
                    <button
                      key={c.id}
                      onMouseDown={() => submit(c.name)}
                      className="w-full px-4 py-2 text-left text-sm hover:opacity-70 transition-opacity"
                      style={{ color: "var(--foreground)", fontFamily: "var(--font-serif)" }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {cluesShown < MAX_GUESSES && (
              <p
                className="text-[0.6rem] tracking-[0.1em] uppercase"
                style={{ color: "var(--muted-foreground)" }}
              >
                {MAX_GUESSES - cluesShown} more {MAX_GUESSES - cluesShown === 1 ? "clue" : "clues"} hidden · wrong guess reveals the next
              </p>
            )}
          </div>
        )}

        {/* Guess history */}
        {guesses.length > 0 && (
          <div className="space-y-2">
            <p
              className="text-[0.6rem] tracking-[0.15em] uppercase"
              style={{ color: "var(--muted-foreground)" }}
            >
              Guesses
            </p>
            <div className="flex flex-wrap gap-2">
              {guesses.map((g, i) => (
                <span
                  key={i}
                  className="px-3 py-1 text-xs border"
                  style={{
                    background: "var(--muted)",
                    color: g.correct ? "var(--accent)" : "var(--muted-foreground)",
                    borderColor: "var(--border)",
                    fontFamily: "var(--font-serif)",
                    textDecoration: g.correct ? "none" : "line-through",
                  }}
                >
                  {g.text}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
