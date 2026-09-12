-- Teacher-to-class announcements, delivered live into the shared TownRoom.
--
-- This is not a chat log and not a notification inbox: a row here is a
-- one-shot message the game server (service_role, bypasses RLS) polls for
-- and delivers to whichever of that class's students are currently
-- connected, then marks delivered_at. A student who is offline when it is
-- sent simply never receives it -- there is no re-delivery on reconnect and
-- no client-facing read of this table at all (see
-- apps/game-server/src/persistence/supabasePersistence.ts).
--
-- authenticated gets its baseline select/insert from
-- 20260906130000_grant_baseline_authenticated_access.sql's default
-- privilege (this table is created after that ALTER DEFAULT PRIVILEGES, by
-- the same `postgres` role); service_role gets full DML the same way from
-- 20260906133000_grant_service_role_table_access.sql. Neither needs an
-- explicit grant here.
create table public.class_announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 280),
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

comment on table public.class_announcements is
  'A teacher-authored message delivered once, live, into TownRoom to just that class''s connected students. Not a chat log; see docs/teacher/teacher.md.';

-- The game server's poll is "pending rows for these classIds" -- this is
-- the only query pattern that runs against the table, so it is the only
-- index it needs.
create index class_announcements_pending_idx
  on public.class_announcements (class_id)
  where delivered_at is null;

alter table public.class_announcements enable row level security;

create policy "Teachers create announcements for their own classes"
  on public.class_announcements
  for insert
  to authenticated
  with check (public.is_class_teacher (class_id));

create policy "Teachers read their own classes' announcements"
  on public.class_announcements
  for select
  to authenticated
  using (public.is_class_teacher (class_id));

-- No update/delete policy for a teacher: delivery is marked only by the
-- game server's service role (which bypasses RLS entirely), and there is no
-- edit/retract-a-sent-announcement feature. The baseline default privilege
-- above never granted authenticated UPDATE or DELETE on this table in the
-- first place, so this is enforced at both layers, not just RLS.
