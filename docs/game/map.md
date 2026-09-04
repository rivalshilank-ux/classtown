# Map

## Status

Planned. No map data, tilemap, or boundary system exists in the code.
`TownRoom` currently has no concept of map bounds — a player can move to
any coordinate.

## Purpose

Record that a map system is a known gap, without inventing a design for
one that hasn't been decided.

## Architecture

Not designed.

## Current Implementation

None. `TownScene` (`packages/game-client/src/scenes/TownScene.ts`) renders
players on a plain background with no tile layer.

## Planned

- Map boundaries and collision, which [`movement.md`](./movement.md)
  currently has none of.
- Tile-based or scene-based layout — not decided.

## Security

Boundary/collision enforcement, once designed, must be validated
server-side in `TownRoom`, consistent with the server-authoritative
principle in [`../security/security.md`](../security/security.md) — a
client-side-only bounds check would not be trustworthy.

## Testing

None yet.

## Related Documents

- [`movement.md`](./movement.md)
- [`game-design.md`](./game-design.md)
