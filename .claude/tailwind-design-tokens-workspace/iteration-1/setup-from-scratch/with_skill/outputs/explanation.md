# Design Token Setup — Key Decisions

## Brand color conversion
`#6366f1` → `oklch(0.585 0.233 272)`. OKLCH is used because Tailwind v4's
native palette is OKLCH, opacity modifiers work correctly (`bg-primary/50`),
and perceptual uniformity makes ramp construction predictable. Hue 272 is
true indigo-violet.

## Two-tier architecture
- **Primitives** in `:root` (named `--indigo-500`, `--neutral-200`, etc.)
  — raw values, no semantic meaning, never used directly in components.
- **Semantics** also in `:root`/`.dark` (named `--background`, `--primary`, etc.)
  — reference primitives via `var()`, swapped in `.dark {}`.

## @theme inline (not plain @theme) for semantic mappings
Semantic tokens are source-of-truth in `:root`/`.dark`. Using `@theme inline`
means Tailwind inlines `var(--background)` into utilities rather than baking
a literal value at build time. This is what makes `.dark {}` overrides work
at runtime — the browser resolves `var(--background)` to whatever the cascade
says it is, including inside `.dark`.

## Radius in plain @theme (not @theme inline)
`--radius-sm/md/lg/xl` use `calc(var(--radius) * N)`. These must live in plain
`@theme` — in `@theme inline` the calc() would be frozen at build time and
won't respond to runtime changes to `--radius`.

## Dark mode: .dark class strategy
Class-based so users can manually toggle. JS reads
`window.matchMedia('(prefers-color-scheme: dark)')` on first load to set the
initial class — system preference is still respected.

## Sidebar tokens
SaaS dashboards typically have a dark sidebar even in light mode. Dedicated
`--sidebar-*` tokens let you style it independently without fighting the global
theme.

## Tools skipped
Style Dictionary, Tokens Studio, DTCG JSON — none needed for a 3-dev team
with no Figma and no mobile targets.
