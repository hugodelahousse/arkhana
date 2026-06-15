import { Form, Link } from "react-router";
import { ArrowRight } from "@phosphor-icons/react";
import {
  CARD_BY_SLUG,
  cardSlug,
  cardAlt,
  RARITY_LABELS,
  type CardDefinition,
} from "../lib/cards";
import { cardImageUrl } from "../lib/cardImages";
import { buttonClass } from "./Button";
import { JsonLd } from "./JsonLd";

// A handful of iconic Major Arcana, used to seed crawlable internal links to
// the public /collection/:slug card pages from the landing page.
const FEATURED_SLUGS = [
  "the-fool",
  "the-lovers",
  "wheel-of-fortune",
  "the-star",
  "the-moon",
  "the-sun",
];

const RARITIES = Object.values(RARITY_LABELS); // Mundane … Primordial

/**
 * Server-rendered landing page shown at `/` to logged-out visitors and
 * crawlers. Unlike the logged-in dashboard it needs no session, so it gives
 * search engines real, content-rich HTML (heading, copy, internal links,
 * JSON-LD) instead of an empty spinner. The "Draw" CTA posts to the home
 * action, which lazily creates an anonymous session before the draw flow.
 */
export function Landing({ origin }: { origin: string }) {
  const featured = FEATURED_SLUGS.map((slug) => CARD_BY_SLUG[slug]).filter(
    Boolean,
  ) as CardDefinition[];

  return (
    <main className="max-w-2xl mx-auto px-6 py-12 sm:py-20 space-y-14 text-center">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Arkhana",
          url: `${origin}/`,
          description:
            "Draw one tarot card every day and build your personal arkhive. Each pull comes with its own reading. Collect all 78 cards and follow friends to compare draws.",
        }}
      />

      {/* Hero */}
      <header className="space-y-5">
        <p
          className="text-xs tracking-[0.3em] uppercase text-muted-foreground"
          aria-hidden="true"
        >
          ✦
        </p>
        <h1 className="text-4xl sm:text-5xl font-light font-serif text-primary tracking-wide">
          Arkhana
        </h1>
        <p className="text-sm tracking-[0.25em] uppercase text-muted-foreground">
          Daily Tarot Readings
        </p>
        <p className="type-body-serif text-muted-foreground max-w-md mx-auto">
          Draw one card each day and build your personal arkhive. Every pull
          comes with its own reading, and you can follow friends to see what
          they drew.
        </p>
        <div className="flex justify-center pt-2">
          <Form method="post">
            <button
              type="submit"
              className={buttonClass(
                "lg",
                "fill",
                "inline-flex items-center gap-2",
              )}
            >
              Draw your daily card
              <ArrowRight weight="bold" className="size-4" aria-hidden="true" />
            </button>
          </Form>
        </div>
      </header>

      {/* The ritual */}
      <section className="space-y-4 max-w-md mx-auto">
        <h2 className="text-sm tracking-widest uppercase text-muted-foreground">
          The daily ritual
        </h2>
        <ul className="type-body-serif space-y-2 text-left text-muted-foreground">
          <li>One card a day, drawn at your local midnight and yours to keep.</li>
          <li>
            78 cards across the Major and Minor Arcana, each with its own
            reading.
          </li>
          <li>
            Five rarity tiers — {RARITIES.join(", ")} — make each draw a
            discovery.
          </li>
          <li>A growing arkhive that remembers every card you have drawn.</li>
        </ul>
      </section>

      {/* Explore the deck — internal links to public card pages */}
      <section className="space-y-4">
        <h2 className="text-sm tracking-widest uppercase text-muted-foreground">
          Explore the deck
        </h2>
        <ul className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {featured.map((card) => (
            <li key={card.id}>
              <Link
                to={`/collection/${cardSlug(card)}`}
                className="group block space-y-2"
              >
                <img
                  src={cardImageUrl(card.id)}
                  alt={cardAlt(card)}
                  loading="lazy"
                  className="w-full rounded-sm border border-border opacity-90 transition-opacity group-hover:opacity-100"
                />
                <span className="block text-xs font-serif text-muted-foreground group-hover:text-primary">
                  {card.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-xs text-muted-foreground">
        Already keep an arkhive?{" "}
        <Link to="/auth/signin" className="text-primary hover:underline">
          Sign in
        </Link>
      </footer>
    </main>
  );
}
