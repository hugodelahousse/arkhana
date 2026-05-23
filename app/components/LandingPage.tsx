import { useState, useEffect, useRef } from "react";
import { Form, useNavigation } from "react-router";
import { TarotCard } from "./TarotCard";
import { CARD_BY_ID, type Rarity } from "../lib/cards";
import { cardImageUrl } from "../lib/cardImages";

const SHOWCASE_CARDS = [0, 2, 9, 10, 12, 13, 15, 16, 18, 21];

function randomRarity(): Rarity {
  const r = Math.random();
  if (r < 0.3) return 1;
  if (r < 0.55) return 2;
  if (r < 0.8) return 3;
  if (r < 0.93) return 4;
  return 5;
}

type CarouselPhase = "hidden" | "revealed" | "fading";

export function LandingPage({ authError }: { authError?: string | null }) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<CarouselPhase>("hidden");
  const [rarity, setRarity] = useState<Rarity>(() => randomRarity());
  const [isRadiant, setIsRadiant] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    SHOWCASE_CARDS.forEach((id) => {
      const img = new Image();
      img.src = cardImageUrl(id);
    });
  }, []);

  useEffect(() => {
    function tick() {
      setPhase((prev) => {
        switch (prev) {
          case "hidden":
            timerRef.current = setTimeout(tick, 5000);
            return "revealed";
          case "revealed":
            timerRef.current = setTimeout(tick, 900);
            return "fading";
          case "fading":
            setCardIndex((i) => (i + 1) % SHOWCASE_CARDS.length);
            setRarity(randomRarity());
            setIsRadiant(Math.random() < 0.15);
            timerRef.current = setTimeout(tick, 5000);
            return "revealed";
        }
      });
    }

    timerRef.current = setTimeout(tick, 1000);
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-6 py-8 text-center">
      <div className="max-w-md w-full space-y-6 sm:space-y-10">
        <h1 className="text-4xl sm:text-6xl font-light tracking-widest text-muted">
          ARKHANA
        </h1>

        <div className="flex justify-center">
          <TarotCard
            card={CARD_BY_ID[SHOWCASE_CARDS[cardIndex]]}
            rarityScore={rarity}
            isReversed={false}
            isRadiant={isRadiant}
            revealed={phase !== "hidden"}
            size="lg"
          />
        </div>

        <p className="text-base sm:text-lg tracking-wide opacity-60 italic">
          What will be your fate today?
        </p>

        <Form method="post" className="space-y-3">
          <input type="hidden" name="_action" value="auth" />
          {authError && (
            <p className="text-sm text-rarity-arcane">
              {authError}
            </p>
          )}
          <div className="flex gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="your@email.com"
              autoComplete="email"
              className="flex-1 bg-transparent border border-border px-4 py-3 text-sm outline-none opacity-60 focus:opacity-100 placeholder:opacity-30"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 text-sm tracking-widest uppercase border border-border text-muted transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isSubmitting ? "…" : "Enter"}
            </button>
          </div>
        </Form>
      </div>
    </main>
  );
}
