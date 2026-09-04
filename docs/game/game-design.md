# Game Design

## Status

In Progress. This document is an index over the game-design documents;
most of what it links to is Planned. Only movement is Implemented.

## Purpose

Give a single entry point into ClassTown's gameplay design, and make
clear at a glance how little of it is built versus how much is direction
recorded for later phases.

## Architecture

See [`../architecture/overview.md`](../architecture/overview.md) for the
Colyseus/Phaser split. Gameplay design documents:

| Document | Status |
|---|---|
| [`movement.md`](./movement.md) | Implemented |
| [`map.md`](./map.md) | Planned |
| [`tutorial.md`](./tutorial.md) | Planned |
| [`game-modes.md`](./game-modes.md) | Planned |
| [`cheat-system.md`](./cheat-system.md) | Planned |
| [`economy.md`](./economy.md) | Planned |
| [`inventory.md`](./inventory.md) | Planned |
| [`house.md`](./house.md) | Planned |
| [`events.md`](./events.md) | Planned |
| [`seasons.md`](./seasons.md) | Planned |

## Current Implementation

A single Colyseus room type, `TownRoom`, that accepts joins with a
`{ joinCode, nickname }` pair (the join code is validated for shape only,
not resolved against any real room registry) and synchronizes
server-authoritative player positions. See [`movement.md`](./movement.md).

## Planned

Everything else in the table above.

## Security

See [`../security/security.md`](../security/security.md).

## Testing

See [`movement.md`](./movement.md#testing).

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../teacher/teacher.md`](../teacher/teacher.md)
