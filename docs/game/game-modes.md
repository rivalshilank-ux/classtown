# Game Modes

## Status

Planned. `TownRoom` is currently the only room type and has no concept
of a "mode" — every joined player gets the same movement-only behavior.

## Purpose

Record that multiple game modes (including a Cheat Mode, referenced from
[`cheat-system.md`](./cheat-system.md) and
[`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)) are a
planned direction, without inventing specifics that haven't been decided.

## Architecture

Not designed. Whether modes are separate Colyseus room types, a state
flag on `TownRoomState`, or something else has not been decided.

## Current Implementation

None.

## Planned

- A distinct **Cheat Mode**, in which cheat commands are available to
  eligible accounts (see [`cheat-system.md`](./cheat-system.md) and
  [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md) for the
  concrete access-control direction already decided for the underlying
  cheat tool).
- Any other mode beyond normal play — not yet specified.

## Security

Whatever gates a player into a given mode must be a server-side decision,
never a client-side flag, consistent with
[`../security/security.md`](../security/security.md).

## Testing

None yet.

## Related Documents

- [`game-design.md`](./game-design.md)
- [`cheat-system.md`](./cheat-system.md)
- [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)
