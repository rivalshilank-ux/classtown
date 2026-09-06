-- Admin-authored, site-wide announcements. created_by references
-- admin_accounts (not teacher_accounts) since only admins author these.

create type public.announcement_status as enum ('draft', 'scheduled', 'published', 'expired');

comment on type public.announcement_status is
  'scheduled -> published is a manual admin action today (create_announcement then publish_announcement) -- there is no scheduler yet to do it automatically at scheduled_at. See docs/admin/admin.md.';

create table public.system_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  status public.announcement_status not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.admin_accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.system_announcements is
  'A row past its expires_at stops being publicly visible via the read policy below regardless of status -- status="expired" is a separate, explicit admin action for retiring an announcement early, not the only way one stops showing.';

create index system_announcements_published_idx
  on public.system_announcements (published_at desc)
  where status = 'published';

alter table public.system_announcements enable row level security;

create policy "Admins can read all announcements"
  on public.system_announcements
  for select
  to authenticated
  using (public.is_admin ());

create policy "Admins can create announcements"
  on public.system_announcements
  for insert
  to authenticated
  with check (public.is_admin () and created_by = auth.uid ());

create policy "Admins can update announcements"
  on public.system_announcements
  for update
  to authenticated
  using (public.is_admin ())
  with check (public.is_admin ());

-- No delete policy: retiring an announcement is a status update
-- ("expired"), matching the archive-not-delete convention used by classes.

-- Everyone -- including anon, since students hold no Supabase session at all
-- -- can read a currently-published, unexpired announcement. This is the one
-- row shape teacher/student pages render; nothing else on this table is
-- reachable without is_admin().
create policy "Anyone can read published, unexpired announcements"
  on public.system_announcements
  for select
  to anon, authenticated
  using (status = 'published' and (expires_at is null or expires_at > now()));

create trigger set_system_announcements_updated_at
  before update on public.system_announcements
  for each row
  execute function public.set_updated_at ();
