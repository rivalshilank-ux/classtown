# 0001: Teacher Authentication via Supabase Auth

## Status

Accepted — Phase 1.

## Context

ClassTown needed real user accounts for teachers before any teacher-facing
feature (room creation, class management, dashboards) could be built on
top of something real. Students, by contrast, currently join gameplay with
just a nickname and a join code — no account.

## Decision

Teacher authentication is handled entirely by **Supabase Auth**
(`auth.users`). No password or credential data is ever stored anywhere
else — `apps/web` never sees or persists a raw password; it only ever
calls `supabase.auth.signUp` / `signInWithPassword` / `signOut`.

Teacher-facing profile data (name, school name, email mirror) lives in a
separate `public.teacher_accounts` table, one row per `auth.users` row,
created automatically by a `security definer` trigger
(`handle_new_teacher`) on `auth.users` insert — not by a second write from
the application after `signUp()` resolves. This means the profile row
always exists once the auth user exists, with no window where one exists
without the other.

Row Level Security is enabled on `teacher_accounts`: a teacher can only
`select`/`update` the row where `id = auth.uid()`. There is deliberately
no `insert`/`delete` policy for the `authenticated` role — rows are only
ever created by the trigger and never deleted by the app.

Route protection for `/teacher` is enforced twice: once in `proxy.ts`
(Next's proxy/middleware, refreshes the session cookie and redirects
unauthenticated requests before the page even renders) and once again
inside the page itself (`getCurrentTeacher()`), so access doesn't depend
on the proxy matcher never being misconfigured.

`emailVerified` on the application-level `TeacherAccount` type is computed
from `auth.users.email_confirmed_at` at read time, not stored as a column
in `teacher_accounts` — Supabase Auth stays the one source of truth for
verification status instead of a second, potentially stale copy.

## Consequences

- Student participation stays exactly as it was — code-based, no account.
  This ADR doesn't change that, and this phase intentionally doesn't wire
  a join code to a real room or a real teacher yet.
- If student accounts are ever added through `auth.users` in a later
  phase, `handle_new_teacher` will need a way to tell a teacher signup
  apart from a student signup (e.g. a role field in the signup metadata)
  before it can stay unconditional the way it is today.
- Because Supabase JS returns `any` for query results without generated
  database types, the `TeacherAccountRow` shape in
  `apps/web/src/lib/auth/getCurrentTeacher.ts` is not actually checked by
  the compiler against the real table — TypeScript trusts it. Generating
  real types (`supabase gen types typescript`) needs a live project and
  is left for when one exists.
