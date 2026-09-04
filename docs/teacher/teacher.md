# Teacher Features

## Status

In Progress — authentication and profile display are Implemented;
classroom, room, game control, announcements, and statistics are Planned.

## Purpose

Everything a teacher can do in ClassTown, separated clearly into what
exists today and what is only a stated direction.

## Architecture

See [`../architecture/overview.md`](../architecture/overview.md) for the
full auth flow diagram. Teacher-facing pages live in `apps/web/app/`
(`/login`, `/signup`, `/teacher`); teacher identity is entirely a
Supabase concept — the game server has no notion of a teacher today.

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

## Planned

Everything below is a direction, not a design. No schema, API route, or
component exists for any of it yet.

- **Classroom** — grouping students under a teacher.
- **Room** — a teacher-owned, joinable gameplay space (would need the
  `joinCode` currently accepted by `TownRoom.onAuth` to actually resolve
  to something, instead of being accepted unconditionally — see
  [`../game/movement.md`](../game/movement.md) and
  [`../security/security.md`](../security/security.md)).
- **Game control** — starting/pausing/ending a session from the teacher
  side.
- **Announcements** — teacher-to-class messaging inside a room.
- **Statistics** — participation/activity reporting for a teacher's
  class.

The `/teacher` page currently represents this entire category with a
single disabled "coming soon" `Alert`, intentionally, rather than
building non-functional buttons for any of it.

## Security

Covered in full in [`../security/security.md`](../security/security.md).
Summary: Supabase Auth + RLS (`auth.uid() = id`), no service-role key in
`apps/web` runtime code, double route protection (`proxy.ts` +
page-level check).

## Testing

`getCurrentTeacher.test.ts`, `teacherActions.test.ts`,
`formErrors.test.ts` (all in `apps/web/src/lib/auth`), plus
`proxy.test.ts` and `middleware.test.ts` for route protection.

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../security/security.md`](../security/security.md)
- [`../adr/0001-teacher-authentication.md`](../adr/0001-teacher-authentication.md)
- [`../admin/admin.md`](../admin/admin.md)
