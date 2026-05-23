# Arkhana

Daily tarot card pull app. Dark fantasy aesthetic. One card per user per UTC day.

## Stack

- [React Router v7](https://reactrouter.com/) (SSR, framework mode) + Vite
- Express server (`server/index.ts`)
- [Drizzle ORM](https://orm.drizzle.team/) + Postgres
- [better-auth](https://www.better-auth.com/) — email/password authentication
- Tailwind CSS v4 + design tokens

## Prerequisites

- Node.js 20+
- pnpm
- Postgres 16 (local: `pg_ctlcluster 16 main start`)

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` | Random string, min 32 chars |
| `BETTER_AUTH_URL` | App base URL (e.g. `http://localhost:3000`) |
| `PORT` | Port to listen on (default: `3000`) |
| `NODE_ENV` | `development` \| `production` \| `test` |

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
| `pnpm format` | Run Prettier |
| `pnpm typecheck` | Run TypeScript type-check |

## Docker

```bash
docker build -t arkhana .
docker run -p 3000:3000 --env-file .env arkhana
```
