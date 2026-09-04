# Cheat System (In-Game)

## Status

Planned. No cheat command, cheat state, or cheat-eligible account flag
exists in the game server today.

## Purpose

Distinguish the **in-game side** of cheats (a Cheat Mode a room can be in,
and the effect a cheat command has on `TownRoomState`) from the
**standalone Cheat Tool** that issues those commands, which is documented
separately in [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)
because it is treated as its own client surface (Web Cheat Tool,
browser extension, desktop tool), not part of `packages/game-client`.

## Architecture

Not designed on the game-server side. The concrete access-control
direction already given — that the server, not any client, must be the
sole authority on cheat eligibility, and that regular players cannot use
it — is recorded in
[`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md) and applies
here identically.

## Current Implementation

None. `TownRoom` has no cheat-related message handler.

## Planned

- Player cheats, world cheats, event cheats, and economy cheats — as
  categories of command the Cheat Tool would send to the game server.
  See [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md) for
  the full breakdown.
- Usable both in normal rooms and in a dedicated Cheat Mode (see
  [`game-modes.md`](./game-modes.md)) — not exclusive to either.

## Security

The client must never decide cheat authorization — the server validates
it. See [`../security/security.md`](../security/security.md) and
[`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md).

## Testing

None yet.

## Related Documents

- [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)
- [`game-modes.md`](./game-modes.md)
