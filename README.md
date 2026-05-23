# Arkhana

Daily tarot card pull app. Dark fantasy aesthetic. One card per user per UTC day.

## Stack

- [React Router v7](https://reactrouter.com/) (SSR, framework mode) + Vite
- Express server (`server/index.ts`)
- [Drizzle ORM](https://orm.drizzle.team/) + Postgres
- [better-auth](https://www.better-auth.com/) — email/password authentication
- Tailwind CSS v4 + design tokens
- [`@charcoalhq/lockbox`](https://github.com/charcoalhq/lockbox) — encrypted config

## Prerequisites

- Node.js 20+
- pnpm
- Postgres 16 (local: `pg_ctlcluster 16 main start`)

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Export the lockbox private key

The private key is stored at `.lockbox/private-key` after `lockbox init`. Export it for every command that touches config or the DB:

```bash
export LOCKBOX_PRIVATE_KEY=$(cat .lockbox/private-key)
```

### 3. Set up the database

```bash
# Push schema
pnpm db:push

# Seed 78 cards
pnpm db:seed
```

### 4. Start the dev server

Requires a production build first (Express serves the built React Router app):

```bash
pnpm build && pnpm dev
```

The app will be available at `http://localhost:3000`.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Express + React Router (requires prior build) |
| `pnpm build` | Production build |
| `pnpm db:push` | Sync Drizzle schema to DB |
| `pnpm db:seed` | Seed 78 tarot cards |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run TypeScript type-check |

## Environment / config

Config is managed by lockbox. Edit values with:

```bash
npx lockbox set <key> <value>              # default (all envs)
npx lockbox set <key> <value> --env <env> # specific env
npx lockbox set-secret <key> <value> --env <env> # encrypted
```

Then regenerate: `npx lockbox generate`

Default values (local development):

| Key | Default |
|---|---|
| `databaseUrl` | `postgresql://arkhana:arkhana@localhost:5432/arkhana` |
| `betterAuthUrl` | `http://localhost:3000` |
| `port` | `3000` |
| `betterAuthSecret` | *(encrypted, see `.lockbox/private-key`)* |

## Docker

```bash
docker build -t arkhana .
docker run -p 3000:3000 -e LOCKBOX_PRIVATE_KEY=<key> arkhana
```
