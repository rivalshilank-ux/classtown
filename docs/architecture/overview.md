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
   │        (teacher auth, admin auth, class/roster management,
   │         student join, RLS-scoped queries)
   │
   ├── /admin/* (separate admin_accounts identity, see ADR 0003) ──HTTPS──> Supabase
   │
   ├── GET /api/cron/weekly-check, /weekly-update (Vercel Cron, CRON_SECRET-gated)
   │        ──HTTPS──> Supabase (service role) + GitHub Actions API + Vercel API
   │        (see ADR 0007 — the update-plan/deployment pipeline)
   │
   └── /play page embeds packages/game-client (Phaser)
              │
              └──WebSocket──> apps/game-server (Colyseus)
                                   │
                                   ├── TownRoom: single authoritative
                                   │   in-memory state (TownRoomState),
                                   │   broadcast to all connected clients
                                   │
                                   └──HTTPS (service role)──> Supabase
                                       (consume_join_ticket, presence,
                                       activity, maintenance check)
```

Two independent backends exist and are never conflated:

- **Supabase** owns every identity in the system (teacher, admin, and the
  non-authenticating student `student_participants` character sheet),
  profile/roster data, and authorization for anything reached through
  `apps/web`'s server-side code (Server Components, Server Actions,
  `proxy.ts`).
- **The Colyseus game server** owns all in-room gameplay state
  (`TownRoomState`, `PlayerState`). It does hold a Supabase client (the
  service role, injected as `ClassPersistence` — see
  [`../adr/0002-class-and-student-participants.md`](../adr/0002-class-and-student-participants.md)),
  but only to verify a join ticket, write presence/activity, and check
  maintenance mode. It never holds a browser's session and never accepts
  identity from anything the client sends: a join carries a single-use
  ticket and nothing else (see
  [`../game/movement.md`](../game/movement.md) and
  [`../security/security.md`](../security/security.md)).

The two backends are bridged exactly once, by design: `apps/web`'s
`joinClass()` (service role) validates a class code + participant/nickname
against Supabase and mints a `join_tickets` row; the browser holds only
that ticket id; `apps/game-server`'s `TownRoom.onAuth` exchanges it via
`consume_join_ticket()` and takes identity from the returned row, never
from the client. No other path connects the two systems.

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
4. Collision against the campus map (`canOccupy()` / `isSolidAtPixel()`)
   is checked server-side before committing each axis of a move — a
   client cannot walk through a wall by lying about its own position,
   because the server never reads one. There is still no anti-cheat
   validation beyond intent-shape checking and wall collision (e.g. no
   speed-hack detection). See [`../game/movement.md`](../game/movement.md)
   for exactly what is and is not implemented.
5. A dropped connection does not immediately erase a player: an
   unconsented disconnect gets a short server-side reconnection window
   (`allowReconnection()`), during which the player is frozen in place
   rather than removed. See
   [`../adr/0008-connection-recovery.md`](../adr/0008-connection-recovery.md).

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

Admin identity follows the same doubled-guard shape as a fully separate
`admin_accounts` table (never an elevated teacher) — see
[`../adr/0003-admin-authentication.md`](../adr/0003-admin-authentication.md).
Student join has no auth flow at all in the Supabase Auth sense — see the
ticket bridge described above and
[`../adr/0002-class-and-student-participants.md`](../adr/0002-class-and-student-participants.md).

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

This list is intentionally at the level of "what exists," not "how it
works" — each area has its own doc with the real detail, linked below.

- **Teacher**: signup/login/logout, a dashboard with real class
  management (create, rename, archive, regenerate join code) and a real
  student roster (nickname, participant code, status, last seen, level,
  XP, recent activity) — see [`../teacher/teacher.md`](../teacher/teacher.md).
- **Student**: no account. Entry by class code (+ nickname or participant
  code) → server-validated join → single-use ticket → verified Colyseus
  identity. Session recovery and reconnection are handled without ever
  trusting client-supplied identity — see
  [`../adr/0002-class-and-student-participants.md`](../adr/0002-class-and-student-participants.md)
  and [`../adr/0008-connection-recovery.md`](../adr/0008-connection-recovery.md).
- **Admin**: a fully separate identity and Operations Center
  (`/admin/*`) — teacher/class/student oversight, audit log,
  announcements, maintenance mode with a real enforcement gate, AI Ops
  (Groq-backed, optional), and an automated weekly update/deployment
  pipeline. See [`../admin/admin.md`](../admin/admin.md) and
  ADRs 0003–0008.
- **Game**: one shared Colyseus room (`TownRoom`) — not per-class rooms,
  a deliberate design choice — with server-authoritative movement,
  campus-map collision, presence/activity persisted to Supabase, and
  reconnection handling for dropped connections.
- **Deployment**: Vercel (Git-connected, auto-deploys on push to
  `master`), GitHub Actions CI running typecheck/lint/test/build on every
  push — see [`../operations/operations.md`](../operations/operations.md).
- `packages/*`: as listed above, implemented to the extent their
  consumers use them.

## Planned

- A second Colyseus room type, and everything under
  [`../game/`](../game/) beyond movement (NPCs, quests, inventory, etc.)
  — all explicitly out of scope until a dedicated phase takes them on.
- Cheat-tool authorization (see
  [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)).
- A messenger/chat feature (see
  [`../messenger/messenger.md`](../messenger/messenger.md)).

## Security

See [`../security/security.md`](../security/security.md) for the full
treatment. Summary: Supabase Auth + RLS govern everything reached through
`apps/web`'s teacher/admin surfaces; students never hold a Supabase
session, so every student-facing read/write goes through trusted server
code under the service role; the Colyseus room governs gameplay state,
re-validates all client input server-side, and never accepts identity
from the client.

## Testing

Real, not mocked, wherever the thing being tested is real infrastructure:
`apps/game-server`'s room tests run against an actual Colyseus server
instance (join/auth, movement/collision, maintenance gate, reconnection);
security-critical Supabase behavior (RLS, IDOR, grants) has been verified
against a real local Postgres instance during several phases, not only
through application code's own query shape. Run
`pnpm typecheck && pnpm lint && pnpm test && pnpm build` from the repo
root for the current, authoritative pass/fail state — the exact file list
changes too often to keep listed here without drifting.

## Related Documents

- [`../game/movement.md`](../game/movement.md)
- [`../teacher/teacher.md`](../teacher/teacher.md)
- [`../admin/admin.md`](../admin/admin.md)
- [`../security/security.md`](../security/security.md)
- [`../operations/operations.md`](../operations/operations.md)
- [`../README.md`](../README.md) — full ADR index
