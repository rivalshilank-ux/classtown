# ClassTown Messenger

## Status

Planned. No messenger service, friend-list, or account-level chat
exists in the code today. This repository (`classtown`) currently
contains only the game and its teacher-facing web app — no messenger
code lives here yet.

**Exception:** `apps/game-server`'s `TownRoom` broadcasts a minimal,
ephemeral in-room chat (`chat` / `chat_rejected` messages — see
`packages/shared-schema/src/messages.ts`), and `apps/web/app/play`
renders it as an overlay panel. This was added deliberately, as the
smallest thing that lets students talk to each other in a room during
an MVP play session: no persistence, no history, no identity beyond
"whoever is currently in this room," and no account/friend/DM concept.
It is not the Messenger described below and does not evolve into it —
when the real Messenger service is built, this in-room broadcast stays
(or is replaced) independently, on its own trust boundary.

## Purpose

Record that ClassTown Messenger is planned as an **independent service**
from the game, not a chat widget bolted onto `apps/web` or the game
server, so future work isn't misdirected into building it as a game
feature.

## Architecture

```
ClassTown Game  ──(optional integration)──>  ClassTown Messenger
```

The two are separate products. The game does not depend on the
messenger to function, and the messenger is not scoped to game sessions
— it is its own service with its own account model. The nature of the
"optional integration" (e.g. shared identity, in-game notifications from
messenger events) is not yet decided.

## Current Implementation

None.

## Planned

Planned surface areas (names only — no schema, API, or UI decided):

- Account / profile (messenger-specific, not assumed to be the same
  account system as `teacher_accounts` — see
  [`../teacher/teacher.md`](../teacher/teacher.md) — until an integration
  decision says otherwise).
- Friends.
- Groups.
- Chat.
- Notifications.
- Permissions.
- A developer space.
- A beta-player space.

## Security

Not designed. Once designed, it must not assume it can read or write
`apps/web`'s Supabase project without an explicit, reviewed integration
decision — the two services start from separate trust boundaries.

## Testing

None yet.

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../teacher/teacher.md`](../teacher/teacher.md)
