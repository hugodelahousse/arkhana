# Arkhana

Daily tarot card pull app. Dark fantasy aesthetic. One card per user per UTC day.

## Stack
- React Router v7 (SSR, framework mode) + Vite
- Express server (`server/index.ts`) — serves the built app
- Drizzle ORM + Postgres (`db/schema/`)
- better-auth (email/password, `/api/auth/*`)
- Tailwind CSS v4 + design tokens (`app/styles/tokens.css`)
- Config via Zod-validated env vars — never use `process.env` directly in app code, import from `config/index.ts`. Exception: `db/index.ts` reads `DATABASE_URL` directly so seed/migration scripts work without requiring all app env vars

## Commands
- Dev: `pnpm dev` (starts Express + React Router via tsx, requires build first; use `pnpm build && pnpm dev` after changes to server/)
- Build: `pnpm build`
- DB push (sync schema): `pnpm db:push`
- DB seed (78 cards): `pnpm db:seed`
- DB studio: `pnpm db:studio`

## Environment
- Copy `.env.example` → `.env` and fill in values (`.env` is gitignored)
- Local Postgres: `postgresql://arkhana:arkhana@localhost:5432/arkhana` (start with `pg_ctlcluster 16 main start`)
- Docker not available in this remote environment

## Key conventions
- All DB queries through Drizzle — no raw SQL
- Card id is 0–77 (canonical index); all rich data (arcana, suit, descriptions) lives in `app/lib/cards.ts` — DB `cards` table only stores `{id, name}`
- Image slugs are derived: `cardImageSlug(cardId, pack)` → `"default/00"` — never stored in DB
- `isReversed` and `isRadiant` are roll-time modifiers on `user_cards`, not card properties
- Rarity labels (Mundane…Primordial) live in `RARITY_LABELS` in `app/lib/cards.ts` — never hardcode them elsewhere
- `pullDate` is always `"YYYY-MM-DD"` UTC string
- Auth session injected into React Router context via `server/index.ts getLoadContext`; access as `context.user`
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
| `/card/:id` | required | Card detail + user pull history |
| `/card-lab` | public | Dev tool: test card animations + art |

## Frontend
- Run `/dark-fantasy-ui` when building or reviewing any visual component — encodes the app's taste constraints
- `TarotCard` in `app/components/TarotCard.tsx` — single source of truth for card display with flip, tilt, and foil
- `cardImageUrl(id)` from `app/lib/cardImages.ts` → jsDelivr CDN serving Rider-Waite-Smith art (metabismuth/tarot-json, MIT)
- `/card-lab` — public dev page to test any card + rarity + radiant/reversed without daily pull limit
- Animation library: `motion` (motion/react) — `useSpring` for tilt physics, `AnimatePresence` for content reveals

## Future features (see GitHub Issues)
- Daily pack system (1 Major + 4 Minor per pull)
- Streak tracking + streak achievements
- Suit/full-deck completion achievements
- Radiant card conic-gradient border shimmer implemented in `TarotCard`; foil + reveal glow live
- Production deployment (Neon + Railway/Fly.io)
