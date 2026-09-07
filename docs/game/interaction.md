# Interaction

## Status

Implemented. The campus discovery tour is the first real gameplay loop:
walk up to one of the map's `INTERACTION_POINTS`, interact with it, and
find all of them.

## Purpose

Give players something to actually *do* once they can move around --
Phase 13 built the world and character, but nothing in it responded to
the player. This is deliberately one small, complete loop rather than a
general interaction/quest framework: see [`game-design.md`](./game-design.md)
for what's still just direction for later phases.

## Architecture

```
packages/shared-schema/src/messages.ts
   interactMessageSchema          -- client -> server "interact" message,
                                      validated the same way moveIntentSchema
                                      is (Zod, unknown keys stripped)
   InteractResult                 -- server -> client, private reply
   DiscoveryProgress              -- server -> client, private, sent on
                                      "request_progress"
   PlayerDiscoveryEvent           -- server -> all clients, broadcast
   TourCompletedEvent             -- server -> all clients, broadcast

packages/shared-schema/src/world/campusMap.ts
   INTERACTION_RANGE_PX           -- shared distance threshold (44px)
   interactionPointById() / interactionPointCenter()

apps/game-server/src/rooms/TownRoom.ts
   handleInteract()                -- validates target, range, and cooldown;
                                       the only place that decides a discovery
                                       happened
   discoveries: Map<participantId, Set<pointId>>
                                    -- room-memory only, keyed by participant
                                       (not session) so it survives a real
                                       reconnect
   sendDiscoveryProgress()         -- answers "request_progress"

packages/game-client/src/scenes/TownScene.ts
   Renders a badge per INTERACTION_POINTS entry (gold "star" = undiscovered,
   green "check" = discovered), a bottom-center "[E] ... 조사하기" prompt when
   the local player is in range, a top-right discovery counter, a transient
   speech-bubble over a player who just discovered something, and a top-banner
   toast when someone completes the tour. Sends "request_progress" once its
   own onMessage listeners are registered (see Security below for why this
   isn't pushed from onJoin instead).
```

## Current Implementation

- The tour is the 8 entries already defined in `INTERACTION_POINTS`
  (6 room signs, the plaza notice board, the event stage) -- no new map
  content, reusing data Phase 13 left in place for exactly this.
- Pressing **E** near a point sends `{ pointId }`. The server independently
  re-derives everything: whether the point exists, the straight-line
  distance from the player's *current authoritative* position to the
  point's pixel center (`INTERACTION_RANGE_PX`, 44px), and a 400ms
  per-player cooldown (`INTERACT_COOLDOWN_MS`) against spam. A client
  claiming it already found everything, or supplying a reward amount, has
  no effect -- `interactMessageSchema` keeps only `pointId`.
- Re-interacting with an already-found point is not an error --
  `InteractResult.alreadyDiscovered` just comes back `true`, cooldown
  still applies.
- Two multiplayer moments, both broadcast (not synced schema state, since
  no other player needs continuous access to *how much* of the tour
  someone has done -- see Security):
  - Any new discovery broadcasts `player_discovery` -- every client shows
    a small bubble over that player for ~1.4s.
  - Finding all 8 broadcasts `tour_completed` -- every client shows a
    room-wide toast for ~3.5s.
- Completing the tour also calls
  `persistence.recordEvent({ type: "activity_completed", payload: { activity: "campus_tour" } })`
  -- the one thing about this activity that's durably recorded, via the
  same `student_activity_events` feed "joined"/"left" already use (a new
  `activity_completed` enum value; see Persistence below). Partial
  progress is never written to Supabase, only kept in room memory.
- A student's in-progress discoveries are **not** wired into XP/level.
  `packages/shared-schema/src/progression.ts` is deliberately
  time-only-derived by design (see that file's own comment) specifically
  so it can't be earned faster by a client-reachable action; extending it
  to reward interactions would have undone that property; deliberately
  kept out of scope here.

## Planned

- Reading `INTERACTION_POINTS.type` (`npc` / `quest` / `event` /
  `generic`) for anything beyond a uniform "discover it" -- today every
  point behaves identically regardless of its declared type.
  Selecting among named spawn points, per-classroom ownership, and
  everything else `map.md`'s own Planned section already lists are
  unrelated to this and still open.
- A lightweight player-to-player reaction/emote (a wave, a quick emoji) --
  considered for this phase, deliberately deferred: the discovery
  bubble/toast pair already delivers the "friend sees what I'm doing"
  moment this phase needed, and a general-purpose reaction system is a
  separate, larger piece of scope.

## Security

- Server-authoritative in the same sense movement is (see
  [`movement.md`](./movement.md)): the client sends an intent
  (`{ pointId }`), never a claimed result. `TownRoom.handleInteract()` is
  the only code that can grow `discoveries`, decide `alreadyDiscovered`,
  or trigger the completion broadcast/persistence call.
- Range is checked against the player's current `PlayerState.x/y` --
  the same authoritative position `movePlayers()` maintains -- not
  anything the client reports about itself.
- `discoveries` is keyed by `participantId`, kept off `PlayerState`
  (broadcast to the whole room) the same way `TownRoom.sessions` already
  keeps identity off it -- one student's tour progress is not something
  every other student's client needs to receive.
- `DiscoveryProgress` is sent only in reply to a client-sent
  `request_progress`, not pushed unprompted from `onJoin`. A message sent
  before the client has registered its handler for it is dropped, not
  buffered, by colyseus.js -- `onJoin` sending it immediately would race
  `TownScene.create()`'s listener registration in exactly the pattern the
  real client uses. Discovered by writing the reconnect test below, not
  by inspection.

## Persistence

`activity_completed` is a new value on the `activity_event_type` Postgres
enum (`supabase/migrations/20260907000000_activity_event_type_add_activity_completed.sql`).
That migration has **not** been applied to any live Supabase project by
this change -- only added to the repo, per this project's rule against
running `supabase db push` without an explicitly confirmed target. Until
it's applied, `recordEvent`'s insert fails closed (logged and swallowed,
same as every other persistence error in `supabasePersistence.ts`): a
student still gets their completion result and the room-wide toast either
way, the only thing that doesn't happen yet is the durable teacher-visible
row. `apps/web/app/teacher/RecentActivity.tsx` already renders it
("...님이 학교 탐방을 완료했어요") once that row exists.

## Testing

`apps/game-server/src/rooms/TownRoom.test.ts`, `describe("interaction ...")`
covers: a valid discovery, a repeat interaction reporting
`alreadyDiscovered` instead of erroring, an unknown point id, an
out-of-range point, a forged payload (extra claimed fields have no
effect), the per-player cooldown, another client observing the
`player_discovery` broadcast, discoveries surviving a real
dropped-connection reconnect (via `allowReconnection`, not a fresh
join -- a *consented* leave+rejoin empties and disposes the room, which
is expected and out of scope here, the same as it would be for any other
in-memory room state), and the full 8-point tour triggering
`tour_completed` and the `activity_completed` persistence call. Also
verified live against a real (non-test-harness) running server with two
concurrent clients.

`TownRoomOptions.moveSpeed` is a test-only override (mirrors the existing
`reconnectionGraceSeconds` one) so the full-tour test can cross the map
without taking real-world minutes; production always uses the real
default.

## Related Documents

- [`movement.md`](./movement.md)
- [`map.md`](./map.md)
- [`game-design.md`](./game-design.md)
- [`../architecture/overview.md`](../architecture/overview.md)
- [`../security/security.md`](../security/security.md)
