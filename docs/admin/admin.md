# Admin Features

## Status

Planned. No admin role, admin page, or admin API exists in the code
today. `public.teacher_accounts.role` is a text column constrained by a
`check (role = 'teacher')` — it cannot currently hold an `admin` value
without a migration.

## Purpose

Record the intended scope of administrative capability so it isn't
designed ad hoc later, without pretending any of it exists yet.

## Architecture

Not designed. Whether admin functionality lives inside `apps/web`, a
separate app, or as elevated teacher permissions has not been decided.

## Current Implementation

None.

## Planned

- **Room monitoring** — observing active `TownRoom` sessions from an
  administrative view.
- **Player management** — viewing/removing participants from a session.
- **Events** — triggering the planned in-game event system (see
  [`../game/events.md`](../game/events.md)) from an admin surface.
- **Weather / time** — controlling the planned weather/season and
  in-game time systems (see [`../game/seasons.md`](../game/seasons.md)).
- **Moderation** — handling reports, mutes, kicks, or bans.
- **Operations** — surfacing the operational tooling described in
  [`../operations/operations.md`](../operations/operations.md) (health,
  maintenance status) to a human operator.
- **Audit log** — a record of administrative and cheat-tool actions (see
  [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)).

## Security

Not designed. Whatever authorization model is chosen must follow the
same server-authoritative principle already in place for gameplay state
(see [`../security/security.md`](../security/security.md)): the client
must never be the party that decides whether an action is authorized.

## Testing

None yet.

## Related Documents

- [`../teacher/teacher.md`](../teacher/teacher.md)
- [`../security/security.md`](../security/security.md)
- [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)
