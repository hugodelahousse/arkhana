# Migration Guide: Custom Tokens → shadcn Naming

## Token rename map

| Old CSS var | New shadcn name | Old Tailwind class | New Tailwind class |
|---|---|---|---|
| `--color-bg-primary` | `--background` | `bg-bg-primary` | `bg-background` |
| `--color-bg-secondary` | `--card` | `bg-bg-secondary` | `bg-card` |
| `--color-text-default` | `--foreground` | `text-text-default` | `text-foreground` |
| `--color-text-muted` | `--muted-foreground` | `text-text-muted` | `text-muted-foreground` |
| `--color-border-ui` | `--border` | `border-border-ui` | `border-border` |

## sed commands

```bash
# CSS custom property references
find app -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) \
  -exec sed -i \
    -e 's/var(--color-bg-primary)/var(--background)/g' \
    -e 's/var(--color-bg-secondary)/var(--card)/g' \
    -e 's/var(--color-text-default)/var(--foreground)/g' \
    -e 's/var(--color-text-muted)/var(--muted-foreground)/g' \
    -e 's/var(--color-border-ui)/var(--border)/g' \
  {} +

# Tailwind utility classes in JSX/TSX
find app -type f \( -name "*.tsx" -o -name "*.ts" \) \
  -exec sed -i \
    -e 's/\bbg-bg-primary\b/bg-background/g' \
    -e 's/\bbg-bg-secondary\b/bg-card/g' \
    -e 's/\btext-text-default\b/text-foreground/g' \
    -e 's/\btext-text-muted\b/text-muted-foreground/g' \
    -e 's/\bborder-border-ui\b/border-border/g' \
  {} +
```

## Warnings

1. `border-border` is intentionally doubled — it means "border color = `--color-border`"
2. Run `pnpm build` after migration to surface any missed references
