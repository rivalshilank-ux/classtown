# Seasons & Weather

## Status

Planned. No season, weather, or in-game time system exists in the code
today.

## Purpose

Record seasons/weather as a planned direction without inventing a design
that hasn't been decided.

## Architecture

Not designed.

## Current Implementation

None. `TownRoomState` has no time-of-day, weather, or season field.

## Planned

- In-game weather and season state, controllable from
  [`../admin/admin.md`](../admin/admin.md).
- Interaction with [`events.md`](./events.md) — not yet specified.

## Security

Weather/time state, once designed, must be a server-authoritative value
broadcast to clients, never client-set, per
[`../security/security.md`](../security/security.md).

## Testing

None yet.

## Related Documents

- [`events.md`](./events.md)
- [`../admin/admin.md`](../admin/admin.md)
