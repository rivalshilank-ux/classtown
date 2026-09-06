-- Additive, read-only access for admins over existing tables. Postgres RLS
-- combines multiple permissive policies for the same action with OR, so these
-- new policies extend teacher_accounts/classes/student_participants without
-- touching the teacher-scoped policies already defined for them -- a teacher's
-- own access is completely unchanged.
--
-- This exists so the Admin Overview/Teachers/Classes/Students pages can read
-- real data through the admin's own RLS-scoped session (is_admin()), the same
-- way teacher pages read through auth.uid() -- never by routing admin reads
-- through the service role, which is reserved for contexts with no user
-- session at all (see docs/adr/0003-admin-authentication.md).

create policy "Admins can read all teacher accounts"
  on public.teacher_accounts
  for select
  to authenticated
  using (public.is_admin ());

create policy "Admins can read all classes"
  on public.classes
  for select
  to authenticated
  using (public.is_admin ());

create policy "Admins can read all student participants"
  on public.student_participants
  for select
  to authenticated
  using (public.is_admin ());
