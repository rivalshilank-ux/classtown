# Architecture Overview

## Status

Implemented — describes the system as it exists on the current branch.

## Purpose

Explain how ClassTown's apps and packages fit together: what talks to
what, where authority lives, and why the repository is structured as a
pnpm/Turborepo monorepo.

## Architecture

### Repository layout

```
classtown/
├── apps/
│   ├── web/           Next.js 16 app (App Router) — teacher-facing site + game embed
│   └── game-server/    Colyseus authoritative game server
├── packages/
│   ├── game-client/   Phaser 4 wrapper, consumed by apps/web's /play page
│   ├── shared-schema/  Zod validation schemas + @colyseus/schema state classes
│   ├── shared-types/   Plain TypeScript types shared across apps
│   ├── ui/             Design-system React components (Button, Card, Alert, ...)
│   ├── i18n/           Translation lookup (Korean strings, single locale today)
│   └── config/         Shared eslint config + tsconfig base
├── supabase/
│   └── migrations/     SQL migrations for the Supabase Postgres project
└── docs/                This documentation tree
```

Build order is declared in `turbo.json`; `shared-schema` must run its
`build` script (`tsc -p tsconfig.build.json`) before anything that imports
it, because `@colyseus/schema`'s decorators require compiled output, not
raw TypeScript passed through `node_modules`.

### Runtime topology

```
Browser (apps/web, Next.js)
   ├── Server Components / Server Actions ──HTTPS──> Supabase (Postgres + Auth)
   │        (teacher signup/login/logout, profile read, RLS-scoped queries)
   │
   └── /play page embeds packages/game-client (Phaser)
              │
              └──WebSocket──> apps/game-server (Colyseus)
                                   │
                                   └── TownRoom: single authoritative
                                       in-memory state (TownRoomState),
                                       broadcast to all connected clients
```

Two independent backends exist and are never conflated:

- **Supabase** owns teacher identity, profile data, and authorization for
  anything reached through `apps/web`'s server-side code (Server
  Components, Server Actions, `proxy.ts`).
- **The Colyseus game server** owns all in-room gameplay state
  (`TownRoomState`, `PlayerState`). It has no knowledge of Supabase, auth
  tokens, or teacher accounts today — a client currently joins with only a
  `joinCode` and `nickname` (see
  [`../game/movement.md`](../game/movement.md) and
  [`../security/security.md`](../security/security.md) for what that does
  and does not authorize).

### Server-authoritative game state

`apps/game-server/src/rooms/TownRoom.ts` is the only place a player's
position is written. The client:

1. Reads local keyboard input (`KeyboardInput`).
2. Sends a normalized move intent (`{ dx, dy }`, each in `[-1, 1]`) over
   the Colyseus connection (`moveSender.ts`), validated client-side
   against the same Zod schema (`moveIntentSchema`) the server uses.
3. Never sets its own or any other player's `x`/`y` directly. It only
   renders whatever `TownRoomState.players` says, which the server
   broadcasts on every simulation tick (`SIMULATION_INTERVAL_MS`, 20
   ticks/second).

The server:

1. Re-validates every incoming `move` message with `moveIntentSchema`
   server-side; a message that fails validation is silently dropped, not
   trusted.
2. Stores the latest valid intent per session in an in-memory map.
3. On each simulation tick, advances every player's authoritative
   `x`/`y` by `MOVE_SPEED * deltaSeconds`, using the last received
   intent, clamped to a unit vector.
4. This is the entire authority boundary today: there is no collision,
   map bounds, or anti-cheat validation beyond intent-shape checking. See
   [`../game/movement.md`](../game/movement.md) for exactly what is and
   is not implemented.

### Auth flow (teacher)

```
signUpTeacher() / signInTeacher()  (Server Action, apps/web)
        │
        ▼
supabase.auth.signUp / signInWithPassword
        │
        ▼
auth.users row created/verified (Supabase Auth, not app code)
        │  (on insert only)
        ▼
handle_new_teacher() trigger — security definer
        │
        ▼
public.teacher_accounts row created (1:1 with auth.users)
        │
        ▼
Session cookie set by @supabase/ssr on the response
```

On every subsequent request:

```
proxy.ts (Next.js proxy/middleware)
   → updateSession() refreshes the Supabase session cookie
   → redirects unauthenticated requests away from /teacher
   → redirects authenticated requests away from /login, /signup

/teacher page (Server Component)
   → getCurrentTeacher() re-checks auth.getUser() AND selects the
     teacher_accounts row (RLS-scoped to auth.uid())
   → redirects to /login again if either check fails
```

Route protection is intentionally checked twice (proxy, then page) so
correctness doesn't depend on the proxy matcher alone. See
[`../security/security.md`](../security/security.md) and
[`../adr/0001-teacher-authentication.md`](../adr/0001-teacher-authentication.md).

### Package dependency graph

```
shared-schema  ──┬──> game-server
                 ├──> game-client ──> web
                 └──────────────────> web

shared-types  ────────────────────> web

ui, i18n  ────────────────────────> web

config (eslint + tsconfig)  ──> every package/app (devDependency only)
```

`game-client` also depends on `game-server` as a **devDependency** only —
used in its test suite to exercise a real `TownRoom` instance rather than
a mock, not at runtime.

## Current Implementation

- `apps/web`: teacher signup, login, logout, protected `/teacher` page,
  `/play` page embedding the game client. Next.js 16 App Router, Tailwind
  v4, deployed to Vercel (Root Directory `apps/web`).
- `apps/game-server`: single Colyseus room (`TownRoom`) with
  server-authoritative movement, an Express `/health` endpoint, no
  persistence — all state is in-memory and lost on restart.
- `packages/*`: as listed above, all implemented to the extent their
  consumers use them.

## Planned

- Any second room type, persistence for game state, student accounts,
  join-code-to-real-room mapping, and everything under
  [`../game/`](../game/) beyond movement.
- A connection between `apps/web`'s Supabase session and
  `apps/game-server`'s room join (today they are entirely independent —
  see [`../security/security.md`](../security/security.md) for the
  concrete implication).

## Security

See [`../security/security.md`](../security/security.md) for the full
treatment. Summary: Supabase Auth + RLS govern everything reached through
`apps/web`; the Colyseus room governs gameplay state and re-validates all
client input server-side; no service-role or other secret key is used by
`apps/web`'s runtime code.

## Testing

- `apps/game-server`: `TownRoom.test.ts` (Vitest) — join, invalid input,
  authoritative position, multi-client sync.
- `packages/game-client`: `connection.test.ts`,
  `KeyboardInput.test.ts`, `input.test.ts`, `moveSender.test.ts`.
- `apps/web`: `getCurrentTeacher.test.ts`, `teacherActions.test.ts`,
  `formErrors.test.ts`, `proxy.test.ts`, `middleware.test.ts`.
- Run everything from the repo root: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

## Related Documents

- [`../game/movement.md`](../game/movement.md)
- [`../teacher/teacher.md`](../teacher/teacher.md)
- [`../security/security.md`](../security/security.md)
- [`../adr/0001-teacher-authentication.md`](../adr/0001-teacher-authentication.md)
