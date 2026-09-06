-- Phase 6.5 production verification finding, reproduced against a fresh
-- `supabase db reset` on a real local Postgres instance (not assumed from
-- reading the SQL): every RLS policy in this project for the `authenticated`
-- role was silently unreachable except where an UPDATE grant had already
-- been narrowed by hand.
--
-- Root cause: every earlier migration's column-narrowing comment ("Supabase
-- grants broad DML on new public tables by default, so narrowing has to
-- start with a revoke") describes what the Supabase *Dashboard's* Table
-- Editor does for you automatically when you create a table through the UI.
-- It does NOT happen for tables created by raw SQL migrations, which is the
-- only way any table in this project has ever been created. Concretely: a
-- fresh cluster's `pg_default_acl` grants full DML to anon/authenticated/
-- service_role only for objects created *by role `supabase_admin`* -- every
-- migration in `supabase/migrations/` runs as `postgres`, which has no such
-- default. The result: `revoke update on x from authenticated; grant update
-- (col) on x to authenticated;` always worked (it's a self-sufficient grant,
-- independent of any baseline), but no migration ever explicitly granted the
-- baseline SELECT/INSERT a `for select/insert to authenticated` policy
-- actually needs -- so every one of those policies has been dead code,
-- failing closed with "permission denied for table x" (a GRANT-level error,
-- never reaching RLS at all) rather than an RLS denial. This affected every
-- phase: a teacher could not read their own class list, an admin could not
-- read the teacher roster, etc. -- verified by reproducing the failure
-- first, then confirming the fix against the same real instance.
--
-- Fix: grant exactly the baseline each existing policy needs, at the same
-- column-level precision already established for UPDATE where the app only
-- ever writes a subset of a table's columns. `anon` is deliberately never
-- granted anything here -- every anon-facing read in this project already
-- goes through a `security definer` function
-- (get_latest_published_announcement/get_active_maintenance_notice), which
-- runs as the function owner and was never affected by this bug; keeping
-- anon off direct table grants preserves that boundary rather than widening
-- it while fixing this.
--
-- Forward-looking: also sets the default privilege for future tables
-- created by `postgres`, so the next migration that adds a `for select/
-- insert to authenticated` policy doesn't silently repeat this bug. UPDATE
-- is deliberately left out of the default -- this project's own convention
-- is to hand-narrow UPDATE per table (see every migration above), and a
-- blanket default would make it easy to forget that step and get broad
-- column access instead of a loud "permission denied" during testing.
alter default privileges for role postgres in schema public
  grant select, insert on tables to authenticated;

grant select on public.admin_accounts to authenticated;
grant select on public.admin_audit_logs to authenticated;
grant select, insert on public.ai_tool_executions to authenticated;
grant select, insert on public.classes to authenticated;
grant select, insert on public.system_announcements to authenticated;
grant select, insert on public.maintenance_windows to authenticated;
grant select on public.student_activity_events to authenticated;
grant select on public.student_participants to authenticated;
grant select on public.student_progression to authenticated;
grant select on public.teacher_accounts to authenticated;
grant select on public.update_executions to authenticated;
grant select, insert on public.update_plans to authenticated;
grant select on public.ops_config to authenticated;

-- UPDATE was never granted at all for these three (no prior column-scoped
-- grant existed to fall back on, unlike admin_accounts/ai_tool_executions/
-- classes/ops_config/student_participants/update_plans). Scoped to exactly
-- the columns the app writes today, same convention as every other table.
grant update (is_active, ends_at) on public.maintenance_windows to authenticated;
grant update (status, published_at) on public.system_announcements to authenticated;
grant update (name, school_name) on public.teacher_accounts to authenticated;

-- scheduler_runs, update_executions (beyond the SELECT above), and
-- join_tickets intentionally receive no INSERT/UPDATE grant here -- they
-- have no authenticated-facing policy for those commands, so a client
-- session should keep getting "permission denied," now for the right
-- reason (no policy) instead of the wrong one (no baseline grant to even
-- reach the policy check).
