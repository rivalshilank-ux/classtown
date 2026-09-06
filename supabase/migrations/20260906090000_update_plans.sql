-- The state machine every weekly update (Sunday plan -> Saturday pipeline)
-- moves through. Shared between update_plans (the plan itself) and
-- update_executions (one attempt at carrying it out) so both always speak
-- the same vocabulary. States are never skipped by application code --
-- see apps/web/src/lib/deploy/pipeline.ts.
create type public.update_state as enum (
  'planned',
  'approved',
  'scheduled',
  'prechecking',
  'maintenance',
  'testing',
  'building',
  'deploying',
  'verifying',
  'completed',
  'failed',
  'rolling_back',
  'rolled_back',
  'cancelled'
);

create table public.update_plans (
  id uuid primary key default gen_random_uuid(),
  status public.update_state not null default 'planned',
  summary text not null check (char_length(btrim(summary)) between 1 and 2000),
  changes jsonb not null default '{}'::jsonb,
  risk_level public.audit_risk_level not null default 'low',
  -- 'system': the automated Sunday-evening check (service role, no session).
  -- 'ai': created on demand via the AI Ops create_update_plan tool.
  -- 'admin' exists for a possible future "create manually" action; nothing
  -- writes it yet.
  created_by_type public.audit_actor_type not null default 'system',
  scheduled_for timestamptz,
  approved_by uuid references public.admin_accounts (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.update_plans is
  'One row per weekly update cycle. Created by the Sunday scheduler (service role) or, on demand, by an admin approving the AI Ops create_update_plan tool. The Saturday pipeline (update_executions) only ever acts on a plan already approved -- see docs/adr/0007-scheduler-and-deployment-pipeline.md.';

create index update_plans_status_idx on public.update_plans (status, created_at desc);

alter table public.update_plans enable row level security;

create policy "Admins can read all update plans"
  on public.update_plans
  for select
  to authenticated
  using (public.is_admin ());

-- Lets an admin approve a create_update_plan tool proposal (see
-- ai_tool_executions) -- that path runs under the admin's own session, not
-- the service role, so it needs a real INSERT policy. The automated Sunday
-- job always uses the service role, which bypasses RLS regardless of any
-- policy here.
create policy "Admins can propose an update plan"
  on public.update_plans
  for insert
  to authenticated
  with check (public.is_admin ());

create policy "Admins can decide an update plan"
  on public.update_plans
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

-- Only the decision fields change from the client side; summary/changes/
-- risk_level/created_by_type describe what was actually proposed.
revoke update on public.update_plans from authenticated;
grant update (status, approved_by, approved_at) on public.update_plans to authenticated;

create trigger set_update_plans_updated_at
  before update on public.update_plans
  for each row
  execute function public.set_updated_at ();
