// Entry for the offline deck preview exported from /lab/deck/:id/preview.
// Built by `pnpm build:lab-viewer` into a single classic script + stylesheet
// (public/lab-deck/viewer/), so the exported folder opens straight from disk.
// The deck itself comes from window.__ARKHANA_DECK__ in the exported index.html.
import "../app.css";
import { createRoot } from "react-dom/client";
import { DeckViewer, type ViewerCard } from "../components/deck/DeckViewer";

type ExportedDeck = {
  title: string;
  back: string;
  cards: { key: string; label: string; front: string; reason?: string }[];
};

const deck = (window as unknown as { __ARKHANA_DECK__: ExportedDeck }).__ARKHANA_DECK__;

const cardImage = (src: string, alt: string) => (
  <img src={src} alt={alt} draggable={false} className="block aspect-[2/3] w-full select-none" />
);

function App() {
  const cards: ViewerCard[] = deck.cards.map((c) => ({
    key: c.key,
    label: c.label,
    front: cardImage(c.front, c.label),
    back: cardImage(deck.back, "Card back"),
    reason: c.reason,
  }));
  return (
    <div className="min-h-screen overflow-x-hidden bg-background px-4 py-6 text-foreground">
      <header className="mx-auto mb-8 max-w-5xl">
        <h1 className="type-page-title text-2xl">{deck.title}</h1>
      </header>
      <DeckViewer cards={cards} />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
