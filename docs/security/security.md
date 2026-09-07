# Security

## Status

Implemented (teacher/admin authentication, RLS across every table,
ticket-verified Colyseus join, audit logging, rate limiting, secret
separation) — Planned (cheat-tool authorization, dependency/security
update automation).

## Purpose

Record the actual security model in place today, so future changes can be
checked against it instead of against assumptions. Nothing in this
document describes a control that does not exist in the code.

## Architecture

Two independent trust boundaries exist:

1. **`apps/web` ↔ Supabase** — teacher identity, admin identity, and
   every class/roster/admin-operations read or write.
2. **`packages/game-client` ↔ `apps/game-server`** — gameplay state.

They are bridged exactly once, deliberately: a single-use `join_tickets`
row, minted by `apps/web`'s `joinClass()` after validating a class code
and participant against Supabase, is the only thing that ever crosses
from one boundary to the other. A Colyseus room join never checks a
Supabase session directly (students never have one), and a Supabase
session never grants gameplay authority directly — the ticket is the only
bridge, it is single-use, and it expires in 120 seconds. See
[`../architecture/overview.md`](../architecture/overview.md) and
[`../adr/0002-class-and-student-participants.md`](../adr/0002-class-and-student-participants.md).

## Current Implementation

### Authentication

- Teacher and admin accounts are both Supabase Auth (`auth.users`) rows,
  but deliberately **separate identities** — `admin_accounts` is not an
  elevated `teacher_accounts` row. `apps/web` never stores or handles a
  raw password itself; it calls `supabase.auth.signUp` /
  `signInWithPassword` / `signOut` and Supabase does the rest. See
  [`../adr/0003-admin-authentication.md`](../adr/0003-admin-authentication.md).
  A signup trigger routes to exactly one of the two tables based on
  `raw_user_meta_data->>'role'`; the check is exhaustive, so a signup can
  never become both or neither.
- The admin login form is additionally gated by a single shared **Admin
  Code**, verified server-side via `crypto.timingSafeEqual` against a
  hash (`ADMIN_CODE_HASH`) before Supabase is ever called — a wrong code
  never touches real credentials or Supabase Auth's own rate limit. See
  [`../adr/0006-hidden-admin-entry.md`](../adr/0006-hidden-admin-entry.md).
- Students never authenticate. There is no `auth.users` row, no session,
  no password — see Row Level Security below for what that implies.
- Session state (teacher/admin) is a cookie managed by `@supabase/ssr`,
  refreshed on every request by `updateSession()`, called from `proxy.ts`
  on every non-static request.

### Authorization

- `/teacher` and `/admin/*` are each protected twice: `proxy.ts` redirects
  an unauthenticated request away, and the page itself independently
  re-checks (`getCurrentTeacher()` / `getCurrentAdmin()`) rather than
  trusting the proxy matcher alone.
- Every teacher-scoped or admin-scoped data operation is filtered by the
  caller's own RLS-scoped session — never by a client-supplied id. See
  Row Level Security below.

### Row Level Security (Postgres)

RLS is enabled on every table in `public` — roughly a dozen and a half as
of this writing (teacher/admin accounts, classes, student participants
and progression, activity events, join tickets, announcements,
maintenance windows, AI tool executions, update plans/executions,
scheduler runs, ops config). The policy shape is consistent throughout:

- A single `is_class_teacher(class_id)` / `is_admin()` `security definer`
  helper is called from every policy that needs it, rather than each
  policy comparing `auth.uid()` to an owner column directly — see
  [`../adr/0002-class-and-student-participants.md`](../adr/0002-class-and-student-participants.md).
- Column-level `GRANT`s narrow `UPDATE` to exactly the columns the app
  writes (e.g. a teacher can update a class's `name`/`join_mode`/
  `join_open`/`archived_at`, never its `class_code` or `teacher_id`).
- Tables with no legitimate client access at all (`join_tickets`,
  `scheduler_runs`) have zero policies and zero grants for `anon`/
  `authenticated` — RLS-enabled-with-no-policy is default-deny, not an
  oversight.
- **A production verification pass (Phase 6.5) found and fixed a
  project-wide gap**: every migration runs as `postgres`, whose default
  ACL never propagates baseline SELECT/INSERT grants to `authenticated`/
  `service_role` the way a Dashboard-created table's does — meaning every
  RLS policy was silently unreachable except where an UPDATE grant had
  already been hand-narrowed. This was found and fixed by resetting a
  fresh local Postgres instance and testing real authenticated sessions,
  not by reading the SQL. See the `2026090613*`–`2026090615*` migrations
  and [`../admin/admin.md`](../admin/admin.md).
- Every table's grant/policy pairing has since been verified against real
  `anon`/`teacher`/`admin`/`service_role` sessions on a fresh local
  instance, including cross-teacher IDOR attempts (blocked) and student
  identity spoofing attempts (blocked at the Colyseus layer — see below).

### Secret management

- `apps/web/.env.example` documents every variable and which of two kinds
  it is: `NEXT_PUBLIC_*` (public, safe in the browser) or server-only
  (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_CODE_HASH`, `CRON_SECRET`,
  `GROQ_API_KEY`, `GITHUB_TOKEN`, `VERCEL_TOKEN`, ...).
- **Correction**: an earlier version of this document claimed the service
  role key was "not referenced anywhere in `apps/web`'s runtime code." That
  was true only before student join, the scheduler, and the deployment
  pipeline existed. It is now used, deliberately, in a small number of
  server-only files — `lib/supabase/service.ts`, `lib/class/studentActions.ts`
  (students have no session to scope RLS to), and the `lib/deploy/*`
  modules the weekly cron routes call — every one of them a `"use server"`
  file or a route handler, never a client component, and confirmed via
  repository-wide grep during Phase 6.5/8 that the key never appears in
  any `"use client"` file.
- No service-role key, database password, or other server-only credential
  has ever been placed in Vercel's public/client environment variable
  scope — confirmed by listing (never printing the values of) the
  project's configured Vercel environment variables during Phase 8.
- `.env.local` is git-ignored; no secret value has been committed.

### Server-authoritative gameplay state

- `apps/game-server`'s `TownRoom` is the only writer of `PlayerState.x`
  / `PlayerState.y`. The client sends a move **intent**
  (`{ dx, dy }`, each clamped to `[-1, 1]`), never a position, and the
  server re-validates it independently of client-side validation.
- A message that fails server-side validation is silently dropped, not
  applied partially. Wall collision is also server-side (`canOccupy()`);
  a client cannot walk through a wall by lying about its position, because
  the server never reads one.
- A dropped connection does not immediately erase a player or their
  identity: see "Join and reconnection security" below.

### Join and reconnection security

- `TownRoom.onAuth` accepts **only** `{ ticket: uuid }`. Identity
  (`participantId`, `classId`, `nickname`) comes exclusively from
  `consume_join_ticket()`'s return row — never from anything else the
  client sends. A test asserts this directly: a client that sends a
  forged `nickname` alongside a valid ticket still gets the ticket's real
  nickname back, not its own.
- Tickets are single-use (an atomic `UPDATE ... WHERE consumed_at IS NULL`)
  and expire in 120 seconds.
- Reconnection (`allowReconnection()`, Phase 9–10) resumes a session the
  server already verified at the original join — it is never a second
  credential a client could use to assert a different identity. The
  server decides whether a reconnection window is even open, based on
  its own observation of the WebSocket close code, never on anything the
  client claims. See
  [`../adr/0008-connection-recovery.md`](../adr/0008-connection-recovery.md).
- A second connection for the same `participantId` (e.g. the same
  participant code opened on a second device) disconnects the older
  session — verified by test.

### Rate limiting

- Student join (`joinClass()`) is rate-limited per IP and per class code
  (10 attempts/minute each) — relevant specifically because the join
  endpoint is reachable by anyone who has a class code, including by
  guessing a participant code (30^6 keyspace).
- Admin login is separately rate-limited per IP around the Admin Code
  check.
- The limiter is an honestly-documented, per-process, in-memory fixed
  window — it throttles a single warm serverless instance, not a whole
  fleet. A shared store (Redis or a counter table) is the known
  correct next step before this matters at real scale; not yet done.

### Audit logging

- `public.admin_audit_logs` is an append-only, RLS-protected table
  written only through a `security definer` RPC
  (`record_audit_log()`) that always stamps `actor_id` from `auth.uid()`
  — a session can never write a log entry under another identity's name.
  Covers admin login/logout, announcement/maintenance/update-plan
  mutations, and AI Ops actions (both auto-executed and approved). See
  [`../admin/admin.md`](../admin/admin.md).
- Plain reads are never logged, by design (unbounded growth for no
  operational benefit).
- Gameplay activity (join/leave, not movement) is a separate,
  teacher-visible append-only table, `student_activity_events`.

## Planned

- Cheat access authorization: per the direction recorded in
  [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md), the
  **server**, not any client, must be the sole authority on whether a
  given account may issue cheat commands, in both normal rooms and Cheat
  Mode. No part of this is implemented yet.
- A dependency/security update process (see
  [`../operations/operations.md`](../operations/operations.md)) — no
  automated dependency scanning exists today.
- A distributed rate limiter, before the per-process in-memory one
  becomes a real gap at scale (see Rate limiting above).

## Testing

RLS, IDOR, and grant behavior have been verified multiple times against a
real, freshly-reset local Postgres instance using real `anon`/teacher/
admin/`service_role` sessions — not only through application code's own
query shape — most recently and thoroughly during Phase 6.5–6.6's
production-readiness audit. Colyseus join/identity/reconnection security
is covered by integration tests running against a real Colyseus server
instance (`TownRoom.test.ts`), not mocks. Route protection, RLS-scoped
server actions, and rate limiting have unit coverage throughout
`apps/web/src/lib/`. Run
`pnpm typecheck && pnpm lint && pnpm test && pnpm build` from the repo
root for the current, authoritative state.

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../admin/admin.md`](../admin/admin.md)
- [`../teacher/teacher.md`](../teacher/teacher.md)
- [`../operations/operations.md`](../operations/operations.md)
- [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)
- [`../README.md`](../README.md) — full ADR index
