-- The approval queue for AI-proposed tool calls above LOW risk. This is
-- deliberately separate from admin_audit_logs: this table tracks a
-- *decision* (pending -> approved/rejected -> executed/failed), while
-- admin_audit_logs records the *action itself* once it actually happens
-- (written by the same handler function an admin clicking the same button
-- by hand would call -- see docs/adr/0005-ai-ops-tool-registry.md).

create type public.ai_execution_status as enum (
  'pending', 'approved', 'rejected', 'executed', 'failed'
);

create table public.ai_tool_executions (
  id uuid primary key default gen_random_uuid(),
  tool_name text not null check (char_length(btrim(tool_name)) between 1 and 100),
  risk_level public.audit_risk_level not null,
  input jsonb not null default '{}'::jsonb,
  status public.ai_execution_status not null default 'pending',
  requested_by uuid references public.admin_accounts (id) on delete set null,
  decided_by uuid references public.admin_accounts (id) on delete set null,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  executed_at timestamptz
);

comment on table public.ai_tool_executions is
  'A row here means the AI proposed a tool call above LOW risk and it is (or was) awaiting an admin decision. LOW-risk tool calls never appear here -- they execute inline and are never persisted (see docs/admin/admin.md).';

create index ai_tool_executions_status_idx
  on public.ai_tool_executions (status, created_at desc);

alter table public.ai_tool_executions enable row level security;

create policy "Admins can read all AI tool executions"
  on public.ai_tool_executions
  for select
  to authenticated
  using (public.is_admin ());

create policy "Admins can propose an AI tool execution"
  on public.ai_tool_executions
  for insert
  to authenticated
  with check (public.is_admin () and requested_by = auth.uid ());

create policy "Admins can decide a pending AI tool execution"
  on public.ai_tool_executions
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

-- Only the decision/result fields can change after creation -- tool_name,
-- input, risk_level and requested_by are what was actually proposed and
-- must stay exactly that for the approval to mean anything.
revoke update on public.ai_tool_executions from authenticated;
grant update (status, decided_by, decided_at, result, error, executed_at)
  on public.ai_tool_executions to authenticated;
