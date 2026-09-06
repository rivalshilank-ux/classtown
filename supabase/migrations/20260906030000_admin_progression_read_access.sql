-- Same additive pattern as 20260906010000_admin_read_access.sql: a new
-- permissive SELECT policy, OR'd together with the existing teacher-scoped
-- policy on this table. Needed so the Admin Students page can show
-- level/XP -- the only remaining table Phase 2's admin views read that
-- didn't already have an admin-read policy from Phase 1.

create policy "Admins can read all student progression"
  on public.student_progression
  for select
  to authenticated
  using (public.is_admin ());
