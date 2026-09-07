# Map

## Status

Implemented. A single fixed campus map exists, covered by the collision
tests in [`movement.md`](./movement.md). Zones, named spawn points, and
interaction points are defined as data but not yet consumed by any
system (see Planned).

## Purpose

Give `TownRoom` a bounded, walkable world — a school campus — instead of
an open plane, and give future systems (NPCs, quests, events) stable
named locations to attach to.

## Architecture

```
packages/shared-schema/src/world/campusMap.ts
   TILE_SIZE / MAP_COLS / MAP_ROWS       — grid dimensions (48x36 @ 32px)
   TileType                              — one tag per tile (wall, floor,
                                            desk, water, gate, ...)
   buildGrid()                           — hand-authored TileType[][],
                                            built once at module load
   tileTypeAt(col,row) / isSolidAtPixel(x,y)
                                          — read-only grid + solidity
                                            queries, pixel or tile space
   ZONES / zoneAt(col,row)               — named rectangular regions
   SPAWN_POINTS / INTERACTION_POINTS     — named points inside a zone
   LANDMARKS                             — label + position, rendered
                                            as floating text only
   SPAWN_POINT                           — the one spawn TownRoom uses
                                            today (school.plaza)

apps/game-server/src/rooms/TownRoom.ts
   canOccupy(x,y) → isSolidAtPixel() at all 4 corners of the player's
   collision box — see [`movement.md`](./movement.md) for how this
   gates each axis of movement.

packages/game-client/src/scenes/TownScene.ts
   Renders the whole grid once into a single generated texture
   (TILE_FILL color + a small prop per tile type), then draws
   LANDMARKS as floating text on top. Camera is zoomed 2x on the local
   player so the map reads as a place to explore rather than something
   fully visible at a glance.

packages/game-client/src/characterSprite.ts
   Player characters are drawn procedurally (Phaser Graphics ->
   generated texture), the same technique used for the tiles above --
   no image assets exist in the repo. A fixed 6-color shirt palette is
   hashed from sessionId so players are visually distinguishable
   without a real cosmetics system. Each palette color gets 4 directions
   x 2 frames (idle/neutral and a stepped "walk" pose); TownScene swaps
   frames while a player is moving (see [`movement.md`](./movement.md)).
```

## Current Implementation

The map is one school campus, 48x36 tiles (1536x1152px), fenced on all
four edges. It has:

- A **main building** (`school.main-building`) with a teacher room, two
  classrooms (A/B either side of a central hall), doors as gaps in the
  wall outline.
- A **library**, **science room**, and **music room** in a west wing,
  each with room-appropriate solid props (`shelf`, `lab_table`,
  `piano`) and connected by a shared path.
- A **cafeteria** (`counter` + `desk` tiles) and a **playground**
  (`track` outline + `goal` tiles) east of the plaza.
- A **central plaza**, an **event lawn** (`stage` tiles), a **gate** at
  the south edge, and a small **park** with a pond.
- 17 `TileType`s total; solidity is a fixed set
  (`wall`, `tree`, `fence`, `water`, `counter`, `desk`, `shelf`,
  `lab_table`, `piano`, `goal`, `stage`) — everything else
  (`grass`, `floor`, `plaza`, `path`, `gate`, `track`) is walkable.
- `ZONES`: 14 named rectangular regions, one per room/outdoor area.
  Zones nest (e.g. `school.classroom-a` sits entirely inside
  `school.main-building`'s bounding box), so `zoneAt()` returns the
  smallest matching zone rather than the first one found in the array —
  otherwise every point inside a sub-room would resolve to the
  containing zone instead.
- `SPAWN_POINTS` / `INTERACTION_POINTS`: named points, each pinned to a
  zone. Populated but inert — nothing reads `InteractionPointType` or
  picks among the named `SPAWN_POINTS` yet. `TownRoom` spawns every
  player near the single `SPAWN_POINT` (`school.plaza`): each join picks
  a random point within a 48px radius of it and re-rolls (up to 8 times)
  if that point lands on a solid tile, falling back to the exact spawn
  point otherwise. This keeps everyone arriving in the same gathering
  spot — the goal is players meeting each other, not scattering them
  across campus — while stopping simultaneous joiners from stacking on
  the exact same pixel. See `pickSpawnPosition()` in
  `apps/game-server/src/rooms/TownRoom.ts`.
- Every zone is reachable on foot from `SPAWN_POINT` — there is no
  isolated room.

## Planned

- A system that actually reads `ZONES` / `INTERACTION_POINTS` (NPCs,
  quests, events) — the data exists so that system doesn't need a new
  location structure of its own.
- Picking among the named `SPAWN_POINTS` themselves (e.g. per-class or
  per-event spawn zone) — today they're jittered around one point, not
  yet selected between.
- Per-classroom ownership (which class "owns" `school.classroom-a`) —
  not decided.

## Security

Collision is enforced server-side only, in `TownRoom.canOccupy()`
(see [`movement.md`](./movement.md)) — the client-side tile rendering
in `TownScene` has no authority and is cosmetic, consistent with the
server-authoritative principle in
[`../security/security.md`](../security/security.md).

## Testing

`apps/game-server/src/rooms/TownRoom.test.ts` covers stopping at a
solid wall, spawning on a walkable tile within the jitter radius of
`SPAWN_POINT`, and simultaneous joiners landing on distinct positions.
There is no dedicated test for `zoneAt()`, reachability, or
landmark/spawn placement yet — those were checked manually (flood-fill
from `SPAWN_POINT`, solidity check on every `LANDMARKS` /
`SPAWN_POINTS` / `INTERACTION_POINTS` entry) rather than in an
automated suite.

## Related Documents

- [`movement.md`](./movement.md)
- [`game-design.md`](./game-design.md)
