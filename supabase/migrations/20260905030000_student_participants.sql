create table public.student_participants (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  participant_code text not null
    check (participant_code ~ '^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$'),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 20),
  status public.participant_status not null default 'active',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (class_id, participant_code)
);

comment on table public.student_participants is
  'A student character sheet scoped to one class. Not a Supabase Auth user: students never authenticate and never hold a Supabase client, so every write here comes from trusted server code holding the service role.';

comment on column public.student_participants.nickname is
  'Display only. Deliberately not unique -- children collide on names constantly, and a unique constraint would turn a cosmetic clash into a join failure. Identity is id, or participant_code for re-entry.';

comment on column public.student_participants.last_seen_at is
  'Coarse presence, written on join, on leave, and on a ~60s batched heartbeat. Never written per movement packet.';

-- Serves the roster listing and both dashboard counts. last_seen_at needs no
-- index of its own: it is only ever filtered inside an already-narrow
-- per-class set that this index has produced.
create index student_participants_class_status_idx
  on public.student_participants (class_id, status);

create function public.is_participant_teacher (p_participant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.student_participants p
    join public.classes c on c.id = p.class_id
    where p.id = p_participant_id
      and c.teacher_id = auth.uid ()
  );
$$;

revoke execute on function public.is_participant_teacher (uuid) from public;
grant execute on function public.is_participant_teacher (uuid) to authenticated;

alter table public.student_participants enable row level security;

create policy "Teachers read their own class roster"
  on public.student_participants
  for select
  to authenticated
  using (public.is_class_teacher (class_id));

create policy "Teachers update their own class roster"
  on public.student_participants
  for update
  to authenticated
  using (public.is_class_teacher (class_id))
  with check (public.is_class_teacher (class_id));

-- No INSERT policy: participants are created by the join RPC or the teacher
-- roster RPC, both of which generate the participant code server-side.
-- No DELETE policy: removal is status = 'removed'.

-- A teacher may rename a student or remove one. They may not rewrite a
-- participant code or move a student into another class, so UPDATE is revoked
-- and re-granted over just those two columns.
revoke update on public.student_participants from authenticated;
grant update (nickname, status) on public.student_participants to authenticated;
