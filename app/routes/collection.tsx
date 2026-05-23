import { redirect } from "react-router";
import type { Route } from "./+types/collection";
import { Nav } from "../components/layout/nav";
import { getPulledCardIds } from "../lib/pull";
import { CARDS, MAJOR_ARCANA, MINOR_BY_SUIT } from "../lib/cards";
import { Link } from "react-router";

export async function loader({ context }: Route.LoaderArgs) {
  if (!context.user) return redirect("/");
  const pulledIds = await getPulledCardIds(context.user.id);
  return { user: context.user, pulledIds: [...pulledIds] };
}

export function meta() {
  return [{ title: "Collection — Arkhana" }];
}

export default function Collection({ loaderData }: Route.ComponentProps) {
  const { user, pulledIds } = loaderData;
  const pulled = new Set(pulledIds);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-base)" }}>
      <Nav userName={user.name} />
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <div className="text-center space-y-2">
          <h1
            className="text-2xl font-light tracking-widest"
            style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-serif)" }}
          >
            Collection
          </h1>
          <p className="text-xs tracking-widest uppercase opacity-40" style={{ color: "var(--color-text-primary)" }}>
            {pulled.size} of 78 discovered
          </p>
        </div>

        {/* Major Arcana */}
        <section className="space-y-4">
          <h2 className="text-xs tracking-widest uppercase opacity-50" style={{ color: "var(--color-text-primary)" }}>
            Major Arcana
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {MAJOR_ARCANA.map((card) => (
              <CardTile key={card.id} card={card} discovered={pulled.has(card.id)} />
            ))}
          </div>
        </section>

        {/* Minor Arcana by suit */}
        {MINOR_BY_SUIT.map(({ suit, cards }) => (
          <section key={suit} className="space-y-4">
            <h2 className="text-xs tracking-widest uppercase opacity-50 capitalize" style={{ color: "var(--color-text-primary)" }}>
              {suit}
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {cards.map((card) => (
                <CardTile key={card.id} card={card} discovered={pulled.has(card.id)} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

function CardTile({
  card,
  discovered,
}: {
  card: (typeof CARDS)[number];
  discovered: boolean;
}) {
  const content = (
    <div
      className="aspect-[2/3] border flex flex-col items-center justify-center p-2 text-center transition-opacity"
      style={{
        borderColor: discovered ? "var(--color-border-default)" : "var(--color-bg-elevated)",
        background: discovered ? "var(--color-bg-surface)" : "var(--color-bg-base)",
        opacity: discovered ? 1 : 0.3,
      }}
    >
      <span
        className="text-xs leading-tight"
        style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}
      >
        {discovered ? card.name : "?"}
      </span>
    </div>
  );

  if (discovered) {
    return <Link to={`/card/${card.id}`}>{content}</Link>;
  }
  return content;
}
