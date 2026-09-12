# Tutorial

## Status

In Progress. A minimal one-screen help overlay is Implemented, covering
"basic controls," "interaction," and "multiplayer" below by pointing at
mechanics `interaction.md` already implements; a guided step-by-step
onboarding flow ("missions," scripted rewards) is still Planned.

## Purpose

Record the onboarding principles the tutorial is meant to follow, so a
future implementation has a stated direction instead of starting from
nothing.

## Architecture

Entirely client-side, in `apps/web/app/play/` — no room message, no
schema, no persisted state. `HelpOverlay.tsx` is a static card;
`GameCanvas.tsx` decides when to show it and never sends anything to
`TownRoom` because of it.

## Current Implementation

- `HelpOverlay` — a dismissible card shown once a new player's connection
  reaches `"joined"`, listing controls (arrow keys/WASD), the interact key
  (E) next to the interaction markers already visible in the world (see
  [`interaction.md`](./interaction.md)), a one-line note that other
  players share the space, and the discovery-tour objective. Content is
  static text today — deliberately not "learn by playing" yet (no
  scripted first action is required or detected).
- "Seen" is tracked with a `sessionStorage` flag
  (`apps/web/src/lib/student/tutorial.ts`), not a database column: a
  fresh tab (or the next class period) simply shows it again. There is
  nothing here for a server to enforce, matching the Security section
  below unchanged.
- A persistent "❓" button next to the leave button in `GameCanvas.tsx`
  reopens the same overlay at any time — covers "Help / Game Guide" and
  "Tutorial replay" below without a second screen.

## Planned

Everything below is direction only — no UI, API, or data model decided:

- **Learn by playing** — teach mechanics through guided action (e.g.
  detecting the player's first successful move or interact), not a
  static card read once.
- **Contextual tutorial** — introduce a mechanic at the moment it
  becomes relevant rather than all at once up front, the way the current
  overlay does.
- **Missions** — small guided objectives during onboarding, distinct
  from just pointing at the existing discovery tour.
- **Rewards** — positive reinforcement for completing onboarding steps
  specifically (as opposed to the discovery tour's own existing
  feedback, which the overlay only references).

## Security

Not applicable yet — no server-side state is implied by the current
overlay, and none is planned for it. If a future step (a scripted
mission, a reward) ever gates something real, that gate must be enforced
server-side per [`../security/security.md`](../security/security.md).

## Testing

`apps/web/src/lib/student/tutorial.test.ts` covers the seen-flag helper
(including sessionStorage being unavailable, e.g. private mode).
`HelpOverlay`/`GameCanvas` have no dedicated component test — no React
component anywhere in `apps/web` does today; testing here stops at
server actions and plain-function helpers.

## Related Documents

- [`game-design.md`](./game-design.md)
- [`game-modes.md`](./game-modes.md)
