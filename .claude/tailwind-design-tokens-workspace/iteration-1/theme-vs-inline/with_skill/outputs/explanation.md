# @theme vs @theme inline in Tailwind v4

## The short answer

Both work with dark mode. The claim that "`@theme inline` breaks dark mode" is a misunderstanding — but there IS a real difference in *how* each one resolves values, and using the wrong one in the wrong place genuinely will break dark mode.

## What each one does

**`@theme` (plain)**
```css
@theme {
  --color-primary: oklch(0.627 0.231 299);
}
```
Tailwind generates: `.bg-primary { background-color: var(--color-primary) }`

The utility references `--color-primary` as a CSS custom property, resolved at **render time**. If a `.dark` override changes `--color-primary` in the cascade, the utility picks it up automatically.

**`@theme inline`**
```css
@theme inline {
  --color-primary: var(--primary);
}
```
Tailwind generates: `.bg-primary { background-color: var(--primary) }`

The `inline` modifier tells Tailwind: skip the `--color-primary` intermediary — **inline the right-hand side** directly into the utility. If the right-hand side is `var(--primary)`, that `var()` is what gets inlined — and `var()` resolves at runtime, so dark mode still works.

## Why the confusion exists

**The case that breaks dark mode:**
```css
/* Literal value on the right-hand side — baked in at build time */
@theme inline {
  --color-primary: oklch(0.627 0.231 299);
}
```
This inlines a hardcoded color. The `.dark` override is ignored. Dark mode breaks.

**The shadcn/ui pattern — works correctly:**
```css
/* var() on the right-hand side — resolves at render time */
@theme inline {
  --color-primary: var(--primary);
}
```
This inlines `var(--primary)`. When `.dark` swaps `--primary`, the utility resolves to the dark value. Dark mode works.

## Decision table

| Situation | Use |
|---|---|
| Semantic vars (`--background`, `--primary`) defined in `:root`/`.dark` | `@theme inline` |
| Primitive color ramps you want overridable per-component | `@theme` (plain) |
| Font families | `@theme` (plain) |
| `calc()` derived tokens like `calc(var(--radius) * 0.6)` | `@theme` (plain) — calc inlines at build time in `@theme inline` |

## The calc() gotcha

```css
/* BROKEN: calc evaluates at build time inside @theme inline */
@theme inline { --radius-sm: calc(var(--radius) * 0.6); }

/* CORRECT: plain @theme keeps the calc alive at runtime */
@theme { --radius-sm: calc(var(--radius) * 0.6); }
```

## Summary

- `@theme inline` + `var(--semantic-name)` on the right = dark mode works (this is the shadcn pattern)
- `@theme inline` + a literal value on the right = dark mode breaks
- Use plain `@theme` for fonts, spacing primitives, and calc-derived tokens
