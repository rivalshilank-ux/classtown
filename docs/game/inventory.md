# Inventory

## Status

Planned. No inventory data model, item schema, or item state exists in
the code today.

## Purpose

Record inventory as a planned direction without inventing an item schema
that hasn't been decided.

## Architecture

Not designed.

## Current Implementation

None. `PlayerState` has no item-related field.

## Planned

- Item ownership per player.
- Interaction with [`economy.md`](./economy.md) (acquiring items) and
  [`house.md`](./house.md) (placing items).

## Security

Item grants/removals, once designed, must be a server-side decision, per
[`../security/security.md`](../security/security.md).

## Testing

None yet.

## Related Documents

- [`economy.md`](./economy.md)
- [`house.md`](./house.md)
