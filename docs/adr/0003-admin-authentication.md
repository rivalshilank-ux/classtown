# 0003: Admin Authentication via a Separate `admin_accounts` Table

## Status

Accepted — Phase 1 of the Admin Operations Center.

## Context

`docs/admin/admin.md` recorded admin as a blank slate: no role, no table, no
auth model, and an explicit open question of whether admin should be its own
identity, a separate app, or "elevated teacher permissions." `teacher_accounts`
also has a `role text check (role = 'teacher')` constraint, so reusing that
table for admin would require loosening a constraint that exists specifically
to keep the teacher signup trigger simple (see
[`0001-teacher-authentication.md`](./0001-teacher-authentication.md)).

## Decision

Admin identity is a new `public.admin_accounts` table, structurally parallel
to `teacher_accounts` but independent from it:

- One row per `auth.users` row, created only by a new `handle_new_admin()`
  trigger (`security definer`, `AFTER INSERT ON auth.users`) that fires when
  `raw_user_meta_data->>'role' = 'admin'`. `handle_new_teacher()` already
  skips any non-`'teacher'` role, so the two triggers are mutually exclusive
  by construction — no change to `handle_new_teacher()` was needed.
- **No public signup route.** Admin accounts are created only via
  `apps/web/scripts/create-admin.ts`, run manually by an operator holding the
  real Supabase service role key. No AI tool and no web-reachable code path
  can create or promote an admin account.
- RLS-scoped like `teacher_accounts`: a session can only `select`/`update` its
  own row (`auth.uid() = id`), via a new `is_admin()` `security definer`
  helper (`docs` convention: mirrors `is_class_teacher()`, but takes no
  argument since "is the current session an active admin" doesn't vary per
  row the way "does this session own this specific class" does).
- A second, additive migration
  (`20260906010000_admin_read_access.sql`) grants `is_admin()` sessions
  read-only `SELECT` access to `teacher_accounts`, `classes`, and
  `student_participants` as **new, additional permissive policies** —
  Postgres RLS ORs multiple permissive policies for the same action together,
  so the existing teacher-scoped policies on those tables are untouched.
  This means Admin Overview/Teachers/Classes/Students read through the
  admin's own authenticated session, exactly the way teacher pages read
  through `auth.uid()` — never through the service role, which stays reserved
  for contexts with no user session at all (the bootstrap script, and later,
  server-only scheduler/AI execution).
- Route protection for `/admin` doubles the existing `/teacher` pattern:
  `proxy.ts` requires *any* authenticated session (redirecting to
  `/admin/login`, not `/login`, and excluding `/admin/login` itself from the
  protected-prefix check to avoid a redirect loop), and
  `app/admin/layout.tsx` independently calls `getCurrentAdmin()` and
  redirects again if the session isn't actually an admin. `signInAdmin()`
  additionally signs a session back out immediately if
  `supabase.auth.signInWithPassword` succeeds (i.e. the credentials are valid
  for *some* Supabase user) but no `admin_accounts` row exists for it — most
  likely a teacher who typed their own credentials into the admin login form.

## Consequences

- Two account kinds now exist side by side in `auth.users`, distinguished
  only by signup metadata and which profile-trigger fires. If a third kind is
  ever added, both `handle_new_teacher()` and `handle_new_admin()` would need
  re-auditing to confirm their `<> 'teacher'` / `<> 'admin'` guards still
  correctly exclude it — this is the same caveat ADR 0001 already flagged for
  a hypothetical second account type, now realized once.
- A person cannot be both a teacher and an admin under the same `auth.users`
  row; running both requires two separate accounts (two emails). This was not
  a stated requirement anywhere in the admin spec, so it wasn't designed for.
- `admin_accounts.is_active` exists so an admin can be deactivated without a
  destructive delete (deleting the `auth.users` row would still cascade, but
  isn't the deactivation path) — `is_admin()` and `getCurrentAdmin()` both
  check it, so a deactivated row stops granting access immediately without
  needing to also revoke the underlying Supabase Auth account.
- Admin bootstrapping (creating the very first admin) requires direct access
  to the Supabase service role key and is explicitly a manual, out-of-band
  step — it cannot happen from inside this sandboxed development session, and
  it should not be automated later, per the spec's rule that admin identity
  must never be exposed to or grantable by a regular user flow.

## Related Documents

- [`0001-teacher-authentication.md`](./0001-teacher-authentication.md)
- [`../admin/admin.md`](../admin/admin.md)
- [`../security/security.md`](../security/security.md)
