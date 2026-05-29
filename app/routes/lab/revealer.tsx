import { useState } from "react";
import { CARDS, CARD_BY_ID } from "../../lib/cards";
import type { CardDefinition } from "../../lib/cards";
import { cardImageUrl } from "../../lib/cardImages";

type Element = "Fire" | "Water" | "Air" | "Earth";

const SUIT_ELEMENT: Record<string, Element> = {
  wands: "Fire",
  cups: "Water",
  swords: "Air",
  pentacles: "Earth",
};

// Golden Dawn elemental attributions for Major Arcana (index = card id 0–21)
const MAJOR_ELEMENT: Element[] = [
  "Air",   // 0  The Fool
  "Air",   // 1  The Magician       (Mercury)
  "Water", // 2  The High Priestess (Moon)
  "Earth", // 3  The Empress        (Venus)
  "Fire",  // 4  The Emperor        (Aries)
  "Earth", // 5  The Hierophant     (Taurus)
  "Air",   // 6  The Lovers         (Gemini)
  "Water", // 7  The Chariot        (Cancer)
  "Fire",  // 8  Strength           (Leo)
  "Earth", // 9  The Hermit         (Virgo)
  "Fire",  // 10 Wheel of Fortune   (Jupiter)
  "Air",   // 11 Justice            (Libra)
  "Water", // 12 The Hanged Man     (Water)
  "Water", // 13 Death              (Scorpio)
  "Fire",  // 14 Temperance         (Sagittarius)
  "Earth", // 15 The Devil          (Capricorn)
  "Fire",  // 16 The Tower          (Mars)
  "Air",   // 17 The Star           (Aquarius)
  "Water", // 18 The Moon           (Pisces)
  "Fire",  // 19 The Sun            (Sun)
  "Fire",  // 20 Judgement          (Fire)
  "Earth", // 21 The World          (Saturn)
];

function cardElement(card: CardDefinition): Element {
  return card.arcana === "minor" ? SUIT_ELEMENT[card.suit!] : MAJOR_ELEMENT[card.id];
}

const MINOR_THEME: Record<number, string> = {
  1:  "New beginnings and raw potential",
  2:  "Balance, duality, and choice",
  3:  "Growth, creativity, and collaboration",
  4:  "Stability, rest, and structure",
  5:  "Disruption, conflict, and change",
  6:  "Harmony, resolution, and generosity",
  7:  "Challenge, perseverance, and introspection",
  8:  "Power, momentum, and mastery",
  9:  "Near-completion, intensity, and reflection",
  10: "Completion, excess, and transition",
  11: "Curiosity, openness, and new messages",     // Page
  12: "Action, pursuit, and restless energy",      // Knight
  13: "Mastery, intuition, and inner authority",   // Queen
  14: "Command, vision, and outer authority",      // King
};

const MAJOR_THEME: Record<number, string> = {
  0:  "The threshold before the journey — pure spirit before form",
  1:  "Focused will shaping the fabric of reality",
  2:  "Veiled wisdom and knowledge withheld",
  3:  "Abundance, creation, and the fertile earth",
  4:  "Order, authority, and the will to structure",
  5:  "Tradition, guidance, and the higher principle",
  6:  "Connection, choice, and the pull of desire",
  7:  "Victory through will — the control of opposing forces",
  8:  "Strength found in patience and quiet compassion",
  9:  "Solitary wisdom and the light of the inner lantern",
  10: "The turning wheel of fate — cycles without end",
  11: "Impartial truth and the scales of consequence",
  12: "Surrender, reversal, and the view from below",
  13: "Transformation — the ending that clears the path",
  14: "Flow between extremes, the alchemy of balance",
  15: "Bondage, shadow, and the illusion of chains",
  16: "Sudden rupture — revelation born through collapse",
  17: "Hope renewed, clarity after the storm",
  18: "Illusion, the depths, and the unconscious tide",
  19: "Radiance, joy, and the unbroken clarity of noon",
  20: "Awakening, reckoning, and the call to rise",
  21: "Wholeness — the dance of the completed cosmos",
};

function cardNumerologicalTheme(card: CardDefinition): string {
  return card.arcana === "major" ? MAJOR_THEME[card.id] : MINOR_THEME[card.number];
}

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

const CLUE_LABELS = ["Essence", "Nature", "Element", "Current", "Vision"] as const;
// 0 = text clue, non-zero = image clue with that blur radius
const IMAGE_BLUR = [0, 0, 0, 0, 14] as const;
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
    cardElement(card),
    cardNumerologicalTheme(card),
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
                  className="flex-1 px-4 py-2.5 text-base border outline-none"
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
