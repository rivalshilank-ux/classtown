-- Phase 6.5 production verification finding, reproduced against a real
-- local Postgres instance: "Teachers create classes they own" (INSERT,
-- `with check (teacher_id = auth.uid())`) always fails with "new row
-- violates row-level security policy for table classes" when the insert
-- asks for the row back (`... returning id`, i.e. any supabase-js
-- `.insert().select()` call) -- even for the row's own legitimate owner.
--
-- Root cause: INSERT ... RETURNING is additionally checked against the
-- table's SELECT policies (Postgres raises an error here rather than
-- silently omitting the row, unlike a plain SELECT). This table's SELECT
-- policy was "Teachers read their own classes" using
-- `is_class_teacher(id)` -- a `security definer` helper that re-queries
-- `classes` by id to compare `teacher_id`. Verified directly: swapping that
-- policy for a plain `teacher_id = auth.uid()` comparison (no indirection
-- through the helper) made the exact same insert succeed immediately;
-- reverting it back reproduced the failure again. `is_class_teacher(id)` is
-- correct and still needed as-is for every *other* table that checks
-- ownership of a *different* row's `class_id` (student_participants,
-- student_progression, student_activity_events) -- this fix only removes
-- the one self-referential use of it, on classes' own SELECT policy, where
-- a direct column comparison is both simpler and correct.
--
-- Not currently reachable from any real user flow: the only production
-- write path for `classes` is the `create_class()` RPC
-- (20260905070000_class_rpcs.sql), which is `security definer` and performs
-- its own `insert ... returning * into v_class` as the function owner,
-- bypassing RLS (both this policy and the INSERT policy) entirely. This
-- fix closes a real gap in the table's own defense-in-depth policy (the one
-- a direct, non-RPC client insert would fall back on), not a live incident.
--
-- `if exists` on the drop: unlike the pure-GRANT migrations elsewhere in
-- this project (safe to run twice by nature), a bare `drop policy` errors
-- if the policy is already gone -- e.g. a manual replay after a partial
-- apply. `create policy` below still has no idempotent form in Postgres,
-- consistent with every other CREATE POLICY in this project; the normal
-- Supabase migration runner never re-applies an already-recorded migration,
-- so this only matters for a manual/out-of-band replay.
drop policy if exists "Teachers read their own classes" on public.classes;

create policy "Teachers read their own classes"
  on public.classes
  for select
  to authenticated
  using (teacher_id = auth.uid ());
