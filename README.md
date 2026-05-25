# Arkhana

Daily tarot card pull app with a dark fantasy aesthetic. One card per user per UTC day. Anonymous pulls work before sign-up — no account required to experience the app.

## Stack

| Layer | Technology |
|---|---|
| Framework | [React Router v7](https://reactrouter.com/) (SSR, framework mode) + Vite |
| Server | Express v5 (`server.js` + `server/app.ts`) |
| Database | [Drizzle ORM](https://orm.drizzle.team/) + Postgres 16 |
| Auth | [better-auth](https://www.better-auth.com/) — email/password + anonymous sessions |
| Styles | Tailwind CSS v4 + design tokens (`app/styles/tokens.css`) |
| Config | Zod-validated env vars (`config/index.ts`) |

## Prerequisites

- Node.js 20+
- pnpm 10+
- Postgres 16

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values. See `.env.example` for descriptions of each variable.

### 3. Start Postgres

**Local install:**
```bash
pg_ctlcluster 16 main start
```

**Docker:**
```bash
docker compose up -d
```

### 4. Set up the database

```bash
pnpm db:push   # sync schema to DB
pnpm db:seed   # seed 78 tarot cards
```

### 5. Start the dev server

```bash
pnpm dev
```

The app starts at `http://localhost:3000` with HMR — no build step needed for development.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server (Express + Vite HMR) |
| `pnpm build` | Production build |
| `pnpm start` | Start production server (requires prior build) |
| `pnpm typecheck` | TypeScript type-check |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm test` | Vitest |
| `pnpm db:push` | Sync Drizzle schema to DB |
| `pnpm db:seed` | Seed 78 tarot cards |
| `pnpm db:studio` | Open Drizzle Studio |

## Routes

| Route | Auth | Description |
|---|---|---|
| `/` | public | Landing; redirects to `/dashboard` if signed in |
| `/auth/signup` | public | Email/password sign-up |
| `/auth/signin` | public | Email/password sign-in |
| `/dashboard` | required | Today's pull status + recent cards |
| `/pull` | required | Draw card action + reveal |
| `/collection` | required | 78-card grid |
| `/collection/:slug` | required | Card detail + pull history |
| `/u/:username` | public | Public profile |
| `/share/:pullId` | public | Shareable pull |

## Architecture notes

- All DB queries use Drizzle — no raw SQL
- Card data (arcana, suit, descriptions) lives in `app/lib/cards.ts`; the DB `cards` table only stores `{id, name}`
- Image slugs are derived via `cardImageSlug(cardId, pack)` — never stored in DB
- `isReversed` and `isRadiant` are roll-time modifiers on `user_cards`, not card properties
- `pullDate` is always a `"YYYY-MM-DD"` UTC string
- Auth session injected into React Router context via `server/app.ts getLoadContext`; access as `context.user`

## Docker

```bash
# Development (Postgres only)
docker compose up -d

# Production image
docker build -t arkhana .
docker run -p 3000:3000 --env-file .env arkhana
```

## Deployment

See [SECURITY.md](./SECURITY.md) for production hardening checklist.

Tested deployment targets: [Neon](https://neon.tech/) (Postgres) + [Railway](https://railway.app/) or [Fly.io](https://fly.io/) (app).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
