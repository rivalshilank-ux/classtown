-- Same singleton-row automation-flag convention as the three columns
-- 20260906120000_ops_config.sql already added: defaults false, so
-- deploying this changes nothing until an admin opts in from
-- /admin/updates. Gates the scheduled health-report cron
-- (apps/web/app/api/cron/health-check/route.ts) -- see
-- docs/operations/operations.md.
alter table public.ops_config
  add column auto_health_report_enabled boolean not null default false;

revoke update on public.ops_config from authenticated;
grant update (
  auto_update_enabled,
  auto_announcement_enabled,
  auto_rollback_enabled,
  auto_health_report_enabled,
  updated_by,
  updated_at
) on public.ops_config to authenticated;
