# Arkhana

Daily tarot card pull app. Dark fantasy aesthetic. One card per user per UTC day.

## Stack
- React Router v7 (SSR, framework mode) + Vite
- Express server (`server.js` outer shell + `server/app.ts` inner app)
- Drizzle ORM + Postgres (`db/schema/`)
- better-auth (email/password, `/api/auth/*`)
- Tailwind CSS v4 + design tokens (`app/styles/tokens.css` primitives + `app/app.css` @theme inline mappings)
- Config via Zod-validated env vars — never use `process.env` directly in app code, import from `config/index.ts`. Exception: `db/index.ts` reads `DATABASE_URL` directly so seed/migration scripts work without requiring all app env vars

## Commands
- Dev: `pnpm dev` (starts Express + Vite dev server with HMR, no build needed)
- Build: `pnpm build`
- DB generate migration: `pnpm db:generate` — run after ANY change to `db/schema/`
- DB run migrations: `pnpm db:migrate`
- DB push (sync schema, dev only): `pnpm db:push`
- DB seed (78 cards): `pnpm db:seed`
- DB studio: `pnpm db:studio`

## Database migrations
Production uses `pnpm db:migrate` (not `db:push`). After editing any file in `db/schema/`, always:
1. Run `pnpm db:generate` to create the migration SQL file
2. Commit the generated `migrations/` files alongside the schema change
3. Use `pnpm db:push` only for local dev iteration — never for production

## Environment
- Copy `.env.example` → `.env` and fill in values (`.env` is gitignored)
- Local Postgres: `postgresql://arkhana:arkhana@localhost:5432/arkhana` (start with `pg_ctlcluster 16 main start`)
- Docker not available in this remote environment

## Daily pull vs. Sunday spread — a recurring pitfall

The app has two **mutually exclusive** pull types. On any given day a user draws one or the other, never both:

| Day | Draw type | Storage |
|---|---|---|
| Mon–Sat | Daily card | `user_cards` row with `pullType = "daily"` |
| Sunday | Weekly spread | `spreads` row + 4 `user_cards` rows with `pullType = "spread"` linked via `spread_cards` |

**Any "has the user drawn today?" check must cover BOTH.** The pattern:
1. Check `user_cards WHERE pullType = 'daily' AND pullDate = localToday`
2. Check `spreads WHERE spreadDate = localToday`

Features that previously missed this: the circle feed (`getCircleDailyPulls`) and daily reminder notifications (`getReminderTargets`). When in doubt, search for `pullType.*daily` and check whether the adjacent logic also queries the `spreads` table.

## Key conventions
- All DB queries through Drizzle — no raw SQL
- Card id is 0–77 (canonical index); all rich data (arcana, suit, descriptions) lives in `app/lib/cards.ts` — DB `cards` table only stores `{id, name}`
- Image slugs are derived: `cardImageSlug(cardId, pack)` → `"default/00"` — never stored in DB
- `isReversed` and `isRadiant` are roll-time modifiers on `user_cards`, not card properties
- Rarity labels (Mundane…Primordial) live in `RARITY_LABELS` in `app/lib/cards.ts` — never hardcode them elsewhere
- `pullDate` is always `"YYYY-MM-DD"` UTC string
- Auth session injected into React Router context via `server/app.ts getLoadContext`; access as `context.user`
- Do NOT use `.server.ts` suffix for modules imported at route-file top level — the React Router `dot-server` plugin blocks this. Name them `.ts` and rely on tree-shaking.

## Route structure
| Route | Auth | Purpose |
|---|---|---|
| `/` | public | Landing; redirects to `/dashboard` if signed in |
| `/auth/signup` | public | Email/password sign-up |
| `/auth/signin` | public | Email/password sign-in |
| `/dashboard` | required | Today's pull status + recent cards |
| `/pull` | required | Draw card action + reveal |
| `/collection` | required | 78-card grid |
| `/collection/:slug` | required | Card detail + pull history; 404 if not yet drawn (slug = `the-fool`, `seven-of-cups`, etc.) |

## Product philosophy
- **Hook before friction**: let new visitors draw a card before asking them to sign up. CTAs for unauthenticated users should link to `/` (the draw flow) rather than `/auth/signup`. The anonymous pull system means they can experience the app immediately; account creation follows naturally.

## Design system
Tokens live in `app/styles/tokens.css` (primitives + semantics) and `app/app.css` (`@theme inline` maps them into Tailwind utilities). Read both files before generating UI.

**Two-tier structure:**
- Primitives: OKLCH color values (`--black-950`, `--bone-100`, `--purple-500`, `--rarity-1` … `--rarity-5`)
- Semantics: shadcn-style names (`--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--border`, `--ring`, `--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`, `--rarity-mundane` … `--rarity-primordial`)

**Rules:**
- Use semantic Tailwind classes — NEVER primitives:
  - Backgrounds: `bg-background`, `bg-card`, `bg-muted`
  - Text: `text-foreground` (default), `text-muted-foreground` (dimmer), `text-primary` (high-emphasis / bone-100)
  - Borders: `border-border`
  - Accent/interactive: `bg-accent text-accent-foreground`, `bg-primary text-primary-foreground`
  - Rarity: `text-rarity-mundane` … `text-rarity-primordial` (or `var(--color-rarity-*)` for inline styles)
- Surfaces ALWAYS pair with their foreground: `bg-card text-card-foreground`
- For inline `style=` props use the semantic CSS vars directly: `var(--background)`, `var(--muted-foreground)`, `var(--border)`, `var(--accent)`, etc.
- Rarity colors in JS: `var(--color-rarity-${rarityLabel.toLowerCase()})` — this pattern works because `@theme inline` registers `--color-rarity-*` CSS vars
- Dark mode infrastructure: `.dark` class on `<html>` (wired in `tokens.css`); no light-mode values yet but the `.dark {}` block is ready for override

## SEO conventions
When adding or modifying routes, follow these rules to keep SEO in sync:

**Route registration:** All routes are declared in `app/routes.ts` (manual config, not file-based). New routes must be added there.

**Meta tags checklist for every new route:**
- Every route MUST export `meta()` with at least `{ title: "Page Name — Arkhana" }`
- **Public/indexable routes** (currently only `/` and `/collection/:slug`): add `description`, canonical `<link>`, `og:title`, `og:description`, `og:image`, `og:url`, `og:site_name`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- **Private/auth-only routes**: add `{ name: "robots", content: "noindex, nofollow" }`
- **Social-sharing routes** (user profiles, share pages): add `noindex` BUT keep OG/Twitter tags for social previews + add `og:site_name`

**Sitemap:** `app/routes/sitemap.ts` generates `/sitemap.xml`. Add new public, indexable routes there. Currently lists `/` + all 78 `/collection/:slug` pages.

**robots.txt:** `public/robots.txt` controls crawler access. Update `Disallow` rules when adding new private route prefixes.

**Structured data:** Use `<JsonLd>` component (`app/components/JsonLd.tsx`) for Schema.org markup. Card detail pages have `Article` + `BreadcrumbList` schemas; home has `WebSite`.

**Card alt text:** Use `cardAlt(card)` from `app/lib/cards.ts` — never write card alt text inline. Produces "The Fool tarot card — Major Arcana" format.

**Canonical strategy:** Indexable pages self-canonical. Share/pull pages that reference a card should NOT canonical to the card page (they're noindexed anyway).

## Future features (see GitHub Issues)
- Daily pack system (1 Major + 4 Minor per pull)
- Streak tracking + streak achievements
- Suit/full-deck completion achievements
- Radiant card special CSS animations (flagged in DB, no special UI yet)
- Production deployment (Neon + Railway/Fly.io)
