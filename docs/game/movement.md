# Movement

## Status

Implemented.

## Purpose

Player movement inside a `TownRoom`, and the client/server split that
keeps the server as the sole authority over position.

## Architecture

```
KeyboardInput (browser events)
   → TownScene reads current input state each frame
   → sendMoveIntent() validates { dx, dy } with moveIntentSchema (Zod)
   → Colyseus "move" message → TownRoom.onMessage("move")
   → TownRoom re-validates with moveIntentSchema server-side
   → stored as the latest intent for that sessionId
   → on each simulation tick (20/sec), TownRoom.movePlayers() advances
     PlayerState.x/y for every player using their latest intent
   → @colyseus/schema broadcasts the updated state to every client
   → TownScene renders PlayerState.x/y — it never sets position itself
```

## Current Implementation

- `dx`/`dy` are each clamped to `[-1, 1]` by `moveIntentSchema`
  (`packages/shared-schema/src/messages.ts`); a diagonal intent is
  normalized to unit length before being scaled by `MOVE_SPEED` (4
  units/second) and `deltaSeconds`.
- The server (`apps/game-server/src/rooms/TownRoom.ts`) is the only code
  that writes `PlayerState.x` / `PlayerState.y`. The client only ever
  sends an intent and renders whatever state it receives back.
- A message that fails `moveIntentSchema.safeParse` (wrong shape, out of
  range) is dropped silently — the player's stored intent is simply not
  updated for that message.
- On join, a player's intent starts at `{ dx: 0, dy: 0 }` (stationary)
  until the client sends its first real intent.
- On leave, both the player's `PlayerState` and its stored intent are
  removed.
- Collision against the campus map (see [`map.md`](./map.md)) is
  server-authoritative: `TownRoom.canOccupy()` checks the four corners of
  the player's collision box (`PLAYER_RADIUS - 2`, slightly smaller than
  the visual radius) against `isSolidAtPixel()` before committing a move.
  X and Y are resolved as two independent axis checks, so a player slides
  along a wall instead of stopping dead on a diagonal collision.
- There is no per-player speed variation — every player moves at the same
  `MOVE_SPEED`.

## Planned

- Any speed modifier tied to items, cheats, or game modes.

## Security

The server never trusts a client-sent position, only a bounded intent,
and re-validates that intent independently of client-side validation.
See [`../security/security.md`](../security/security.md).

## Testing

`apps/game-server/src/rooms/TownRoom.test.ts` covers: normal movement,
invalid input (out-of-range and malformed messages are dropped),
authoritative position (client-claimed position is never trusted),
stopping at a solid wall, and multi-client synchronization.
`packages/game-client/src/moveSender.test.ts` covers client-side intent
validation.

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`map.md`](./map.md)
- [`game-design.md`](./game-design.md)
