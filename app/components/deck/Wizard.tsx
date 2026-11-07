import { useMemo, useState, type ReactNode } from "react";
import { FRAMES, CardBack, CardFrame, FlipCard } from "./CardFrame";
import { Button } from "../Button";
import { PRESET_BY_ID, STYLE_PRESETS, effectiveBible, isPresetUnmodified, type FrameId } from "../../lib/deck/presets";
import { romanNumeral } from "../../lib/deck/prompts";
import { USD } from "../../lib/deck/pricing";
import {
  api,
  fileToDataUrl,
  generate,
  useEstimate,
  type DeckCard,
  type DeckCastMember,
  type DeckData,
  type DeckImage,
  type GenerateBody,
} from "../../lib/deck/client";

export const STEPS = [
  { id: "style", label: "Style" },
  { id: "cards", label: "Cards" },
  { id: "drafts", label: "Drafts" },
  { id: "finals", label: "Finals" },
] as const;
export type StepId = (typeof STEPS)[number]["id"];

export type DraftQuality = "low" | "medium";

type Ctx = {
  data: DeckData;
  apiKey: string | null;
  refresh: () => Promise<unknown>;
  /** Send the agent a chat message (used to tell it about wizard choices). */
  notifyAgent?: (text: string) => void;
};

const field = "w-full border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-ring";

export function frameOf(data: DeckData): FrameId {
  return (data.deck.frameId as FrameId | null) ?? PRESET_BY_ID[data.deck.presetId]?.frameId ?? "carved-block";
}
function anchorUrl(data: DeckData): string | null {
  const { deck } = data;
  if (deck.anchorImageId) return data.images.find((i) => i.id === deck.anchorImageId)?.url ?? null;
  if (isPresetUnmodified(deck.presetId, deck.styleBible)) return PRESET_BY_ID[deck.presetId]?.anchorUrl ?? null;
  return null;
}
function statusLabel(img?: DeckImage): ReactNode {
  if (!img) return null;
  if (img.status === "queued") return "Queued…";
  if (img.status === "running") return <span className="animate-pulse">Drawing…</span>;
  if (img.status === "error") return <span className="text-rarity-arcane">{img.error}</span>;
  return null;
}

export function backOf(data: DeckData) {
  const backArt = data.deck.backImageId ? data.images.find((i) => i.id === data.deck.backImageId)?.url : null;
  return <CardBack frameId={frameOf(data)} artUrl={backArt} />;
}

async function patchDeck(ctx: Ctx, body: object) {
  await api(`/decks/${ctx.data.deck.id}`, { method: "PATCH", body: JSON.stringify(body) });
  await ctx.refresh();
}
async function patchCard(ctx: Ctx, cardId: number, body: object) {
  await api(`/decks/${ctx.data.deck.id}/cards/${cardId}`, { method: "PATCH", body: JSON.stringify(body) });
  await ctx.refresh();
}
async function patchCast(ctx: Ctx, castId: string, body: object) {
  await api(`/decks/${ctx.data.deck.id}/cast/${castId}`, { method: "PATCH", body: JSON.stringify(body) });
  await ctx.refresh();
}

/** A spend button that always shows its estimate. */
function SpendButton({ ctx, body, label, disabled }: { ctx: Ctx; body: GenerateBody | null; label: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const { est, err } = useEstimate(ctx.data.deck.id, body, ctx.data.budget.spentMicros + ctx.data.images.length);
  const n = est?.count ?? 0;
  const { spentMicros, reservedMicros, budgetMicros } = ctx.data.budget;
  const availableMicros = budgetMicros - spentMicros - reservedMicros;
  const overBudget = !!est && n > 0 && est.estimateMicros > availableMicros;
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        size="sm"
        variant="fill"
        disabled={disabled || busy || !body || !n}
        onClick={async () => {
          if (!body) return;
          setBusy(true);
          try {
            if (await generate(ctx.data.deck.id, ctx.apiKey, body)) await ctx.refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        {label}
        {est && n > 0 && ` · ${n > 1 ? `${n} images, ` : ""}~${USD(est.estimateMicros)}`}
      </Button>
      {err && <span className="text-xs text-rarity-arcane">{err}</span>}
      {overBudget && (
        <span className="text-xs text-rarity-arcane">
          Over budget: only {USD(Math.max(availableMicros, 0))} left of {USD(budgetMicros)}. Raise the deck budget to continue.
        </span>
      )}
    </span>
  );
}

/** The revision note an image was generated with, if any (read back from its prompt). */
function noteOf(img?: DeckImage): string | null {
  const p = img?.prompt ?? "";
  return /Change only this: ([\s\S]*?)\. Keep everything else/.exec(p)?.[1] ?? /REVISION REQUESTED BY THE ARTIST: ([^\n]*)/.exec(p)?.[1] ?? null;
}

type NoteMode = "auto" | "keep" | "fresh";

/**
 * "Redraft with note". Auto (default) lets a small text call put the note
 * where it belongs (card brief and/or character description) and choose
 * between keeping the image and a fresh take; keep/fresh force the mode.
 */
function RedraftWithNote({
  ctx,
  base,
  target,
  body,
}: {
  ctx: Ctx;
  base?: DeckImage;
  target: { cardId: number; quality: DraftQuality };
  body: (note: string, baseImageId?: string) => GenerateBody;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<NoteMode>("auto");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const canKeep = base?.status === "done";
  const trimmed = note.trim();
  const plain = trimmed ? body(trimmed, mode === "keep" && canKeep ? base!.id : undefined) : null;
  const { est } = useEstimate(ctx.data.deck.id, plain, ctx.data.images.length);

  if (!open) {
    return (
      <div className="space-y-1">
        {result && <p className="text-xs text-foreground">{result}</p>}
        <button className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => setOpen(true)}>
          Redraft with note…
        </button>
      </div>
    );
  }

  async function applyAuto() {
    if (!ctx.apiKey) return alert("Add your OpenAI API key first.");
    setBusy(true);
    try {
      const r = await api<{ summary: string; mode: string }>(`/decks/${ctx.data.deck.id}/revise`, {
        method: "POST",
        key: ctx.apiKey,
        body: JSON.stringify({ note: trimmed, ...target }),
      });
      setResult(r.summary);
      setOpen(false);
      setNote("");
      await ctx.refresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 border border-border p-2">
      <textarea
        rows={3}
        autoFocus
        className={field}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What should change? e.g. give Fenwick a full head of slicked-back hair; move him to his hut with the carved totems; make the sky flatter"
        aria-label="Redraft note"
      />
      <select className={`${field} text-xs`} value={mode} onChange={(e) => setMode(e.target.value as NoteMode)} aria-label="How to apply the note">
        <option value="auto">Auto: update the brief or character, then redraft (recommended)</option>
        {canKeep && <option value="keep">Keep this image, change only what the note says</option>}
        <option value="fresh">Fresh take with the note</option>
      </select>
      <div className="flex flex-wrap items-center gap-2">
        {mode === "auto" ? (
          <Button size="sm" variant="fill" disabled={busy || !trimmed} onClick={applyAuto}>
            {busy ? "Applying…" : `Apply note & redraft${est ? ` · ~${USD(est.estimateMicros + 10_000)}` : ""}`}
          </Button>
        ) : (
          <SpendButton ctx={ctx} label="Redraft" body={plain} />
        )}
        <button className="text-xs text-muted-foreground" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function Upload({ onFile, label }: { onFile: (dataUrl: string) => Promise<void>; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={`cursor-pointer border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/60 ${busy ? "opacity-50" : ""}`}>
      {busy ? "Uploading…" : label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        disabled={busy}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            await onFile(await fileToDataUrl(f));
          } catch (err) {
            alert((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="type-label">{title}</h3>
        {hint && <p className="type-caption max-w-3xl">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// ── Style ────────────────────────────────────────────────────────────────

function StyleStep({ ctx }: { ctx: Ctx }) {
  const { data } = ctx;
  const { deck } = data;
  const bible = effectiveBible(deck.presetId, deck.styleBible);
  const custom = !isPresetUnmodified(deck.presetId, deck.styleBible);
  const [draft, setDraft] = useState(bible);
  const dirty = JSON.stringify(draft) !== JSON.stringify(bible);
  const frame = frameOf(data);
  const anchor = anchorUrl(data);
  const probes = data.images.filter((i) => i.kind === "probe");
  const styleRefs = data.images.filter((i) => i.kind === "style-ref");
  const briefed = data.cards.filter((c) => c.subject.trim());
  const [probeCard, setProbeCard] = useState<number>(briefed[0]?.cardId ?? 0);
  const suggestions = deck.styleSuggestions;
  // Suggested presets first, in the agent's order.
  const presetOrder = suggestions
    ? [
        ...suggestions.options.map((o) => PRESET_BY_ID[o.presetId]).filter(Boolean),
        ...STYLE_PRESETS.filter((p) => !suggestions.options.some((o) => o.presetId === p.id)),
      ]
    : STYLE_PRESETS;
  async function pickPreset(presetId: string) {
    const wasPending = !!suggestions;
    if (presetId === deck.presetId && !wasPending) return;
    await patchDeck(ctx, { presetId, frameId: null });
    setDraft(PRESET_BY_ID[presetId].bible);
    if (wasPending) ctx.notifyAgent?.(`I picked ${PRESET_BY_ID[presetId].name} in the Style tab.`);
  }

  return (
    <div className="space-y-10">
      <Section
        title="Style preset"
        hint="Tested looks. Each one is written as a physical object and process, which is what keeps the output from looking generic."
      >
        {suggestions && (
          <p className="border border-ring/60 px-3 py-2 text-sm text-foreground">
            The agent suggests the highlighted styles for this deck. Pick any preset to continue; the agent picks up from there.
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {presetOrder.map((p) => {
            const active = p.id === deck.presetId;
            const suggestion = suggestions?.options.find((o) => o.presetId === p.id);
            return (
              <button
                key={p.id}
                onClick={() => pickPreset(p.id)}
                className={`space-y-2 text-left outline-offset-4 ${active && !suggestions ? "outline outline-2 outline-ring" : suggestion ? "" : suggestions ? "opacity-50 hover:opacity-100" : "opacity-80 hover:opacity-100"}`}
              >
                <CardFrame frameId={p.frameId} artUrl={p.anchorUrl} numeral="XVIII" title="The Moon" />
                <span className="block text-sm text-foreground">
                  {p.name}
                  {suggestions?.recommended === p.id && <span className="ml-1 text-xs text-accent-text">· recommended</span>}
                </span>
                <span className="block type-caption">{suggestion ? suggestion.why : p.blurb}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Frame" hint="One default per style, but any frame works with any style. Frames are overlays, so switching never costs anything.">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-7">
          {FRAMES.map((f) => (
            <button
              key={f.id}
              onClick={() => patchDeck(ctx, { frameId: f.id === PRESET_BY_ID[deck.presetId]?.frameId ? null : f.id })}
              className={`space-y-1 text-left outline-offset-4 ${f.id === frame ? "outline outline-2 outline-ring" : "opacity-75 hover:opacity-100"}`}
            >
              <CardFrame frameId={f.id} artUrl={anchor} numeral="0" title={data.cards[0]?.name ?? "The Fool"} />
              <span className="block text-xs text-foreground">{f.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <BackSection ctx={ctx} />

      <Section
        title={custom ? "Style Bible (customized)" : "Style Bible"}
        hint="What every image prompt starts from. Editing it makes the style custom, which needs a new anchor from a probe round."
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {(["artefact", "process", "palette", "exclude"] as const).map((k) => (
            <label key={k} className="space-y-1">
              <span className="type-ghost">{k}</span>
              <textarea rows={k === "process" ? 7 : 3} className={field} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="fill" disabled={!dirty} onClick={() => patchDeck(ctx, { styleBible: draft })}>
            Save Style Bible
          </Button>
          {custom && (
            <Button
              size="sm"
              onClick={() => {
                const p = PRESET_BY_ID[deck.presetId];
                setDraft(p.bible);
                void patchDeck(ctx, { styleBible: p.bible });
              }}
            >
              Reset to preset
            </Button>
          )}
        </div>
      </Section>

      <Section
        title="Style anchor"
        hint="The single image every later call uses as Image 1 to keep the deck consistent. An unmodified preset ships with one; a custom style needs a probe."
      >
        <div className="flex flex-wrap items-start gap-6">
          <div className="w-40">
            {anchor ? (
              <CardFrame frameId={frame} artUrl={anchor} numeral="★" title="Anchor" />
            ) : (
              <CardFrame frameId={frame} numeral="★" title="Anchor" status="No anchor yet: run a probe" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1">
                <span className="type-ghost">Probe card</span>
                <select className={field} value={probeCard} onChange={(e) => setProbeCard(Number(e.target.value))}>
                  {briefed.length === 0 && <option value={0}>Write briefs first</option>}
                  {briefed.map((c) => (
                    <option key={c.cardId} value={c.cardId}>
                      {romanNumeral(c.cardId)} · {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <SpendButton ctx={ctx} label="Probe 4 variants" body={briefed.length ? { action: "probe", cardIds: [probeCard], count: 4 } : null} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {styleRefs.map((r) => (
                <span key={r.id} className="relative">
                  <img src={r.url ?? ""} alt="Style reference" className="h-20 w-20 border border-border object-cover" />
                  <button
                    className="absolute right-0 top-0 bg-background/80 px-1 text-xs"
                    onClick={() => api(`/decks/${deck.id}/images/${r.id}`, { method: "DELETE" }).then(ctx.refresh)}
                    aria-label="Remove style reference"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <Upload
                label="+ Style reference image"
                onFile={async (dataUrl) => {
                  await api(`/decks/${deck.id}/uploads`, { method: "POST", body: JSON.stringify({ dataUrl, purpose: "style-ref" }) });
                  await ctx.refresh();
                }}
              />
            </div>
            {probes.length > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {probes.slice(0, 12).map((p) => {
                  const card = data.cards.find((c) => c.cardId === p.cardId);
                  return (
                    <div key={p.id} className={`space-y-1 ${deck.anchorImageId === p.id ? "outline outline-2 outline-offset-4 outline-ring" : ""}`}>
                      <CardFrame frameId={frame} artUrl={p.status === "done" ? p.url : null} status={statusLabel(p)} numeral={romanNumeral(p.cardId ?? 0)} title={card?.name ?? ""} />
                      {p.status === "done" && (
                        <button className="text-xs underline underline-offset-2" onClick={() => patchDeck(ctx, { anchorImageId: p.id })}>
                          {deck.anchorImageId === p.id ? "Current anchor" : "Use as anchor"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

function BackSection({ ctx }: { ctx: Ctx }) {
  const { data } = ctx;
  const { deck } = data;
  const backs = data.images.filter((i) => i.kind === "back");
  const sketches = data.images.filter((i) => i.kind === "back-sketch");
  const [pickedSketchId, setPickedSketchId] = useState<string | null>(null);
  const [design, setDesign] = useState("");
  const sketch = sketches.find((i) => i.id === pickedSketchId) ?? sketches[0];
  const frame = frameOf(data);
  const backArt = deck.backImageId ? data.images.find((i) => i.id === deck.backImageId)?.url : null;
  return (
    <Section title="Card back" hint="The deck uses one back: a free ornamental pattern in the frame's colours, or back art generated in the deck's style. Generate as many backs as you like and pick one.">
      <div className="flex flex-wrap items-start gap-6">
        <div className="w-40">
          <CardBack frameId={frame} artUrl={backArt} />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <p className="type-caption max-w-md">
            The standard back is a free ornamental pattern in the frame's colours. You can also generate back art in the deck's style instead.
          </p>
          {sketch && (
            <div className="space-y-2">
              <p className="text-xs text-foreground">Layout sketch</p>
              <p className="type-caption max-w-xs">The next back follows the selected sketch's layout and symmetry, redrawn in the deck's style.</p>
              <div className="flex flex-wrap items-end gap-3">
                {sketches.map((sk) => (
                  <span key={sk.id} className="space-y-1">
                    <button
                      onClick={() => setPickedSketchId(sk.id)}
                      className={`block border-2 ${sk.id === sketch.id ? "border-ring" : "border-transparent"}`}
                      aria-pressed={sk.id === sketch.id}
                      aria-label="Use this layout sketch"
                    >
                      <img src={sk.url ?? ""} alt="Layout sketch" className="h-24 object-cover" />
                    </button>
                    <button
                      className="text-xs text-muted-foreground underline underline-offset-2"
                      onClick={() => api(`/decks/${deck.id}/images/${sk.id}`, { method: "DELETE" }).then(ctx.refresh)}
                    >
                      Remove
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <textarea
            rows={2}
            className={field}
            defaultValue={design}
            onBlur={(e) => setDesign(e.target.value)}
            placeholder="What this back shows (optional), e.g. the crown and the bloody sword crossed on a dark field. Leave empty to follow the sketch alone."
            aria-label="Back design"
          />
          <div className="flex flex-wrap items-center gap-2">
            <SpendButton
              ctx={ctx}
              label={backs.length ? "New back art" : sketch ? "Generate back art from sketch" : "Generate back art"}
              body={{ action: "back", ...(sketch ? { sketchId: sketch.id } : {}), ...(design.trim() ? { backDesign: design.trim() } : {}) }}
            />
            <Upload
              label="+ Layout sketch"
              onFile={async (dataUrl) => {
                await api(`/decks/${deck.id}/uploads`, { method: "POST", body: JSON.stringify({ dataUrl, purpose: "back-sketch" }) });
                await ctx.refresh();
              }}
            />
            <Upload
              label="+ Upload finished back"
              onFile={async (dataUrl) => {
                const { id } = await api<{ id: string }>(`/decks/${deck.id}/uploads`, { method: "POST", body: JSON.stringify({ dataUrl, purpose: "back" }) });
                await patchDeck(ctx, { backImageId: id });
              }}
            />
          </div>
          {backs.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => patchDeck(ctx, { backImageId: null })}
                className={`w-24 space-y-1 text-left text-xs ${!deck.backImageId ? "text-foreground" : "text-muted-foreground"}`}
              >
                <CardBack frameId={frame} />
                {!deck.backImageId ? "Pattern ✓" : "Use pattern"}
              </button>
              {backs.map((b) => (
                <button
                  key={b.id}
                  disabled={b.status !== "done"}
                  onClick={() => patchDeck(ctx, { backImageId: b.id })}
                  className={`w-24 space-y-1 text-left text-xs ${deck.backImageId === b.id ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {b.status === "done" ? (
                    <CardBack frameId={frame} artUrl={b.url} />
                  ) : (
                    <CardFrame frameId={frame} status={statusLabel(b)} numeral="" title="" />
                  )}
                  {deck.backImageId === b.id ? "Using ✓" : b.status === "done" ? "Use this" : ""}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

// ── Characters (edited on the cards they appear on) ─────────────────────

function References({ ctx, m, size = "h-14 w-14" }: { ctx: Ctx; m: DeckCastMember; size?: string }) {
  const { data } = ctx;
  const refs = m.refImageIds.map((id) => data.images.find((i) => i.id === id)).filter((i): i is DeckImage => !!i);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {refs.map((r) => (
        <span key={r.id} className="relative">
          <img src={r.url ?? ""} alt={`${m.name} reference`} className={`${size} border border-border object-cover`} />
          <button
            className="absolute right-0 top-0 bg-background/80 px-1 text-xs"
            onClick={() => api(`/decks/${data.deck.id}/images/${r.id}`, { method: "DELETE" }).then(ctx.refresh)}
            aria-label="Remove reference"
          >
            ✕
          </button>
        </span>
      ))}
      <Upload
        label="+ Reference"
        onFile={async (dataUrl) => {
          await api(`/decks/${data.deck.id}/uploads`, { method: "POST", body: JSON.stringify({ dataUrl, purpose: "cast-ref", castId: m.id }) });
          await ctx.refresh();
        }}
      />
    </div>
  );
}

/** Compact character entry inside a card. Characters stay consistent through this description, sent with every card they're on. */
function CharacterInline({ ctx, m }: { ctx: Ctx; m: DeckCastMember }) {
  return (
    <div className="space-y-2 border-l-2 border-border pl-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${field} max-w-[14rem] font-serif`} defaultValue={m.name} aria-label="Name" onBlur={(e) => e.target.value !== m.name && patchCast(ctx, m.id, { name: e.target.value })} />
      </div>
      <textarea
        rows={2}
        className={field}
        defaultValue={m.description}
        placeholder="Visual description: build, face, hair, costume, companions, signature items"
        aria-label={`${m.name} description`}
        onBlur={(e) => e.target.value !== m.description && patchCast(ctx, m.id, { description: e.target.value })}
      />
      <References ctx={ctx} m={m} />
      {m.refImageIds.length > 0 && <DescribeFromRefs ctx={ctx} m={m} />}
    </div>
  );
}

/** References never go into card calls (their rendering would leak in); instead they're described into the text. */
function DescribeFromRefs({ ctx, m }: { ctx: Ctx; m: DeckCastMember }) {
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <button
        disabled={busy}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
        onClick={async () => {
          if (!ctx.apiKey) return alert("Add your OpenAI API key first.");
          setBusy(true);
          try {
            const r = await api<{ added: string }>(`/decks/${ctx.data.deck.id}/cast/${m.id}/describe-from-refs`, { method: "POST", key: ctx.apiKey });
            setAdded(r.added);
            await ctx.refresh();
          } catch (e) {
            alert((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Reading references…" : "Describe from references · ~$0.01"}
      </button>
      {added && <p className="text-xs text-foreground">{added}</p>}
    </div>
  );
}

function AddCharacter({ ctx, card }: { ctx: Ctx; card: DeckCard }) {
  const [name, setName] = useState("");
  const others = ctx.data.cast.filter((m) => !card.castIds.includes(m.id));
  const link = (id: string) => patchCard(ctx, card.cardId, { castIds: [...card.castIds, id] });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {others.length > 0 && (
        <select className={`${field} w-auto`} value="" aria-label="Add an existing character" onChange={(e) => e.target.value && link(e.target.value)}>
          <option value="">+ Existing character…</option>
          {others.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      )}
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const { id } = await api<{ id: string }>(`/decks/${ctx.data.deck.id}/cast`, { method: "POST", body: JSON.stringify({ name: name.trim() }) });
          setName("");
          await link(id);
        }}
      >
        <input className={`${field} w-48`} placeholder="+ New character" value={name} onChange={(e) => setName(e.target.value)} aria-label="New character name" />
        {name.trim() && (
          <Button size="sm" type="submit">
            Add
          </Button>
        )}
      </form>
    </div>
  );
}

// ── Cards (briefs + their characters) ───────────────────────────────────

function BriefRow({ ctx, card }: { ctx: Ctx; card: DeckCard }) {
  const save = (k: string) => (e: { target: { value: string } }) => e.target.value !== (card as Record<string, unknown>)[k] && patchCard(ctx, card.cardId, { [k]: e.target.value });
  const ro = card.locked;
  const members = card.castIds.map((id) => ctx.data.cast.find((m) => m.id === id)).filter((m): m is DeckCastMember => !!m);
  return (
    <div id={`card-${card.cardId}`} className={`grid gap-3 border border-border p-4 lg:grid-cols-[3rem_1fr_1fr] ${ro ? "opacity-80" : ""}`}>
      <div className="font-serif text-2xl text-primary">{romanNumeral(card.cardId)}</div>
      <div className="space-y-2">
        <input className={`${field} font-serif text-lg`} defaultValue={card.name} readOnly={ro} onBlur={save("name")} aria-label="Card title" />
        <input className={field} defaultValue={card.meaning} readOnly={ro} onBlur={save("meaning")} placeholder="Meaning in this deck" aria-label="Meaning" />
        <textarea rows={4} className={field} defaultValue={card.subject} readOnly={ro} onBlur={save("subject")} placeholder="What is visibly in the picture" aria-label="Subject" />
        <textarea rows={3} className={field} defaultValue={card.composition} readOnly={ro} onBlur={save("composition")} placeholder="Composition: placement, where detail goes, empty space" aria-label="Composition" />
        <textarea rows={2} className={field} defaultValue={card.fidelityNotes} readOnly={ro} onBlur={save("fidelityNotes")} placeholder="Fidelity notes: what this medium can't show" aria-label="Fidelity notes" />
        <textarea
          rows={3}
          className={`${field} italic`}
          defaultValue={card.backText}
          readOnly={ro}
          onBlur={save("backText")}
          placeholder="Why this card (shown in the deck preview): what the arcana means, a blank line, then how that plays out in this character or moment"
          aria-label="Why this card"
        />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input type="checkbox" checked={card.locked} onChange={(e) => patchCard(ctx, card.cardId, { locked: e.target.checked })} />
          Lock (the agent won't rewrite it)
        </label>
      </div>
      <div className="space-y-3">
        <p className="type-ghost">On this card</p>
        {members.map((m) => (
          <div key={m.id} className="space-y-1">
            <CharacterInline ctx={ctx} m={m} />
            {!ro && (
              <button
                className="pl-3 text-xs text-muted-foreground underline underline-offset-2"
                onClick={() => patchCard(ctx, card.cardId, { castIds: card.castIds.filter((x) => x !== m.id) })}
              >
                Remove from this card
              </button>
            )}
          </div>
        ))}
        {members.length === 0 && <p className="type-caption">No characters linked.</p>}
        {!ro && <AddCharacter ctx={ctx} card={card} />}
      </div>
    </div>
  );
}

function CardsStep({ ctx }: { ctx: Ctx }) {
  return (
    <Section title="Cards" hint="Meaning first; classic symbols only where they fit naturally. Characters are edited on the cards they appear on; their descriptions keep them consistent across the deck. Edits save when you leave a field.">
      <div className="space-y-3">
        {ctx.data.cards.map((c) => (
          <BriefRow key={`${c.cardId}-${c.updatedAt}`} ctx={ctx} card={c} />
        ))}
      </div>
    </Section>
  );
}

// ── Drafts ───────────────────────────────────────────────────────────────

function useCardImages(data: DeckData, kind: "draft" | "final") {
  return useMemo(() => {
    const m = new Map<number, DeckImage[]>();
    for (const i of data.images) if (i.kind === kind && i.cardId != null) m.set(i.cardId, [...(m.get(i.cardId) ?? []), i]);
    return m;
  }, [data.images, kind]);
}

function DraftTile({ ctx, card, drafts, quality }: { ctx: Ctx; card: DeckCard; drafts: DeckImage[]; quality: DraftQuality }) {
  const [idx, setIdx] = useState(0);
  const img = drafts[Math.min(idx, drafts.length - 1)];
  const approved = !!img && card.approvedDraftId === img.id;
  const approvedIdx = drafts.findIndex((d) => d.id === card.approvedDraftId);
  return (
    <div className="space-y-2">
      <FlipCard
        front={
          <div className={approved ? "outline outline-2 outline-offset-4 outline-ring" : ""}>
            <CardFrame
              frameId={frameOf(ctx.data)}
              artUrl={img?.status === "done" ? img.url : null}
              status={img ? statusLabel(img) : card.subject ? "Not drafted" : "No brief"}
              numeral={romanNumeral(card.cardId)}
              title={card.name}
            />
          </div>
        }
        back={backOf(ctx.data)}
      />
      {drafts.length > 1 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <button onClick={() => setIdx(Math.min(idx + 1, drafts.length - 1))} disabled={idx >= drafts.length - 1} aria-label="Older draft">
            ‹
          </button>
          <span>
            {drafts.length - idx}/{drafts.length}
          </span>
          <button onClick={() => setIdx(Math.max(idx - 1, 0))} disabled={idx === 0} aria-label="Newer draft">
            ›
          </button>
        </div>
      )}
      {noteOf(img) && <p className="text-xs italic text-muted-foreground">Note: {noteOf(img)}</p>}
      {card.approvedDraftId && !approved && approvedIdx >= 0 && (
        <p className="text-xs text-rarity-arcane">
          Approved: {approvedIdx > idx ? "an older" : "a newer"} draft ({drafts.length - approvedIdx}/{drafts.length}). Finals use that one.{" "}
          <button className="underline underline-offset-2" onClick={() => setIdx(approvedIdx)}>
            Show it
          </button>
        </p>
      )}
      {img?.status === "error" && /safety|content-policy/i.test(img.error ?? "") && <PolicyRewrite ctx={ctx} card={card} quality={quality} />}
      <div className="flex flex-wrap gap-2">
        {img?.status === "done" && (
          <Button size="sm" variant={approved ? "fill" : "outline"} onClick={() => patchCard(ctx, card.cardId, { approvedDraftId: approved ? null : img.id })}>
            {approved ? "Approved ✓" : "Approve"}
          </Button>
        )}
        <SpendButton ctx={ctx} label={drafts.length ? "Redraft" : "Draft"} body={card.subject ? { action: "drafts", cardIds: [card.cardId], quality } : null} />
      </div>
      {card.subject && (
        <RedraftWithNote
          key={img?.id ?? "none"}
          ctx={ctx}
          base={img}
          target={{ cardId: card.cardId, quality }}
          body={(note, baseImageId) => ({ action: "drafts", cardIds: [card.cardId], note, baseImageId, quality })}
        />
      )}
    </div>
  );
}

/** After a safety refusal: rewrite the brief around the flagged categories (keeping its meaning), then redraft. */
function PolicyRewrite({ ctx, card, quality }: { ctx: Ctx; card: DeckCard; quality: DraftQuality }) {
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState<string | null>(null);
  const { est } = useEstimate(ctx.data.deck.id, { action: "drafts", cardIds: [card.cardId], quality }, ctx.data.images.length);
  if (card.locked) return <p className="type-caption">Unlock this card to let its brief be rewritten.</p>;
  return (
    <div className="space-y-1">
      {changed && <p className="text-xs text-foreground">Brief rewritten: {changed}</p>}
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          if (!ctx.apiKey) return alert("Add your OpenAI API key first.");
          setBusy(true);
          try {
            const r = await api<{ whatChanged: string }>(`/decks/${ctx.data.deck.id}/cards/${card.cardId}/rewrite-for-policy`, { method: "POST", key: ctx.apiKey });
            setChanged(r.whatChanged);
            await generate(ctx.data.deck.id, ctx.apiKey, { action: "drafts", cardIds: [card.cardId], quality });
            await ctx.refresh();
          } catch (e) {
            alert((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Rewriting…" : `Rewrite & redraft · ~${USD(10_000 + (est?.estimateMicros ?? 0))}`}
      </Button>
    </div>
  );
}

function DraftsStep({ ctx }: { ctx: Ctx }) {
  const [quality, setQuality] = useState<DraftQuality>("medium");
  const drafts = useCardImages(ctx.data, "draft");
  const pending = ctx.data.cards.filter((c) => c.subject.trim() && !c.approvedDraftId && !(drafts.get(c.cardId)?.length));
  return (
    <Section
      title="Drafts"
      hint="Cheap drafts to judge composition. Approve the ones you like: approved drafts become the composition reference for finals."
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="type-ghost">Draft quality</span>
          <select className={field} value={quality} onChange={(e) => setQuality(e.target.value as DraftQuality)}>
            <option value="medium">Medium: cleaner anatomy (~$0.035)</option>
            <option value="low">Low: cheapest (~$0.02)</option>
          </select>
        </label>
        <SpendButton ctx={ctx} label="Draft all undrafted cards" body={pending.length ? { action: "drafts", cardIds: pending.map((c) => c.cardId), quality } : null} />
      </div>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {ctx.data.cards.map((card) => (
          <DraftTile key={card.cardId} ctx={ctx} card={card} drafts={drafts.get(card.cardId) ?? []} quality={quality} />
        ))}
      </div>
    </Section>
  );
}

// ── Finals ───────────────────────────────────────────────────────────────

function FinalsStep({ ctx }: { ctx: Ctx }) {
  const [quality, setQuality] = useState<"medium" | "high">("high");
  const finals = useCardImages(ctx.data, "final");
  const drafts = useCardImages(ctx.data, "draft");
  const approved = ctx.data.cards.filter((c) => c.approvedDraftId);
  /** A final is current only if it was rendered from the draft that is approved now. */
  const isCurrent = (f: DeckImage, card: DeckCard) => f.refIds.includes(card.approvedDraftId!);
  const withoutFinal = approved.filter((c) => !(finals.get(c.cardId)?.some((f) => f.status !== "error" && isCurrent(f, c))));
  // Redrafting doesn't move an approval, so finals would quietly use the older composition.
  const stale = approved.filter((c) => {
    const newest = drafts.get(c.cardId)?.find((d) => d.status === "done");
    return newest && newest.id !== c.approvedDraftId;
  });
  const [approving, setApproving] = useState(false);
  const approveLatest = async () => {
    setApproving(true);
    try {
      for (const c of stale) {
        const newest = drafts.get(c.cardId)!.find((d) => d.status === "done")!;
        await api(`/decks/${ctx.data.deck.id}/cards/${c.cardId}`, { method: "PATCH", body: JSON.stringify({ approvedDraftId: newest.id }) });
      }
      await ctx.refresh();
    } finally {
      setApproving(false);
    }
  };
  const calibrated = [...finals.values()].some((l) => l.some((f) => f.status === "done"));
  const draftsById = new Map(ctx.data.images.map((i) => [i.id, i]));
  return (
    <Section
      title="Finals"
      hint="Rendered with the detail model from your approved draft, so the composition you approved is the one you get. Render one card first to check cost and fidelity before the batch."
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="type-ghost">Quality</span>
          <select className={field} value={quality} onChange={(e) => setQuality(e.target.value as "medium" | "high")}>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        {!calibrated ? (
          <SpendButton ctx={ctx} label="Render one to calibrate" body={withoutFinal[0] ? { action: "finals", cardIds: [withoutFinal[0].cardId], quality } : null} />
        ) : (
          <SpendButton ctx={ctx} label="Render remaining approved" body={withoutFinal.length ? { action: "finals", cardIds: withoutFinal.map((c) => c.cardId), quality } : null} />
        )}
        <span className="type-caption">{approved.length}/22 drafts approved</span>
      </div>
      {stale.length > 0 && (
        <div className="space-y-2 border border-border p-3">
          <p className="text-sm text-foreground">
            {stale.length} {stale.length === 1 ? "card has" : "cards have"} a newer draft than the approved one ({stale.map((c) => c.name).join(", ")}). Finals render from
            the approved draft.
          </p>
          <Button size="sm" variant="outline" disabled={approving} onClick={approveLatest}>
            Approve the latest drafts
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {approved.map((card) => {
          const list = finals.get(card.cardId) ?? [];
          const accepted = list.find((f) => f.id === card.finalImageId);
          const shown = accepted ?? list[0];
          const draft = draftsById.get(card.approvedDraftId!);
          return (
            <div key={card.cardId} className="space-y-2">
              <FlipCard
                front={
                  <CardFrame
                    frameId={frameOf(ctx.data)}
                    artUrl={shown?.status === "done" ? shown.url : null}
                    status={shown ? statusLabel(shown) : "Not rendered"}
                    numeral={romanNumeral(card.cardId)}
                    title={card.name}
                  />
                }
                back={backOf(ctx.data)}
              />
              {shown?.status === "done" && !isCurrent(shown, card) && (
                <p className="text-xs text-rarity-arcane">Rendered from an older draft than the approved one.</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {draft?.url && (
                  <a className="text-muted-foreground underline underline-offset-2" href={draft.url} target="_blank" rel="noreferrer">
                    draft
                  </a>
                )}
                {shown?.status === "done" && (
                  <>
                    <button className="underline underline-offset-2" onClick={() => patchCard(ctx, card.cardId, { finalImageId: card.finalImageId === shown.id ? null : shown.id })}>
                      {card.finalImageId === shown.id ? "Accepted ✓" : "Accept"}
                    </button>
                    <a className="underline underline-offset-2" href={shown.url ?? ""} download={`${String(card.cardId).padStart(2, "0")}-${card.name}.jpg`}>
                      art
                    </a>
                  </>
                )}
              </div>
              {shown?.status === "done" && <SpendButton ctx={ctx} label="Re-render" body={{ action: "finals", cardIds: [card.cardId], quality }} />}
            </div>
          );
        })}
        {approved.length === 0 && <p className="type-body col-span-full">Approve some drafts first.</p>}
      </div>
    </Section>
  );
}

export function Wizard({ ctx, step: rawStep, onStep }: { ctx: Ctx; step: StepId; onStep: (s: StepId) => void }) {
  const { data } = ctx;
  // Decks created before the Cast step was folded into Cards may still point at it.
  const step: StepId = STEPS.some((s) => s.id === rawStep) ? rawStep : "cards";
  const done: Record<StepId, boolean> = {
    style: !!anchorUrl(data),
    cards: data.cards.every((c) => c.subject.trim()),
    drafts: data.cards.every((c) => c.approvedDraftId),
    finals: data.cards.every((c) => c.finalImageId),
  };
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Wizard steps">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onStep(s.id)}
            aria-current={s.id === step ? "step" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-xs uppercase tracking-widest ${s.id === step ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {i + 1}. {s.label} {done[s.id] && "✓"}
          </button>
        ))}
      </nav>
      {step === "style" && <StyleStep key={`${data.deck.presetId}-${JSON.stringify(data.deck.styleBible)}`} ctx={ctx} />}
      {step === "cards" && <CardsStep ctx={ctx} />}
      {step === "drafts" && <DraftsStep ctx={ctx} />}
      {step === "finals" && <FinalsStep ctx={ctx} />}
    </div>
  );
}
