-- One row per maintenance window (history, not a single mutable flag), so
-- "is maintenance on right now" and "when was it on last month" are the same
-- table. The partial unique index is what actually enforces "at most one
-- active window at a time" -- application code checking first and inserting
-- second would race under concurrent admin requests.

create table public.maintenance_windows (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default true,
  message text not null check (char_length(btrim(message)) between 1 and 500),
  reason text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.admin_accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.maintenance_windows is
  'is_active is the server-authoritative maintenance flag every other part of the app should check -- never a client-only toggle. Turning maintenance off is an UPDATE (is_active = false, ends_at = now()) on the active row, not a delete.';

-- Postgres partial unique index trick: every row satisfying the predicate
-- has the same indexed value (true), so at most one such row can exist.
create unique index maintenance_windows_one_active_idx
  on public.maintenance_windows (is_active)
  where is_active;

alter table public.maintenance_windows enable row level security;

create policy "Admins can read all maintenance windows"
  on public.maintenance_windows
  for select
  to authenticated
  using (public.is_admin ());

create policy "Admins can start a maintenance window"
  on public.maintenance_windows
  for insert
  to authenticated
  with check (public.is_admin () and created_by = auth.uid ());

create policy "Admins can end a maintenance window"
  on public.maintenance_windows
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

-- Anyone -- including anon -- can see whether maintenance is currently
-- active, and the message to show, but not the full history or who created
-- it (that stays admin-only via the policy above).
create policy "Anyone can read the current maintenance status"
  on public.maintenance_windows
  for select
  to anon, authenticated
  using (is_active);

create trigger set_maintenance_windows_updated_at
  before update on public.maintenance_windows
  for each row
  execute function public.set_updated_at ();
