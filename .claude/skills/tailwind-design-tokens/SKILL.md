---
name: tailwind-design-tokens
description: >
  Expert guide for designing, implementing, and migrating design token systems in Tailwind CSS v4 projects.
  Covers the two-tier primitive→semantic architecture, OKLCH color format, the critical @theme vs @theme inline
  distinction (including the dark-mode cascade behavior and the calc() gotcha), shadcn/ui naming conventions,
  @custom-variant dark mode wiring, and CLAUDE.md documentation for AI-agent friendliness.

  Use this skill whenever the user is:
  - Setting up a design system or tokens in a Tailwind v4 project (new or existing)
  - Migrating from custom token naming to shadcn-style vocabulary
  - Adding dark mode to a Tailwind v4 app
  - Asking about @theme vs @theme inline behavior
  - Asking about OKLCH colors or color format choices in Tailwind v4
  - Renaming or reorganizing CSS custom properties used as design tokens
  - Asking which of Style Dictionary / Tokens Studio / JSON pipelines they actually need
  - Working on any Tailwind v4 theming or customization task
---

# Tailwind v4 Design Tokens

## The core architecture (two tiers, one CSS file per layer)

The right mental model for a small-to-medium team:

```
Layer 1 — Primitives   raw OKLCH values, no semantic meaning
                        --black-950, --bone-100, --purple-500, --rarity-3

Layer 2 — Semantics    purpose-named, reference primitives, swap per-theme
                        --background, --foreground, --card, --muted-foreground, --accent
```

**File structure:**
```
app/styles/tokens.css   primitives + semantic :root block + .dark {} override stub
app/app.css             @import tokens.css + @custom-variant dark + @theme (fonts) + @theme inline (utility mappings)
```

A single annotated `tokens.css` (~100 lines) is the agent-optimal shape — one file an LLM reads to understand every token name, value, and how they compose.

---

## tokens.css — the complete template

```css
/* ════════════════════════════════════════════
   DESIGN TOKENS — two layers
   ════════════════════════════════════════════ */

:root {
  /* ── Primitives ── */
  /* Use OKLCH. Format: oklch(Lightness Chroma Hue)
     Lightness 0–1, Chroma 0–0.4 (0 = grey), Hue 0–360 */
  --black-950: oklch(0.055 0.006 270);   /* deepest bg */
  --black-900: oklch(0.090 0.009 270);   /* surface bg */
  --black-800: oklch(0.150 0.020 270);   /* elevated bg */
  --bone-100:  oklch(0.918 0.010 78);    /* primary text */
  --bone-400:  oklch(0.715 0.009 78);    /* secondary text */
  --stone-800: oklch(0.228 0.011 265);   /* borders */
  --brand-500: oklch(0.62  0.19  250);   /* brand accent */

  /* ── Semantics ── */
  --background:         var(--black-950);
  --foreground:         var(--bone-100);
  --card:               var(--black-900);
  --card-foreground:    var(--bone-100);
  --muted:              var(--black-800);
  --muted-foreground:   var(--bone-400);
  --border:             var(--stone-800);
  --ring:               var(--brand-500);
  --primary:            var(--brand-500);
  --primary-foreground: var(--bone-100);
  --accent:             var(--brand-500);
  --accent-foreground:  var(--bone-100);
}

/* ── Dark mode override (swap semantics, never primitives) ── */
.dark {
  /* When the current theme IS dark and you add a light :root, override here */
}
```

**Primitive naming conventions:**
- Color ramps: `--{name}-{50|100|...|950}` (Tailwind-style numeric)
- Semantic layer: shadcn vocabulary (see below) — no prefix, no `--color-` in the semantic names

---

## app.css — wiring Tailwind to the tokens

```css
@import "tailwindcss";
@import "./styles/tokens.css";

/* 1. Dark mode: .dark class on <html> enables dark: utilities */
@custom-variant dark (&:is(.dark *));

/* 2. Fonts — plain @theme so font-* utilities reference var() at runtime */
@theme {
  --font-sans: "Inter", system-ui, sans-serif;
  --font-serif: "Georgia", serif;
}

/* 3. Map semantic vars → Tailwind utilities via @theme inline */
@theme inline {
  --color-background:         var(--background);
  --color-foreground:         var(--foreground);
  --color-card:               var(--card);
  --color-card-foreground:    var(--card-foreground);
  --color-muted:              var(--muted);
  --color-muted-foreground:   var(--muted-foreground);
  --color-border:             var(--border);
  --color-ring:               var(--ring);
  --color-primary:            var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-accent:             var(--accent);
  --color-accent-foreground:  var(--accent-foreground);
}
```

---

## @theme vs @theme inline — the critical distinction

This is the most common footgun in Tailwind v4.

| | `@theme` | `@theme inline` |
|---|---|---|
| Utility generated | `bg-primary { background-color: var(--color-primary) }` | `bg-primary { background-color: oklch(...) }` (literal value) |
| Runtime override | ✅ A wrapper class can override `--color-primary` | ❌ Value baked in at build time |
| Dark mode via `.dark` | ✅ Works, `.dark` overrides cascade through | ❌ `.dark` override is ignored |
| Use case | Primitive color ramps you want to expose as utilities | Semantic vars defined in `:root`/`.dark` that you're aliasing INTO Tailwind |

**The shadcn pattern** uses `@theme inline` for semantic tokens because the source-of-truth vars live in `:root`/`.dark`. The "inline" means: skip the `--color-*` indirection and reference `var(--background)` directly in the utility — dark mode still works because the utility resolves `var(--background)` at render time, not at build time.

### The calc() gotcha

```css
/* In @theme inline — THIS WILL NOT UPDATE AT RUNTIME */
@theme inline {
  --radius-sm: calc(var(--radius) * 0.6);   /* ❌ calc inlined at build time */
}

/* Fix: declare in plain @theme instead */
@theme {
  --radius-sm: calc(var(--radius) * 0.6);   /* ✅ recalculated at runtime */
}
```

If you need derived radius/spacing tokens that respond to a runtime `--radius` override, use plain `@theme`, not `@theme inline`.

---

## shadcn/ui token vocabulary

These are the names to use. They're widely known by AI coding agents, so you get better autocomplete for free.

| Token | Tailwind utility | Purpose |
|---|---|---|
| `--background` | `bg-background` | Page background |
| `--foreground` | `text-foreground` | Default body text |
| `--card` | `bg-card` | Card/panel surface |
| `--card-foreground` | `text-card-foreground` | Text on card surfaces |
| `--muted` | `bg-muted` | Subtle/elevated background |
| `--muted-foreground` | `text-muted-foreground` | Secondary/dimmer text |
| `--border` | `border-border` | Dividers, outlines |
| `--ring` | `ring-ring` | Focus rings |
| `--primary` | `bg-primary` / `text-primary` | Brand primary / high-emphasis |
| `--primary-foreground` | `text-primary-foreground` | Text on primary backgrounds |
| `--accent` | `bg-accent` | Accent / interactive |
| `--accent-foreground` | `text-accent-foreground` | Text on accent backgrounds |

**Pairing rule**: every `bg-*` surface has a matching `*-foreground` token. Always apply them together: `bg-card text-card-foreground`.

### Adding domain-specific tokens

Follow the same two-tier pattern for custom semantic categories:

```css
:root {
  /* primitives */
  --red-500:   oklch(0.638 0.221 28);
  --green-500: oklch(0.723 0.183 151);

  /* semantics */
  --destructive:            var(--red-500);
  --destructive-foreground: var(--bone-100);
  --success:                var(--green-500);
  --success-foreground:     var(--bone-100);
}

/* in @theme inline */
@theme inline {
  --color-destructive:            var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success:                var(--success);
  --color-success-foreground:     var(--success-foreground);
}
```

---

## Dark mode setup

```css
/* tokens.css */
:root {
  --background: oklch(1 0 0);        /* light defaults */
  --foreground: oklch(0.145 0 0);
  /* ... all semantic tokens ... */
}

.dark {
  --background: oklch(0.145 0 0);    /* override for dark */
  --foreground: oklch(0.985 0 0);
  /* ... override only what changes ... */
}

/* app.css */
@custom-variant dark (&:is(.dark *));   /* enables dark: utilities */
```

Toggle from JS: `document.documentElement.classList.toggle('dark')`.

For three-state (light / dark / system), the published pattern:
```css
@custom-variant dark {
  &:where(.dark, .dark *) { @slot; }
  @media (prefers-color-scheme: dark) {
    &:where(:not(.light *)) { @slot; }
  }
}
```

**Why class strategy over `prefers-color-scheme` only**: users expect a manual toggle, and the class lets you scope themes per-subtree (e.g., an always-dark sidebar in a light app). You can still default to system preference by reading `window.matchMedia('(prefers-color-scheme: dark)')` on first load.

---

## OKLCH — quick reference

Tailwind v4's default palette ships in OKLCH. shadcn/ui converted from HSL to OKLCH in March 2025.

**Format**: `oklch(L C H)` — `oklch(0.62 0.19 250)`
- **L** (lightness): 0–1 (0 = black, 1 = white)
- **C** (chroma): 0–0.4 (0 = grey, higher = more saturated)
- **H** (hue): 0–360°

**Why OKLCH over hex/HSL**:
- Perceptually uniform — equal L steps look equal to the eye (unlike HSL)
- Dark mode scales are easier to build (lower L = darker)
- Better for accessibility contrast math
- Tailwind v4 opacity modifiers (`bg-primary/50`) work correctly with OKLCH

**Converting hex to OKLCH**: use `oklch.com`, `oklch.fyi`, or the `colorjs.io` library. The Evil Martians chrome extension adds OKLCH values alongside hex in DevTools.

**Tailwind standard colors** (reference):
- `blue-400`: `oklch(0.694 0.148 237)`
- `purple-500`: `oklch(0.627 0.231 299)`
- `orange-500`: `oklch(0.690 0.185 46)`
- `yellow-500`: `oklch(0.795 0.174 87)`
- `red-500`: `oklch(0.638 0.221 28)`
- `green-500`: `oklch(0.723 0.183 151)`

---

## CLAUDE.md design system rules (template)

Add this to your `CLAUDE.md` or `.cursor/rules` so AI agents use semantic tokens by default:

```markdown
## Design system
Tokens in `app/styles/tokens.css` (primitives + semantics) and `app/app.css` (@theme inline maps).
Read both files before generating UI.

Rules:
- Use semantic Tailwind classes — NEVER primitive names like `bg-black-950` or `text-bone-100`
- Backgrounds: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground` (default), `text-muted-foreground` (secondary), `text-primary` (high-emphasis)
- Borders: `border-border`
- Interactive: `bg-primary text-primary-foreground`, `bg-accent text-accent-foreground`
- Surfaces always pair with foreground: `bg-card text-card-foreground`
- For inline style= props use semantic vars: `var(--background)`, `var(--muted-foreground)`, `var(--border)`
- Dark mode: .dark class on <html> — @custom-variant dark is already wired
```

---

## Migration guide (from custom token names)

When migrating an existing codebase, three categories of changes:

### 1. Tailwind utility class renames

Common → shadcn mapping (your names will differ, but the pattern is the same):

| Old class | New class |
|---|---|
| `bg-base`, `bg-page` | `bg-background` |
| `bg-surface`, `bg-panel` | `bg-card` |
| `bg-elevated`, `bg-raised` | `bg-muted` |
| `text-default`, `text-body` | `text-foreground` |
| `text-subtle`, `text-dim` | `text-muted-foreground` |
| `border-subtle`, `border-ui` | `border-border` |

Bulk sed pattern (adjust for your actual names):
```bash
find app/ -name "*.tsx" | xargs sed -i \
  -e 's/\bbg-surface\b/bg-card/g' \
  -e 's/\bbg-elevated\b/bg-muted/g' \
  -e 's/\btext-subtle\b/text-muted-foreground/g'
```

**Warning**: word-boundary patterns will also match inside CSS var names in inline styles (e.g. `var(--color-bg-surface)` → `var(--color-bg-card)`). Run a second pass to fix those:
```bash
find app/ -name "*.tsx" | xargs sed -i \
  -e 's/var(--color-bg-card)/var(--card)/g' \
  -e 's/var(--color-bg-muted)/var(--muted)/g'
```

### 2. Inline style CSS var renames

Replace old semantic var names with the new shadcn names directly:
```bash
find app/ -name "*.tsx" | xargs sed -i \
  -e 's/var(--color-bg-base)/var(--background)/g' \
  -e 's/var(--color-bg-surface)/var(--card)/g' \
  -e 's/var(--color-text-primary)/var(--foreground)/g' \
  -e 's/var(--color-text-secondary)/var(--muted-foreground)/g' \
  -e 's/var(--color-border-default)/var(--border)/g'
```

Run the full-var-name patterns BEFORE the word-boundary utility patterns to avoid double-transformation bugs.

### 3. Dynamic var references (JS template literals)

If you have `var(--color-rarity-${label})` style patterns, preserve the `--color-rarity-*` naming in your `@theme inline` block — those CSS properties are registered there and remain accessible at runtime.

---

## What to skip (for teams of 2–8 on a single web app)

| Tool | Skip unless... |
|---|---|
| **Style Dictionary** | You ship to iOS/Android/email in parallel |
| **Tokens Studio** | A designer edits tokens in Figma (no-code) |
| **DTCG JSON** | You publish a multi-brand system consumed by other teams |
| **Component tokens** | You have 3+ platforms or 50+ products |

The W3C DTCG spec (stable since Oct 2025) is worth understanding conceptually for the aliasing model — but don't adopt JSON as your runtime format just to be standards-compliant.
