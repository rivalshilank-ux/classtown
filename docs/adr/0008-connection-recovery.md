# 0008: A Dropped Connection Is Not a Departure

## Status

Accepted.

## Context

ADR 0002 states the intended design plainly: a participant code "is what
lets a student come back as the same character after their ticket is
spent, instead of accumulating a new participant per session." Two real
gaps stood between that intent and what the code actually did.

**Client-side**: `GameCanvas`'s error-recovery button, and its "leave
school" button, both routed through `/student` (the fresh-entry form,
which always mints a brand-new random guest nickname) or wiped the stored
session outright — never `/student/home`, the page that actually rejoins
via the stored `participantCode`. A routine school-WiFi drop was
indistinguishable, from the student's perspective, from never having
joined at all: a new participant, a new roster row, and lost XP/history.
Fixed by making every "return to school" path converge on
`/student/home`, which already had the correct rejoin logic — no server
or database change needed.

**Server-side**: `TownRoom.onLeave` treated every disconnect identically,
consented or not — immediate removal from room state, no path back
without a brand-new ticket. A 2-second WiFi blip on a school Chromebook
and a student closing their laptop for the day produced the same
outcome. Colyseus (0.16.24, already in use) ships `allowReconnection()`
specifically for this distinction; it was never called.

## Decision

**`onLeave`'s `consented` flag is the whole mechanism.** Colyseus sets it
by comparing the WebSocket close code to `WS_CLOSE_CONSENTED` (4000) —
exactly the code the existing multi-device-kick logic already uses
(`client.leave(4000)`), and exactly what the client SDK sends when
`room.leave()` is called with its default `consented = true`. An
unconsented drop (no explicit `.leave()` call — a network failure, a
crashed tab, a closed lid) is everything else. This project adds no new
signal: an unconsented leave calls `this.allowReconnection(client,
RECONNECTION_GRACE_SECONDS)` (20 seconds — long enough for a genuine
network hiccup, short enough that a closed laptop does not read as
"online" for the rest of the class period); a consented leave — including
the pre-existing multi-device kick — skips it and cleans up immediately,
exactly as before this existed.

**A frozen player is not an unattended one.** `this.moveIntents` is keyed
by `sessionId` and consumed every simulation tick with no check on
whether that session is currently connected — so the move intent is
always cleared the instant `onLeave` fires, before the `allowReconnection`
branch is even entered. Without this, a player who dropped mid-stride
would keep sliding across the map on their last-known input for the
entire grace window with nobody driving.

**A successful reconnect writes nothing new.** `onJoin` (a fresh ticket,
a fresh participant lookup, a `joined` event) never runs again for a
resumed session — `allowReconnection`'s resolution hands the same
`sessionId` back into the same `this.sessions`/`this.state.players`
entries that were never deleted. No second `join_tickets` row, no
duplicate `joined`/`left` event pair, no extra `markSeen`/`addPlaySeconds`
call. Only a genuinely expired window (the `catch` branch) falls through
to the exact cleanup path a consented leave always used.

**The client tries exactly once, and never inspects why it disconnected.**
`GameClient.ts` always attempts one `client.reconnect(room.reconnectionToken)`
after any `onLeave`, showing a lightweight "reconnecting" status instead
of the full error overlay. It does not need to know whether the drop was
consented — the server already decided that, and a reconnect attempt
against a departure the server already fully cleaned up (a deliberate
leave, or an expired window) simply fails fast, falling through to the
same "disconnected" state that existed before this phase. `destroy()` now
also explicitly calls `room.leave()` on unmount, so an ordinary navigation
away is correctly seen as consented rather than accidentally opening (and
wasting) a reconnection window for every normal exit.

**A successful reconnect restarts the Phaser scene against the new room
object**, rather than attempting to rebind `TownScene`'s existing
`$(room.state)` listeners to a different state instance — `client.reconnect()`
returns a new `Room` instance from the SDK's own perspective even though
the server resumes the same session. This is a brief visual reset of the
local view, not a full disconnection: ticket, identity, position, and
every other player's state are all preserved server-side throughout.

## Consequences

- The single most common real-world failure mode for the actual
  deployment target — a classroom on shared WiFi — now recovers silently
  within 20 seconds instead of requiring a manual re-entry.
- Even a full 20-second-plus outage no longer creates a ghost duplicate
  participant or loses progress: `/student/home`'s existing
  participant-code rejoin is the fallback, not a fresh-nickname join.
- The identity/security model is unchanged: no reconnection ever
  re-derives identity from anything the client sends. `client.reconnect()`
  resumes a session the server already verified via the original join
  ticket; it is not a second credential a tampered client could forge
  into a different participant.
- A reconnection is a continuation of an already-connected session, not a
  new join: it does not run `onAuth`, so it is never blocked by
  Maintenance Mode the way a genuinely new join is. This matches the
  existing maintenance-gate philosophy exactly — an existing session is
  never punished for maintenance starting mid-game — and is recorded as
  its own row in
  [`../admin/admin.md`](../admin/admin.md)'s Maintenance Gate table
  rather than left as an implicit assumption.
- `docs/architecture/overview.md` and `docs/security/security.md` predated
  this work (and ADR 0002's ticket-based join entirely) and described an
  older, unauthenticated join model in their own Planned sections. Fixed
  as part of Phase 11's documentation reconciliation pass, along with
  `docs/teacher/teacher.md`, `docs/operations/operations.md`, and
  `docs/README.md`.
