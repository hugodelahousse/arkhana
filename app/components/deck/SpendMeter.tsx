import { useState } from "react";
import { USD } from "../../lib/deck/pricing";
import type { DeckData } from "../../lib/deck/client";

const PURPOSE_LABEL: Record<string, string> = {
  chat: "Agent",
  critique: "Critiques",
  rewrite: "Brief rewrites",
  revise: "Note routing",
  probe: "Style probes",
  plate: "Cast sheets (retired)",
  describe: "Reference descriptions",
  draft: "Drafts",
  final: "Finals",
};

/** Always-visible spend: actual (from usage) vs budget, with a ledger breakdown. */
export function SpendMeter({ data, onBudget }: { data: DeckData; onBudget: (micros: number) => void }) {
  const [open, setOpen] = useState(false);
  const { spentMicros, reservedMicros, budgetMicros } = data.budget;
  const pct = budgetMicros ? Math.min(100, (spentMicros / budgetMicros) * 100) : 100;
  const pctReserved = budgetMicros ? Math.min(100 - pct, (reservedMicros / budgetMicros) * 100) : 0;

  const byPurpose = new Map<string, { cost: number; est: number; n: number }>();
  for (const l of data.ledger) {
    const e = byPurpose.get(l.purpose) ?? { cost: 0, est: 0, n: 0 };
    e.cost += l.costMicros;
    e.est += l.estimateMicros;
    e.n += 1;
    byPurpose.set(l.purpose, e);
  }

  return (
    <div className="relative">
      <button
        className="flex items-center gap-3 border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary/60"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="tabular-nums">
          {USD(spentMicros)} <span className="text-muted-foreground">/ {USD(budgetMicros)}</span>
        </span>
        <span className="relative h-1.5 w-24 overflow-hidden bg-muted" aria-hidden>
          <span className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${pct}%` }} />
          <span className="absolute inset-y-0 bg-primary/35" style={{ left: `${pct}%`, width: `${pctReserved}%` }} />
        </span>
        {reservedMicros > 0 && <span className="text-muted-foreground">+{USD(reservedMicros)} in flight</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 space-y-3 border border-border bg-card p-4 text-card-foreground shadow-xl">
          <p className="type-ghost">Spend on this deck</p>
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left font-normal">What</th>
                <th className="text-right font-normal">Calls</th>
                <th className="text-right font-normal">Actual</th>
                <th className="text-right font-normal">Estimated</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {[...byPurpose.entries()].map(([p, e]) => (
                <tr key={p}>
                  <td>{PURPOSE_LABEL[p] ?? p}</td>
                  <td className="text-right">{e.n}</td>
                  <td className="text-right">{USD(e.cost)}</td>
                  <td className="text-right text-muted-foreground">{e.est ? USD(e.est) : "—"}</td>
                </tr>
              ))}
              {byPurpose.size === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted-foreground">
                    Nothing spent yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <form
            className="flex items-center gap-2 text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number(new FormData(e.currentTarget).get("budget"));
              if (Number.isFinite(v) && v >= 0) onBudget(Math.round(v * 1e6));
            }}
          >
            <label htmlFor="deck-budget" className="text-muted-foreground">
              Hard budget $
            </label>
            <input
              id="deck-budget"
              name="budget"
              type="number"
              min={0}
              step={1}
              defaultValue={budgetMicros / 1e6}
              className="w-20 border border-border bg-background px-2 py-1 text-foreground"
            />
            <button className="underline underline-offset-2">Save</button>
          </form>
          <p className="type-caption">
            Actual cost comes from the token usage OpenAI reports for each call. Estimates gate spending: anything over $1 asks first, and
            nothing runs past the budget.
          </p>
        </div>
      )}
    </div>
  );
}
