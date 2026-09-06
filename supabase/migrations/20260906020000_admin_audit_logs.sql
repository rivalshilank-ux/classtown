-- The audit trail every admin/AI/system action funnels through. Designed
-- generically now (action/target_type/target_id/risk_level/status/metadata)
-- so moderation, announcements, maintenance, AI Ops, deployment, and the
-- scheduler can all write into this same table later without a schema
-- change -- see docs/admin/admin.md.
--
-- Phase 2 only ever writes actor_type = 'admin' rows (admin login/logout),
-- via the record_audit_log() RPC below, which runs under the calling admin's
-- own session and always stamps actor_id from auth.uid() -- a client can
-- never supply an actor_id, so one admin cannot forge a log entry under
-- another admin's identity. 'system'/'ai' exist in the enum for the
-- server-only, no-session execution contexts described in
-- docs/admin/admin.md (the scheduler, AI Ops) -- those will INSERT directly
-- under the service role once they exist, rather than through this RPC,
-- since there is no admin session to authorize with. No code path uses them
-- yet.

create type public.audit_actor_type as enum ('admin', 'system', 'ai');

create type public.audit_risk_level as enum ('low', 'medium', 'high', 'critical');

create type public.audit_status as enum ('success', 'failed', 'pending');

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type public.audit_actor_type not null,
  actor_id uuid,
  action text not null check (char_length(btrim(action)) between 1 and 100),
  target_type text,
  target_id uuid,
  risk_level public.audit_risk_level not null default 'low',
  status public.audit_status not null default 'success',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.admin_audit_logs is
  'Append-only. Never write secrets, tokens, passwords, or API keys into metadata. Rows are created only by record_audit_log() (admin-session actions) or, in a later phase, directly by service-role code (system/AI actions) -- never by a raw client insert.';

create index admin_audit_logs_created_at_idx
  on public.admin_audit_logs (created_at desc);

alter table public.admin_audit_logs enable row level security;

create policy "Admins can read audit logs"
  on public.admin_audit_logs
  for select
  to authenticated
  using (public.is_admin ());

-- No insert/update/delete policy for any client role, and no client grant at
-- all: the table is written only through the security definer RPC below (for
-- admin actions) or the service role (for system/AI actions, once those
-- exist). It is never modified after insert and never deleted by application
-- code.

create function public.record_audit_log (
  p_action text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_risk_level public.audit_risk_level default 'low',
  p_status public.audit_status default 'success',
  p_metadata jsonb default '{}'::jsonb
)
returns public.admin_audit_logs
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.admin_audit_logs%rowtype;
begin
  if not public.is_admin () then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if coalesce(btrim(p_action), '') = '' then
    raise exception 'action is required' using errcode = '22023';
  end if;

  insert into public.admin_audit_logs (
    actor_type, actor_id, action, target_type, target_id, risk_level, status, metadata
  )
  values (
    'admin',
    auth.uid (),
    btrim(p_action),
    p_target_type,
    p_target_id,
    p_risk_level,
    p_status,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Mirrors create_class()'s explicit revoke-from-public-and-anon: is_admin()
-- inside the function is the real boundary (a non-admin's call raises), but
-- a writing RPC gets the same belt-and-suspenders grant as the other
-- write RPCs in this schema rather than relying on the internal check alone.
revoke execute on function public.record_audit_log (
  text, text, uuid, public.audit_risk_level, public.audit_status, jsonb
) from public, anon;

grant execute on function public.record_audit_log (
  text, text, uuid, public.audit_risk_level, public.audit_status, jsonb
) to authenticated;
