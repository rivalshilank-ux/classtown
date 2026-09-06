-- Phase 3.5 finding, verified against a real local Supabase instance: the
-- "Anyone can read ..." policies added in 20260906040000/20260906050000 are
-- ROW-level policies. RLS does not restrict which columns a query can ask
-- for -- `select=*` against the anon key returned the full row, including
-- created_by (an admin's auth.users id) and maintenance_windows.reason,
-- neither of which apps/web's own queries ever asked for. Relying on "the
-- app only selects two columns" is not a real boundary: any client holding
-- the anon key (which is meant to be public) could call PostgREST directly.
--
-- Fix: replace the row-policy-based public read path with a narrow
-- `security definer` function that returns only the columns that should
-- ever be public, the same pattern already used for join_class/
-- consume_join_ticket. The admin-only "read everything" policies are
-- untouched -- only the anon/authenticated-facing path changes.

drop policy "Anyone can read published, unexpired announcements" on public.system_announcements;

drop policy "Anyone can read the current maintenance status" on public.maintenance_windows;

create function public.get_latest_published_announcement ()
returns table (id uuid, title text, body text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.id, a.title, a.body
  from public.system_announcements a
  where a.status = 'published'
    and (a.expires_at is null or a.expires_at > now())
  order by a.published_at desc nulls last
  limit 1;
$$;

comment on function public.get_latest_published_announcement () is
  'The only public read path onto system_announcements. Returns at most one row and never created_by/status/scheduled_at/expires_at/timestamps -- expiry is applied here, in SQL, not left to application code to filter after the fact.';

revoke execute on function public.get_latest_published_announcement () from public;
grant execute on function public.get_latest_published_announcement () to anon, authenticated;

create function public.get_active_maintenance_notice ()
returns table (message text, starts_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.message, m.starts_at
  from public.maintenance_windows m
  where m.is_active
  limit 1;
$$;

comment on function public.get_active_maintenance_notice () is
  'The only public read path onto maintenance_windows. Never returns reason, created_by, or history -- those stay behind the admin-only "Admins can read all maintenance windows" policy.';

revoke execute on function public.get_active_maintenance_notice () from public;
grant execute on function public.get_active_maintenance_notice () to anon, authenticated;
