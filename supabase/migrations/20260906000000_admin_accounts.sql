-- Admin identity is a separate account kind from teacher_accounts, not an
-- extension of it. teacher_accounts.role is locked to 'teacher' by a CHECK
-- constraint, and its signup trigger is already keyed off metadata -- reusing
-- it here would conflate two account kinds the project never decided should
-- share a table. See docs/adr/0003-admin-authentication.md.

create table public.admin_accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admin_accounts is
  'Admin profile data. One row per auth.users row, created only by handle_new_admin() when signup metadata role = admin. There is no public admin signup route -- rows are created exclusively via apps/web/scripts/create-admin.ts, run out-of-band by an operator holding the service role key.';

alter table public.admin_accounts enable row level security;

create policy "Admins can read their own profile"
  on public.admin_accounts
  for select
  to authenticated
  using (auth.uid () = id);

create policy "Admins can update their own profile"
  on public.admin_accounts
  for update
  to authenticated
  using (auth.uid () = id)
  with check (auth.uid () = id);

-- No insert/delete policy for any client role: rows are created only by the
-- trigger below, and never deleted by application code.

revoke update on public.admin_accounts from authenticated;
grant update (name) on public.admin_accounts to authenticated;

create function public.handle_new_admin ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'role', '') <> 'admin' then
    return new;
  end if;

  insert into public.admin_accounts (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email
  );
  return new;
end;
$$;

-- A second trigger on the same event/table as on_auth_user_created
-- (teacher_accounts). Each guards on a disjoint role value, so exactly one of
-- them ever inserts a profile row for a given signup.
create trigger on_auth_user_created_admin
  after insert on auth.users
  for each row
  execute function public.handle_new_admin ();

create trigger set_admin_accounts_updated_at
  before update on public.admin_accounts
  for each row
  execute function public.set_updated_at ();

-- The one check every other admin table's RLS policy calls. Unlike
-- is_class_teacher(p_class_id), there is no per-row target to check against --
-- "is the current session an active admin" does not vary per row -- so this
-- takes no argument and reads auth.uid() directly.
create function public.is_admin ()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_accounts a
    where a.id = auth.uid ()
      and a.is_active
  );
$$;

revoke execute on function public.is_admin () from public;
grant execute on function public.is_admin () to authenticated;
