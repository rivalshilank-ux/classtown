# ClassTown

Browser-based 2D multiplayer classroom game. A pnpm/Turborepo monorepo with a
Colyseus authoritative game server, a Next.js web app, and shared packages.

## Structure

```
apps/
  game-server/   Colyseus server — authoritative rooms, state, and simulation
  web/           Next.js app (Supabase auth client structure, not wired up yet)
packages/
  shared-schema/ Runtime state (Colyseus @colyseus/schema) + zod message schemas
                 shared between server and clients. Built to dist/ (see below).
  shared-types/  Plain TypeScript types shared across apps (no runtime code)
  ui/            Shared React components (Tailwind-based)
  i18n/          Translation dictionaries (ko default, en/ja/zh)
  config/        Shared tsconfig base + ESLint base config
```

## Requirements

- Node >= 22
- pnpm 11 (`packageManager` is pinned in `package.json`)

## Setup

```sh
pnpm install
```

Copy each app's `.env.example` to `.env.local` and fill in real values before
running that app:

- `apps/game-server/.env.example`
- `apps/web/.env.example`

## Common commands

Run from the repo root (Turborepo fans these out to every package):

```sh
pnpm dev         # start all apps in watch mode
pnpm build       # build all packages/apps
pnpm typecheck   # tsc --noEmit everywhere
pnpm lint        # eslint everywhere
pnpm test        # vitest everywhere a test script exists
```

`shared-schema` is the one package that ships compiled JS (`dist/`) instead of
raw TypeScript — `@colyseus/schema`'s `@type()` decorators can't be
transformed at runtime through a workspace symlink, so it needs a real build
step. `pnpm dev` / `pnpm build` handle this automatically (turbo's `^build`
dependency), but if you ever run `tsx`/`vitest` directly inside
`apps/game-server` without going through turbo, build `shared-schema` first:

```sh
pnpm --filter @classtown/shared-schema build
```

## Status

**Phase 0** — scaffold plus a minimal authoritative `TownRoom`:

- Validated join (`onAuth` + zod `joinRoomOptionsSchema`)
- Server-authoritative movement: client sends a normalized `{ dx, dy }` move
  intent, the server runs a fixed 20Hz simulation and owns the resulting
  `PlayerState.x/y`, synced to all clients via Colyseus state sync
- Covered by integration tests that boot a real Colyseus server and connect
  with a real `colyseus.js` client

Not yet implemented: real join-code validation, Supabase auth, Phaser game
client, maps/collision, NPCs, shop/inventory, economy, events, chat, teacher
and admin dashboards.
