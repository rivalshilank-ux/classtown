-- The game server's only source of student identity. The browser is handed a
-- ticket id and nothing else; class and participant are read from this row at
-- consume time, never from the client's join payload.
create table public.join_tickets (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null
    references public.student_participants (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.join_tickets is
  'Single-use, short-lived authorization to join a Colyseus room as one participant. Chosen over a signed JWT so single use is an atomic UPDATE ... WHERE consumed_at IS NULL rather than a hand-rolled replay cache, and so no second shared secret has to be distributed to the game host.';

comment on column public.join_tickets.consumed_at is
  'NULL means unused. Consumption is UPDATE ... SET consumed_at = now() WHERE id = $1 AND consumed_at IS NULL AND expires_at > now() RETURNING -- the second attempt returns no row.';

-- Consumption is a primary-key lookup; this index exists for the pruning job.
create index join_tickets_expires_idx on public.join_tickets (expires_at);

alter table public.join_tickets enable row level security;

-- No policy for any client role. Both ends of this table are trusted server
-- code holding the service role, which bypasses RLS entirely.
revoke all on public.join_tickets from authenticated, anon;
