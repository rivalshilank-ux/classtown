# Tutorial

## Status

Planned. No onboarding flow, tutorial scene, or Game Guide exists in the
code today.

## Purpose

Record the onboarding principles the tutorial is meant to follow, so a
future implementation has a stated direction instead of starting from
nothing.

## Architecture

Not designed.

## Current Implementation

None. A new player joining `/play` today connects directly into
`TownRoom` with no onboarding step of any kind.

## Planned

Design principles for the eventual tutorial (direction only — no UI,
API, or data model decided yet):

- **Intuitive onboarding** — a new player should understand what to do
  without reading instructions first.
- **Learn by playing** — teach mechanics through guided action, not
  static text screens.
- **Contextual tutorial** — introduce a mechanic at the moment it becomes
  relevant, not all at once up front.
- **Basic controls** — movement and camera/interaction basics.
- **Interaction** — how a player interacts with objects/other players.
- **Missions** — small guided objectives during onboarding.
- **Rewards** — positive reinforcement for completing onboarding steps.
- **Multiplayer** — introducing the presence of other players.
- **Help / Game Guide** — an in-game reference a player can return to
  after onboarding ends.
- **Tutorial replay** — the ability to revisit the tutorial voluntarily.

## Security

Not applicable yet — no server-side state is implied by onboarding UI
alone. If tutorial completion ever gates a reward or unlock, that gate
must be enforced server-side per
[`../security/security.md`](../security/security.md).

## Testing

None yet.

## Related Documents

- [`game-design.md`](./game-design.md)
- [`game-modes.md`](./game-modes.md)
