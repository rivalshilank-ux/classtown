# 0004: A Server-Authoritative Maintenance Gate, Not a Full Service Block

## Status

Accepted — Phase 3.5.

## Context

Phase 3 gave admins a way to toggle `maintenance_windows.is_active` and
showed it as a banner (`SiteStatusBanner`), but nothing actually stopped a
student joining or a teacher mutating data while it was on — Maintenance
Mode was a notice, not a gate. Production QA for Phase 3 (this phase) was
asked to close that gap, but explicitly not by blocking the whole service:
admins must keep working during their own maintenance window, existing
players must not be disconnected, and reads should stay available so a
teacher isn't locked out of their own dashboard while investigating.

## Decision

Three independent gate points, one per trust boundary already established
by prior ADRs — no boundary is asked to also enforce maintenance on another
boundary's behalf:

1. **Student join** (`joinClass` in `apps/web/src/lib/class/studentActions.ts`)
   — checks `getActiveMaintenanceNotice()` after rate-limiting but before
   calling the `join_class` RPC, returning `{ success: false, error, code:
   "MAINTENANCE_MODE" }`.
2. **Teacher mutations** (`createClass`, `regenerateClassCode`,
   `archiveClass`, `setClassJoinOpen` in
   `apps/web/src/lib/class/teacherActions.ts`) — same check, same error
   shape, inserted after input validation and before the Supabase call in
   each function. Reads (`class/queries.ts`) are deliberately never gated —
   maintenance blocks writes, not visibility.
3. **Colyseus new joins** (`TownRoom.onAuth` in
   `apps/game-server/src/rooms/TownRoom.ts`) — a new
   `ClassPersistence.isMaintenanceActive()` method, checked before
   `consumeJoinTicket` so a ticket isn't spent on a join that's about to be
   rejected anyway. Throws `ServerError(503, MAINTENANCE_MODE_ERROR_CODE)`.
   `onAuth` runs once, at join time; there is no code path from here that
   could reach or disconnect a session already in the room, so "don't
   force-disconnect existing players" falls out of where the check lives,
   not from an extra guard against it.

All three read the same underlying signal
(`get_active_maintenance_notice()`, `apps/web`'s via `@/lib/site/maintenance`,
the game server's via a direct RPC call using its own service-role client)
so there is exactly one source of truth for "is maintenance on," reachable
by every trust boundary without any of them needing the others' privileges.

`MAINTENANCE_MODE_ERROR_CODE` (`packages/shared-types/src/maintenance.ts`)
is a single shared string constant so apps/web's server actions and
apps/game-server's `ServerError` message agree on the same machine-readable
code; each side maps it to its own human-facing text independently
(`apps/web/app/play/GameCanvas.tsx` for the Colyseus case).

Admin routes are exempt by construction, not by an explicit maintenance
bypass check: `/admin/*` never calls any of the three gated functions above,
so there was nothing to exempt.

## Consequences

- Maintenance is enforced independently of authentication and authorization
  at every gate point — turning it on does not change what RLS or
  `is_admin()` permit, and turning it off does not restore anything RLS
  would otherwise deny. A bug in one is not a bug in the other.
- This is a notice-and-gate mechanism, not a kill switch: a request already
  past its gate check (e.g. a teacher mutation whose Supabase call is
  already in flight) completes normally. There is no attempt to cancel
  in-progress work, matching "don't force-disconnect existing players" as a
  general posture, not just a Colyseus-specific rule.
- `isMaintenanceActive()` fails open in `apps/game-server`'s Supabase-backed
  persistence (a transient RPC error returns `false`, allowing the join to
  proceed to `consumeJoinTicket`, which has its own independent failure
  mode). This was a deliberate choice: a flaky maintenance check should not
  itself become a reason gameplay goes down, and a database bad enough to
  break this check reliably also breaks the ticket-consumption call right
  after it.
- Verified for real, not just unit-tested: a local Supabase instance was
  used to fire two genuinely concurrent transactions at
  `maintenance_windows` (see `20260906050000_maintenance_windows.sql`'s
  partial unique index), confirming Postgres — not application code —
  is what keeps "at most one active window" true under a race. A real
  `apps/game-server` process was also run against that instance with an
  actual WebSocket client: a new join was rejected with `(503)
  MAINTENANCE_MODE` while maintenance was active, and a player already
  connected before maintenance started kept receiving authoritative
  position updates throughout, confirmed via an explicit `onLeave` listener
  that never fired.
- Fixing this phase's production QA also surfaced two unrelated Phase 3
  bugs, fixed alongside it (not new scope, but recorded here since they
  were found while verifying this gate): `/admin/login` was nested inside
  `app/admin/layout.tsx`'s admin-only guard, producing an infinite redirect
  loop for anyone who wasn't already an admin -- fixed by moving every
  protected route into an `app/admin/(protected)/` route group, leaving
  `login/` as a sibling outside it (same URLs, no layout inheritance). And
  the Phase 3 public-read policies on `system_announcements` and
  `maintenance_windows` were row-level only, so `select=*` against the anon
  key returned the full row (including `created_by`, an admin's id) —
  confirmed against the same local instance and closed by
  `20260906060000_public_read_hardening.sql`, which replaces both
  policies with narrow `security definer` functions.

## Related Documents

- [`0002-class-and-student-participants.md`](./0002-class-and-student-participants.md)
- [`0003-admin-authentication.md`](./0003-admin-authentication.md)
- [`../admin/admin.md`](../admin/admin.md)
- [`../operations/operations.md`](../operations/operations.md)
