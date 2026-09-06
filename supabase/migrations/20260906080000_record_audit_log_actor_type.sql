-- record_audit_log() has hardcoded actor_type = 'admin' since it was
-- created (20260906020000_admin_audit_logs.sql). audit_actor_type has
-- carried an unused 'ai' value since the same migration, reserved for
-- exactly this: AI Ops (Phase 4) auto-executing a LOW-risk tool needs to be
-- distinguishable in /admin/audit from an admin doing the same thing by
-- hand. Postgres function identity includes the parameter list, so adding a
-- trailing parameter means dropping and recreating rather than a plain
-- CREATE OR REPLACE -- this is a new migration, not an edit to the old one.
--
-- 'system' is deliberately not an accepted value here: this RPC only ever
-- runs under an authenticated admin session (is_admin() is still required
-- below), and 'system' is reserved for genuinely session-less service-role
-- inserts (the scheduler, once it exists) that don't go through this RPC at
-- all.

drop function public.record_audit_log (
  text, text, uuid, public.audit_risk_level, public.audit_status, jsonb
);

create function public.record_audit_log (
  p_action text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_risk_level public.audit_risk_level default 'low',
  p_status public.audit_status default 'success',
  p_metadata jsonb default '{}'::jsonb,
  p_actor_type text default 'admin'
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

  if p_actor_type not in ('admin', 'ai') then
    raise exception 'invalid actor_type' using errcode = '22023';
  end if;

  insert into public.admin_audit_logs (
    actor_type, actor_id, action, target_type, target_id, risk_level, status, metadata
  )
  values (
    p_actor_type::public.audit_actor_type,
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

revoke execute on function public.record_audit_log (
  text, text, uuid, public.audit_risk_level, public.audit_status, jsonb, text
) from public, anon;

grant execute on function public.record_audit_log (
  text, text, uuid, public.audit_risk_level, public.audit_status, jsonb, text
) to authenticated;
