-- Split from student_participants on write pattern, not tidiness. The roster is
-- read on every dashboard load and written rarely; XP is written every few
-- seconds of play. Keeping them apart means those updates do not churn row
-- versions in the table the dashboard scans.
create table public.student_progression (
  participant_id uuid primary key
    references public.student_participants (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  play_seconds integer not null default 0 check (play_seconds >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.student_progression is
  'Server-authoritative player progression. No client role holds any write grant here, and no endpoint accepts an XP value -- the only writer is the game server under the service role.';

create trigger set_student_progression_updated_at
  before update on public.student_progression
  for each row
  execute function public.set_updated_at ();

-- Created eagerly so every participant is guaranteed a progression row and the
-- dashboard's roster join never has to be an outer join.
create function public.handle_new_participant ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_progression (participant_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_student_participant_created
  after insert on public.student_participants
  for each row
  execute function public.handle_new_participant ();

alter table public.student_progression enable row level security;

create policy "Teachers read progression in their own classes"
  on public.student_progression
  for select
  to authenticated
  using (public.is_participant_teacher (participant_id));

-- Deliberately no INSERT, UPDATE or DELETE policy for any client role.
revoke insert, update, delete on public.student_progression from authenticated, anon;
