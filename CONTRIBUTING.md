# Contributing

Thanks for your interest in contributing to Arkhana.

## Getting started

1. Fork the repo and clone your fork
2. Follow the [setup steps in the README](./README.md#getting-started)
3. Create a branch: `git checkout -b my-feature`

## Development workflow

```bash
pnpm dev        # start dev server with HMR at http://localhost:3000
pnpm typecheck  # check types
pnpm lint       # lint
pnpm test       # run tests
pnpm format     # format with Prettier
```

All four should pass before opening a PR.

## Conventions

- **No raw SQL** — all DB queries through Drizzle ORM
- **No `process.env`** in app code — import from `config/index.ts` (exception: `db/index.ts`)
- **No `.server.ts` suffix** on modules imported at route-file top level — name them `.ts`
- **Rarity labels** come from `RARITY_LABELS` in `app/lib/cards.ts` — don't hardcode them
- Card image slugs are derived via `cardImageSlug()` — never stored in DB

## Submitting a PR

- Keep PRs focused — one feature or fix per PR
- Add a clear description of what changed and why
- If you're fixing a bug, describe how to reproduce it
- For significant changes, open an issue first to discuss the approach

## Reporting bugs

Open a [GitHub issue](https://github.com/hugodelahousse/arkhana/issues) with:
- Steps to reproduce
- Expected vs. actual behavior
- Browser/OS if it's a UI issue

## Security issues

Do **not** open public issues for security vulnerabilities. See [SECURITY.md](./SECURITY.md).
