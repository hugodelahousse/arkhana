# @theme vs @theme inline in Tailwind CSS v4

## The single key difference

- **`@theme` (plain)** — Tailwind resolves the value at **build time** and hard-codes it into every utility class. `bg-primary` becomes `background-color: oklch(0.918 0.010 78)` — a literal value with no CSS variable reference.
- **`@theme inline`** — Tailwind keeps a `var()` reference in the generated utility. `bg-primary` becomes `background-color: var(--color-primary)` — the browser resolves it at paint time.

This is the entire reason `@theme inline` enables dark mode and plain `@theme` breaks it.

## Why plain @theme breaks dark mode

When you write:
```css
@theme {
  --color-background: oklch(0.055 0.006 270);
}
```
Tailwind outputs:
```css
.bg-background { background-color: oklch(0.055 0.006 270); }
```
There's no CSS variable in that rule. If you define `.dark { --color-background: oklch(0.97 0.002 270); }`, that override has nothing to hook into.

## Why @theme inline enables dark mode

When you write:
```css
@theme inline {
  --color-background: var(--background);
}
```
Tailwind outputs:
```css
.bg-background { background-color: var(--color-background); }
```
The browser resolves `--color-background` at paint time. When `.dark` overrides `--background`, the browser picks the right value automatically.

## Summary

| | `@theme` | `@theme inline` |
|---|---|---|
| Generated utility value | Literal resolved value | `var(--color-*)` reference |
| Dark mode works? | **No** | **Yes** |
| Best for | Typography, spacing, radii | All color tokens |
