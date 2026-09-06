-- A single-row settings table for the automation flags every prior phase's
-- design has deferred to here. All three default to false: the scheduler
-- routes always run (so the lock/plan-creation machinery is exercised for
-- real every week), but nothing destructive happens until an admin
-- deliberately opts in.
create table public.ops_config (
  -- The boolean-PK-with-a-check-that-it's-true trick: only one row can ever
  -- exist, since the PK's only legal value is `true`.
  singleton boolean primary key default true check (singleton),
  auto_update_enabled boolean not null default false,
  auto_announcement_enabled boolean not null default false,
  auto_rollback_enabled boolean not null default false,
  updated_by uuid references public.admin_accounts (id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.ops_config is
  'Read by the Saturday pipeline via the service role before doing anything irreversible. All flags default false -- see docs/adr/0007-scheduler-and-deployment-pipeline.md.';

insert into public.ops_config (singleton) values (true);

alter table public.ops_config enable row level security;

create policy "Admins can read ops config"
  on public.ops_config
  for select
  to authenticated
  using (public.is_admin ());

create policy "Admins can update ops config"
  on public.ops_config
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

-- No insert/delete policy for any client role: the one row is created by
-- this migration and never re-created or removed by application code.
revoke update on public.ops_config from authenticated;
grant update (auto_update_enabled, auto_announcement_enabled, auto_rollback_enabled, updated_by, updated_at)
  on public.ops_config to authenticated;

create trigger set_ops_config_updated_at
  before update on public.ops_config
  for each row
  execute function public.set_updated_at ();
