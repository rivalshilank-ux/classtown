# Teacher Features

## Status

In Progress — authentication, profile display, class management, and
student roster/removal are Implemented; in-room game control, teacher-to
-class announcements, and deeper statistics are Planned.

## Purpose

Everything a teacher can do in ClassTown, separated clearly into what
exists today and what is only a stated direction.

## Architecture

See [`../architecture/overview.md`](../architecture/overview.md) for the
full auth flow diagram. Teacher-facing pages live in `apps/web/app/`
(`/login`, `/signup`, `/teacher`); teacher identity is entirely a
Supabase concept — the game server has no notion of a teacher, only of
the participant a join ticket resolves to (see
[`../adr/0002-class-and-student-participants.md`](../adr/0002-class-and-student-participants.md)).

## Current Implementation

### Authentication

- Signup (`/signup`): name, school name, email, password, confirm
  password. Calls `signUpTeacher()`
  (`apps/web/src/lib/auth/teacherActions.ts`), which calls
  `supabase.auth.signUp`. If Supabase's email-confirmation requirement is
  on, the user sees a "check your email" success state instead of being
  signed in immediately (`requiresEmailConfirmation`).
- Login (`/login`): email + password via `signInTeacher()` →
  `supabase.auth.signInWithPassword`.
- Logout: `signOutTeacher()` → `supabase.auth.signOut()`, exposed via a
  `LogoutButton` on `/teacher`.
- Validation is Zod-based (`teacherSignupSchema`, `teacherLoginSchema` in
  `packages/shared-schema`), with field-level errors surfaced through
  `toFieldErrors()`.

### Teacher profile

- `public.teacher_accounts` (one row per `auth.users` row, created by a
  database trigger, not application code — see
  [`../adr/0001-teacher-authentication.md`](../adr/0001-teacher-authentication.md)):
  `name`, `school_name`, `email`, `role` (currently always `"teacher"`),
  `created_at`, `updated_at`.
- `/teacher` reads this row via `getCurrentTeacher()` and displays name,
  email, school, and role in a read-only card. There is no edit-profile
  UI or Server Action yet, even though the RLS `update` policy already
  permits it.

### Class management

A teacher's dashboard (`/teacher`) is real, DB-backed data end to end —
never a client-supplied teacher id, always the caller's own RLS-scoped
session (`is_class_teacher()`). See
[`../adr/0002-class-and-student-participants.md`](../adr/0002-class-and-student-participants.md).

- **Create** a class (`create_class()` RPC) — the join code is generated
  server-side (30 usable characters × 6 places, unbiased rejection
  sampling), retried on the rare unique-constraint collision.
- **Rename** a class.
- **Regenerate** its join code — the old code stops working for new
  joins the moment the new one is written; no separate deactivation step.
- **Archive** a class (`archived_at`) — never a physical delete. An
  archived class refuses new joins and new roster participants, but
  existing student rows, progression, and activity history are untouched.
- **Toggle** whether joining is currently open (`join_open`), independent
  of archiving — closes the door mid-lesson without rotating the code.

### Student roster

- Nickname, participant code, status, last seen, level, and XP for every
  active/transferred participant in the teacher's own class(es); a recent
  activity feed (joined/left events).
- **Remove** a student (`status = 'removed'`, never a row delete) — a
  removed student's participant code can no longer join, but their
  progression and activity history are preserved.
- "Online" is derived, not pushed: `last_seen_at` within the last 2
  minutes, written by the game server on join/leave and a per-room
  batched heartbeat — see
  [`../adr/0002-class-and-student-participants.md`](../adr/0002-class-and-student-participants.md).

## Planned

- **Room-per-class isolation** — today all classes' students share one
  Colyseus room (`TownRoom`); a class boundary exists in Supabase but not
  yet inside the game world itself. This is a deliberate scope decision
  so far, not an oversight — see
  [`../architecture/overview.md`](../architecture/overview.md).
- **Game control** — starting/pausing/ending a session from the teacher
  side.
- **Announcements** — teacher-to-class messaging inside a room (distinct
  from the admin's site-wide announcements — see
  [`../admin/admin.md`](../admin/admin.md)).
- **Deeper statistics** — the roster and activity feed already cover
  headline numbers (count, online, level, XP, recent joins/leaves);
  anything beyond that (trends over time, per-zone occupancy) is still a
  direction, not a design.
- **Roster-mode classes** (teacher pre-creates participants by code
  instead of open self-registration) — the underlying RPC
  (`create_roster_participant`) exists and is tested, but no management
  UI has been built for it yet.

## Security

Covered in full in [`../security/security.md`](../security/security.md).
Summary: Supabase Auth + RLS (`is_class_teacher()`, never a raw owner-
column comparison a client could influence), double route protection
(`proxy.ts` + page-level check), every class/roster mutation scoped to the
caller's own session — cross-teacher access has been verified blocked
against a real database, not just asserted.

## Testing

Auth: `getCurrentTeacher.test.ts`, `teacherActions.test.ts` (auth),
`formErrors.test.ts`, `proxy.test.ts`, `middleware.test.ts`. Class
management and student removal: `teacherActions.test.ts` (class/roster
actions), plus real-session IDOR verification (Teacher A cannot rename,
regenerate, or remove from Teacher B's class) during Phase 8 against a
fresh local Postgres instance.

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../security/security.md`](../security/security.md)
- [`../adr/0001-teacher-authentication.md`](../adr/0001-teacher-authentication.md)
- [`../adr/0002-class-and-student-participants.md`](../adr/0002-class-and-student-participants.md)
- [`../admin/admin.md`](../admin/admin.md)