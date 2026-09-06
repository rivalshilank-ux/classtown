-- Phase 6.5 production verification finding, same root cause as
-- 20260906130000 (every migration runs as `postgres`, whose default ACL
-- never propagates DML grants the way `supabase_admin`'s does), but for
-- `service_role` instead of `authenticated`. Verified directly: a
-- service-role client (`createSupabaseServiceClient()`) got "permission
-- denied for table scheduler_runs" attempting the exact insert
-- `acquireSchedulerLock()` performs -- on a role that already has
-- `rolbypassrls = true`. BYPASSRLS only skips policy evaluation; the
-- underlying table-level GRANT is still required to attempt the operation
-- at all, and no migration had ever granted one to `service_role` on any
-- table in this project.
--
-- Unlike `authenticated`, `service_role` needs no column-level narrowing:
-- it already bypasses RLS by design, so the only real access boundary is
-- "which server-side code calls it," not "which columns can a client
-- touch." Every direct service-role write in this project --
-- schedulerLock.ts, systemMaintenance.ts, updatePlans.ts's
-- createSystemUpdatePlan/getLatestApprovedPlan, opsConfig.ts's
-- getOpsConfigForScheduler, pipeline.ts, and apps/game-server's
-- supabasePersistence.ts -- was silently broken by this until now.
grant select, insert, update, delete on all tables in schema public to service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
