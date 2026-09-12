# Game Design

## Status

In Progress. This document is an index over the game-design documents;
most of what it links to is Planned.

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
| [`map.md`](./map.md) | Implemented |
| [`interaction.md`](./interaction.md) | Implemented |
| [`tutorial.md`](./tutorial.md) | In Progress |
| [`game-modes.md`](./game-modes.md) | Planned |
| [`cheat-system.md`](./cheat-system.md) | Planned |
| [`economy.md`](./economy.md) | Planned |
| [`inventory.md`](./inventory.md) | Planned |
| [`house.md`](./house.md) | Planned |
| [`events.md`](./events.md) | Planned |
| [`seasons.md`](./seasons.md) | Planned |

## Current Implementation

A single Colyseus room type, `TownRoom`, that admits joins via a
server-verified single-use ticket (never a client-supplied class code or
identity -- see [`../architecture/overview.md`](../architecture/overview.md)),
synchronizes server-authoritative player positions and facing direction
(see [`movement.md`](./movement.md)) over a bounded campus map (see
[`map.md`](./map.md)), and runs one complete gameplay loop -- the campus
discovery tour (see [`interaction.md`](./interaction.md)) -- introduced
to a new player by a static, client-only help overlay (see
[`tutorial.md`](./tutorial.md)).

## Planned

Everything else in the table above.

## Security

See [`../security/security.md`](../security/security.md).

## Testing

See [`movement.md`](./movement.md#testing) and
[`interaction.md`](./interaction.md#testing).

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../teacher/teacher.md`](../teacher/teacher.md)
