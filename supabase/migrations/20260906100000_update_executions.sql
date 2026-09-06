-- One row per attempt at carrying out an update_plans row. A plan can, in
-- principle, be attempted more than once (a failed run, retried later), so
-- this is a separate table rather than columns bolted onto update_plans.
create table public.update_executions (
  id uuid primary key default gen_random_uuid(),
  update_plan_id uuid not null references public.update_plans (id) on delete cascade,
  state public.update_state not null default 'planned',
  precheck_result jsonb,
  test_result jsonb,
  build_result jsonb,
  health_check_result jsonb,
  -- The pre-update checkpoint: what to point back at if something needs a
  -- human to sort out later. Not a database backup -- see
  -- docs/adr/0007-scheduler-and-deployment-pipeline.md for why this project
  -- doesn't claim to have one.
  checkpoint_commit_sha text,
  checkpoint_deployment_id text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.update_executions is
  'Written only by the Saturday pipeline under the service role. Never by any client -- an admin can watch, never edit, a run in progress.';

create index update_executions_plan_idx on public.update_executions (update_plan_id, created_at desc);

alter table public.update_executions enable row level security;

create policy "Admins can read all update executions"
  on public.update_executions
  for select
  to authenticated
  using (public.is_admin ());

-- No insert/update policy for any client role: only the pipeline
-- (service role, bypasses RLS) ever writes here.
