# Events

## Status

Planned. No in-game event system exists in the code today.

## Purpose

Record an event system as a planned direction without inventing a design
that hasn't been decided.

## Architecture

Not designed.

## Current Implementation

No runtime behavior. `packages/shared-schema/src/events/types.ts` defines
TypeScript types only — `GameEventCategory`
(`surprise` | `class_meme` | `seasonal` | `weather` | `cooperative`),
`GameEventTrigger` (`admin_manual` | `schedule` | `condition`), and
`GameEventDefinition` — plus an `eventRegistry` constant that is
currently an empty array. Nothing in `apps/game-server` or `apps/web`
reads `eventRegistry` or constructs a `GameEventDefinition` — these types
exist as a forward-declared shape, not a working feature.

## Planned

- Server-triggered or admin-triggered in-game events (see
  [`../admin/admin.md`](../admin/admin.md)).
- Interaction with [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)
  (event cheats, for eligible accounts only) and
  [`seasons.md`](./seasons.md).

## Security

Event triggering, once designed, must be a server-side, authorization-checked
decision, per [`../security/security.md`](../security/security.md).

## Testing

None yet.

## Related Documents

- [`seasons.md`](./seasons.md)
- [`../admin/admin.md`](../admin/admin.md)
- [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)
