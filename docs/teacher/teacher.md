# Teacher Features

## Status

In Progress — authentication, profile display, class management, student
roster/removal, roster-mode classes (switching a class between `open` and
`roster`, and pre-creating roster participants), and teacher-to-class
announcements are Implemented; in-room game control (starting/pausing/
ending a session) and deeper statistics are Planned.

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
- **Switch join mode** between `open` (default: any class code + nickname
  admits a first-time student) and `roster` (`setClassJoinMode()` →
  updates `classes.join_mode` directly, RLS-scoped like rename/archive).
  A roster class has no self-registration fallback: `join_class()` refuses
  a bare nickname once `join_mode = 'roster'` (see
  `supabase/migrations/20260905070000_class_rpcs.sql`), so a student can
  only enter with a participant code the teacher minted ahead of time.
  Switching modes on an existing class does not affect students already
  inside — their participant codes keep working for rejoining either way.

### Student roster

- **Pre-create a roster participant** (`RosterParticipantForm`,
  `createRosterParticipant()` → `create_roster_participant()` RPC) —
  shown on `/teacher` only for a `roster`-mode class. Returns a fresh
  participant code the teacher hands to one specific student; the
  participant then appears in the roster below immediately (level 1, 0
  XP, offline) even before that student ever connects. The student-side
  entry form (`apps/web/app/student/StudentEntryForm.tsx`) has a "학생
  코드가 있어요" toggle that swaps the nickname field for a participant-code
  field, calling the same `joinClass()` action with `participantCode`
  instead of `nickname`.

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

### Announcements

- `AnnouncementForm` on `/teacher` → `sendAnnouncement()` inserts a row
  into `public.class_announcements` (RLS: `is_class_teacher(class_id)`,
  `supabase/migrations/20260912000000_class_announcements.sql`). This is
  distinct from the admin's site-wide announcements
  ([`../admin/admin.md`](../admin/admin.md)) — a `class_announcements` row
  targets exactly one class and is delivered once, live, never stored as a
  banner a page renders.
- Delivery has nothing to do with Colyseus room isolation: `TownRoom`
  (`apps/game-server/src/rooms/TownRoom.ts`'s `deliverAnnouncements`,
  polled every 4s) already tracks each connected session's `classId` (see
  ADR 0002), so it polls for pending rows scoped to exactly the classIds
  currently in the room and sends the `announcement` message only to
  matching sessions — the shared-room architecture (see "Room-per-class
  isolation" under Planned) required no change for this to work correctly.
  A class with nobody connected right now simply leaves its row pending
  until someone from that class joins.
- No delivery receipt is surfaced to the teacher and no history view
  exists yet — `sendAnnouncement()` only confirms the row was queued.
  Rendered as a dismissing banner in `apps/web/app/play/GameCanvas.tsx`
  (distinct from the in-room chat overlay — see
  [`../messenger/messenger.md`](../messenger/messenger.md) for why that
  chat is out of scope for evolving into this).

## Planned

- **Room-per-class isolation** — today all classes' students share one
  Colyseus room (`TownRoom`); a class boundary exists in Supabase but not
  yet inside the game world itself. This is a deliberate scope decision
  so far, not an oversight — see
  [`../architecture/overview.md`](../architecture/overview.md).
- **Game control** — starting/pausing/ending a session from the teacher
  side.
- **Deeper statistics** — the roster and activity feed already cover
  headline numbers (count, online, level, XP, recent joins/leaves);
  anything beyond that (trends over time, per-zone occupancy) is still a
  direction, not a design.

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
management, student removal, join-mode/roster-participant actions, and
sending an announcement: `teacherActions.test.ts` (class/roster actions),
plus real-session IDOR verification (Teacher A cannot rename, regenerate,
or remove from Teacher B's class) during Phase 8 against a fresh local
Postgres instance. Announcement delivery and class filtering: the
`announcements` block in
`apps/game-server/src/rooms/TownRoom.test.ts`, against a real Colyseus
server with a fake persistence layer.

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../security/security.md`](../security/security.md)
- [`../adr/0001-teacher-authentication.md`](../adr/0001-teacher-authentication.md)
- [`../adr/0002-class-and-student-participants.md`](../adr/0002-class-and-student-participants.md)
- [`../admin/admin.md`](../admin/admin.md)