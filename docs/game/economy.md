# Economy

## Status

Planned. `PlayerState` has a `score` field
(`packages/shared-schema/src/game-state.schema.ts`) but nothing in the
code reads or writes it today — it is not a currency system, just an
unused field reserved on the schema.

## Purpose

Record that an economy is a planned direction without describing the
unused `score` field as if it already were one.

## Architecture

Not designed.

## Current Implementation

None functionally. `PlayerState.score` exists on the schema, defaults to
`0`, and is never modified.

## Planned

- A real currency/points system — no design decided yet.
- Interaction with [`inventory.md`](./inventory.md) (purchases) and
  [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md) (economy
  cheats, for eligible accounts only).

## Security

Any future economy mutation must happen server-side only, per
[`../security/security.md`](../security/security.md) — a client must
never be able to set its own score/currency directly, the same principle
already enforced for position in [`movement.md`](./movement.md).

## Testing

None yet.

## Related Documents

- [`inventory.md`](./inventory.md)
- [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)
