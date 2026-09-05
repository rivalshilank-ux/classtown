# 0002: Classes, Student Participants, and the Join Ticket

## Status

Accepted — supersedes the "join code is validated only for length" gap noted in
[0001](./0001-teacher-authentication.md).

## Context

Teacher authentication landed in Phase 1, but nothing connected a teacher to a
class or a class to a student. The participant code a student typed was checked
for length and then discarded, so a teacher could not see their own students, and
`TownRoom.onAuth` accepted whatever nickname and join code the browser sent —
the client asserting its own identity.

## Decision

**Students are rows, not accounts.** A `student_participants` row is a character
sheet scoped to one class, addressed by a server-generated code. No email, no
password, no `auth.users` row. Asking primary-school children for credentials is
both a poor experience and a consent obligation the product does not need, and
Supabase anonymous auth would leave a permanent, unreaped `auth.users` row per
guest.

The consequence shapes everything else: with no `auth.uid()` for a student, RLS
cannot scope a row to "this student". So **students never talk to Supabase.** The
browser holds no privileged Supabase client; every student read and write goes
through trusted server code under the service role. The anon key in the browser
exists for teacher auth only.

**One owning teacher per class, behind a function.** `classes.teacher_id` is a
plain column, but no policy compares it to `auth.uid()` directly — every policy
calls `is_class_teacher()`. Co-teaching later becomes a change to one function
body rather than a rewrite of every policy. The helper is `security definer`
because a `security invoker` function selecting from `classes`, called from a
policy on `classes`, recurses until the statement aborts.

**A participant belongs to exactly one class, by column.** Not a membership join
table: a participant is born inside a class, its code is unique only within that
class, and a child in two classes sensibly has two characters. Transfer is
modelled as a new participant plus `status = 'transferred'` on the old one, which
preserves history as a side effect rather than through a separate mechanism.

**Colyseus trusts a ticket, never client fields.** The join flow validates the
class code and participant in one transaction inside `join_class()`, mints a
single-use `join_tickets` row with a 120-second life, and hands the browser only
that ticket id. `onAuth` exchanges it via `consume_join_ticket()` and takes the
identity from the returned row. A ticket is a database row rather than a signed
JWT so single use is an atomic `UPDATE … WHERE consumed_at IS NULL RETURNING`
instead of a hand-rolled replay cache, and so no second shared secret has to be
distributed to the game host.

**A participant code, in either join mode, means "I already exist here."**
Creating a participant is only the fallback for a first entry with no code. This
is what lets a student come back as the same character after their ticket is
spent, instead of accumulating a new participant per session.

**Presence is derived, not stored live.** The game server writes `last_seen_at`
on join, on leave, and on a batched per-room heartbeat; "online" is
`last_seen_at > now() - 2 minutes` at query time. Movement is never persisted.

**Nothing a teacher clicks issues a `DELETE`.** Classes archive, students get
`status = 'removed'`. Below that line foreign keys cascade, which is safe only
because no user-reachable path hard-deletes a class.

## Consequences

- A shared device is a shared identity. Whoever holds the participant code is
  that student. This is acceptable inside a supervised classroom and is the
  explicit cost of not having student accounts; it belongs in teacher-facing
  copy rather than being engineered around.
- The game server now depends on Supabase at join time. A database outage blocks
  new joins, though it does not disturb players already in a room.
- Presence lags by up to two minutes, and a tab closed uncleanly reads as online
  for that long.
- `student_activity_events` grows unbounded until a retention job exists. At
  roughly two rows per student-session that is slow, but it should land before
  the first large deployment.
- Per-zone occupancy ("12 in the library") has no data source: zones are a
  Colyseus concept and the design deliberately keeps room state out of Postgres.
  It needs a presence endpoint on the game server, so the dashboard shows a
  roster instead of inventing the number.
