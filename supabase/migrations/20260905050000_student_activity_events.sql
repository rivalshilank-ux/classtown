create table public.student_activity_events (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null
    references public.student_participants (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  event_type public.activity_event_type not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

comment on table public.student_activity_events is
  'Append-only feed of discrete, teacher-visible milestones. Movement, position and presence heartbeats are never written here. Roughly two rows per student per session.';

comment on column public.student_activity_events.class_id is
  'Denormalized from the participant. Removes a join from both the RLS check and the dashboard feed query, and an event cannot change class after the fact, so there is no update anomaly to guard.';

comment on column public.student_activity_events.payload is
  'Known keys only (e.g. xp_delta). Never free text -- this table must not become a place where personal data accumulates.';

-- Matches the feed query exactly, ordering included.
create index student_activity_events_class_time_idx
  on public.student_activity_events (class_id, occurred_at desc);

alter table public.student_activity_events enable row level security;

create policy "Teachers read activity in their own classes"
  on public.student_activity_events
  for select
  to authenticated
  using (public.is_class_teacher (class_id));

-- Written only by the game server under the service role.
revoke insert, update, delete on public.student_activity_events from authenticated, anon;
