# Security

## Status

Implemented (teacher authentication, RLS, secret separation) — Planned
(cheat-tool authorization, audit logging, everything gameplay-security
beyond input-shape validation).

## Purpose

Record the actual security model in place today, so future changes can be
checked against it instead of against assumptions. Nothing in this
document describes a control that does not exist in the code.

## Architecture

Two independent trust boundaries exist:

1. **`apps/web` ↔ Supabase** — teacher identity and profile data.
2. **`packages/game-client` ↔ `apps/game-server`** — gameplay state.

They do not currently share a trust boundary: a Colyseus room join does
not check a Supabase session, and a Supabase session does not grant any
special gameplay authority. See [`../architecture/overview.md`](../architecture/overview.md).

## Current Implementation

### Authentication

- Teacher accounts are Supabase Auth (`auth.users`) rows only.
  `apps/web` never stores or handles a raw password itself — it calls
  `supabase.auth.signUp` / `signInWithPassword` / `signOut`
  (`apps/web/src/lib/auth/teacherActions.ts`) and Supabase does the rest.
- Session state is a cookie managed by `@supabase/ssr`, refreshed on every
  request by `updateSession()` (`apps/web/src/lib/supabase/middleware.ts`),
  called from `proxy.ts` on every non-static request.

### Authorization

- `/teacher` is protected twice:
  - `proxy.ts` redirects to `/login` if `updateSession()` finds no user.
  - `getCurrentTeacher()` (`apps/web/src/lib/auth/getCurrentTeacher.ts`)
    independently calls `supabase.auth.getUser()` again inside the page
    itself and redirects to `/login` if that also fails, so correctness
    does not depend solely on the proxy matcher being right.
- `/login` and `/signup` redirect an already-authenticated user to
  `/teacher`.

### Row Level Security (Postgres)

`supabase/migrations/20260904000000_teacher_accounts.sql` enables RLS on
`public.teacher_accounts` with exactly two policies:

- `select` where `auth.uid() = id`
- `update` where `auth.uid() = id` (with the same check clause)

There is deliberately no `insert` or `delete` policy for the
`authenticated` role — rows are created only by the `handle_new_teacher()`
trigger (`security definer`) on `auth.users` insert, and are never deleted
by application code. This was verified against the live database via
direct PostgREST calls with real JWTs during Phase 1B, not assumed from
application code behavior alone.

### Secret management

- `apps/web/.env.example` documents exactly two kinds of variable:
  - `NEXT_PUBLIC_*` — public, safe to ship to the browser
    (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
    `NEXT_PUBLIC_GAME_SERVER_URL`).
  - `SUPABASE_SERVICE_ROLE_KEY` — listed as server-only and **is not
    referenced anywhere in `apps/web`'s runtime code**. No file in
    `apps/web/app` or `apps/web/src` reads it. It exists in
    `.env.example` as a placeholder for future server-only tooling, not
    as something currently wired up.
  - No service-role key, database password, or other credential was ever
    placed in Vercel's public/client environment variable scope.
- `.env.local` is git-ignored; no secret value has been committed.

### Server-authoritative gameplay state

- `apps/game-server`'s `TownRoom` is the only writer of `PlayerState.x`
  / `PlayerState.y`. The client sends a move **intent**
  (`{ dx, dy }`, each clamped to `[-1, 1]`), never a position.
- The intent is validated against `moveIntentSchema` (Zod) on the server
  before being stored, independent of the client-side validation in
  `packages/game-client/src/moveSender.ts` — a modified or malicious
  client cannot skip server-side validation, because the server does not
  trust client-side validation happened.
- A message that fails server-side validation is silently dropped, not
  applied partially.

### Known current gaps (not yet addressed — recorded honestly, not fixed here)

- `TownRoom.onAuth` validates the **shape** of `{ joinCode, nickname }`
  but does not check the join code against any real room registry, teacher
  ownership, or Supabase session. Any client that can reach the game
  server's WebSocket endpoint can join with any well-formed nickname and
  join code today.
- There is no rate limiting on Supabase Auth calls or the Colyseus
  `move` message handler beyond the simulation tick rate.
- There is no audit log for authentication events or gameplay actions.

## Planned

- Tying a Colyseus room join to a verified identity (teacher session,
  and/or a real student identity, once one exists) instead of an
  unauthenticated `nickname` + `joinCode` pair.
- Cheat access authorization: per the direction recorded in
  [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md), the
  **server**, not any client, must be the sole authority on whether a
  given account may issue cheat commands, in both normal rooms and Cheat
  Mode. No part of this is implemented yet.
- Audit logging for cheat commands and administrative/moderation actions
  (see [`../admin/admin.md`](../admin/admin.md)).
- A dependency/security update process (see
  [`../operations/operations.md`](../operations/operations.md)) — no
  automated dependency scanning exists today.

## Testing

RLS policies were verified against a live Supabase project via direct
PostgREST requests using real signed-in JWTs (not only through
`apps/web`'s own `.eq("id", ...)` application code), during Phase 1B.
Auth flow and route protection are covered by
`getCurrentTeacher.test.ts`, `teacherActions.test.ts`, `proxy.test.ts`,
and `middleware.test.ts`. Move-intent validation is covered by
`TownRoom.test.ts` and `moveSender.test.ts`.

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../adr/0001-teacher-authentication.md`](../adr/0001-teacher-authentication.md)
- [`../teacher/teacher.md`](../teacher/teacher.md)
- [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)
