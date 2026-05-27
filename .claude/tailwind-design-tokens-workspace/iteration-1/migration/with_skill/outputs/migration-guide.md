# Migration Guide: Custom Tokens → shadcn Naming

## Token rename map

| Old CSS var | New shadcn name | Tailwind class (old) | Tailwind class (new) |
|---|---|---|---|
| `--color-bg-primary` | `--background` | `bg-bg-primary` | `bg-background` |
| `--color-bg-secondary` | `--card` | `bg-bg-secondary` | `bg-card` |
| `--color-text-default` | `--foreground` | `text-text-default` | `text-foreground` |
| `--color-text-muted` | `--muted-foreground` | `text-text-muted` | `text-muted-foreground` |
| `--color-border-ui` | `--border` | `border-border-ui` | `border-border` |

## sed commands

**IMPORTANT: Run the full CSS var renames BEFORE the word-boundary class renames.** If you run class renames first, patterns like `\bbg-secondary\b` will transform `var(--color-bg-secondary)` into `var(--color-bg-card)`, then the var rename `s/var(--color-bg-secondary)/var(--card)/g` won't match. This double-transform produces broken var names that are hard to spot.

```bash
# Step 1: Rename CSS custom property references in inline styles
find app -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) \
  -exec sed -i \
    -e 's/var(--color-bg-primary)/var(--background)/g' \
    -e 's/var(--color-bg-secondary)/var(--card)/g' \
    -e 's/var(--color-text-default)/var(--foreground)/g' \
    -e 's/var(--color-text-muted)/var(--muted-foreground)/g' \
    -e 's/var(--color-border-ui)/var(--border)/g' \
  {} +

# Step 2: Rename Tailwind utility classes in JSX/TSX
find app -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -exec sed -i \
    -e 's/\bbg-bg-primary\b/bg-background/g' \
    -e 's/\bbg-bg-secondary\b/bg-card/g' \
    -e 's/\btext-text-default\b/text-foreground/g' \
    -e 's/\btext-text-muted\b/text-muted-foreground/g' \
    -e 's/\bborder-border-ui\b/border-border/g' \
  {} +

# Step 3: Verify no old names remain
grep -rn "color-bg-primary\|color-bg-secondary\|text-text-\|border-border-ui" app/
```

## Warnings

1. **Double-transform bug**: word-boundary `sed` patterns match inside CSS var names. Always rename full `var(--old-name)` strings BEFORE renaming bare Tailwind classes.

2. **`border-border` is intentional**: The doubled word is correct shadcn convention. `border-border` means "apply `--color-border` as the border color." It is NOT redundant.

3. **Direct `var()` usage in custom CSS**: After migration, use `var(--background)` (the semantic var), not `var(--color-background)` (the Tailwind-internal var). Both resolve to the same color, but `var(--background)` is the canonical form.

4. **Add to CLAUDE.md** after migration to prevent future regressions:

```markdown
## Design tokens
- Use semantic Tailwind classes: bg-background, bg-card, bg-muted, text-foreground,
  text-muted-foreground, border-border
- NEVER use old names: bg-bg-primary, text-text-default, border-border-ui
- For inline styles: var(--background), var(--foreground), var(--muted-foreground), var(--border)
```
