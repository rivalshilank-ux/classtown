# ClassTown Cheat Tool

## Status

Planned. No client, server endpoint, permission table, or command
protocol exists in the code today. This document records product
direction that has already been decided, not a design that is free to
change arbitrarily — but none of it is built.

## Purpose

The Cheat Tool is **not** a developer-only debug tool. It is an official
ClassTown product: a tool certain designated accounts can use while
playing with real friends, in real rooms, to affect gameplay. Regular
players cannot use it. This distinguishes it from a typical dev console —
it ships as a real, restricted-access feature, not something stripped out
of production builds.

## Architecture

Expected clients (none implemented yet):

- **Web Cheat Tool** — a web UI, likely part of or adjacent to `apps/web`.
- **Chrome/Edge Extension** — a browser extension client.
- **Desktop Tool** — a standalone desktop application.

All three are expected to be thin clients over the same underlying
authorization and command protocol — none of them is the authority on
whether a command is allowed.

```
Cheat Tool client (Web / Extension / Desktop)
        │  cheat command (player / world / event / economy)
        ▼
apps/game-server  ── validates cheatAccess for the requesting account ──
        │
        ├── rejected → command dropped, nothing changes, (planned) logged
        └── permitted → command applied to authoritative room state,
                         broadcast to clients like any other state change
```

## Current Implementation

None.

## Planned

### Access model (decided; not yet implemented)

- Access is restricted to designated accounts only — not every teacher,
  not every player.
- Usable in **both** normal gameplay rooms and a dedicated Cheat Mode
  (see [`../game/game-modes.md`](../game/game-modes.md)) — not exclusive
  to either.
- Regular players cannot use it under any circumstance.
- **The client never decides authorization.** Every client (Web, Extension,
  Desktop) sends a command; the game server is the sole party that
  validates `cheatAccess` for the requesting account and decides whether
  to apply it. A client that is compiled without visible cheat UI is not
  a security boundary by itself — the server-side check is.

### Cheat command categories (named, not yet designed in detail)

- **Player cheats** — affecting a specific player's state.
- **World cheats** — affecting room/world-level state (see
  [`../game/map.md`](../game/map.md),
  [`../game/seasons.md`](../game/seasons.md)).
- **Event cheats** — triggering entries from the planned event system
  (see [`../game/events.md`](../game/events.md)).
- **Economy cheats** — affecting the planned economy (see
  [`../game/economy.md`](../game/economy.md)).

### Not yet designed

- The concrete `cheatAccess` data model (how an account is marked
  eligible).
- The wire format for cheat commands.
- The audit log schema and retention policy.
- Game-server-side command handler(s) — no equivalent of `TownRoom`'s
  `move` message handler exists for cheat commands.

## Security

This is the core requirement, already decided: **authorization is a
server-side decision, never a client-side one.** A compiled-out UI,
obfuscated client, or "only distributed to trusted accounts" is not
sufficient by itself — the game server must independently verify
`cheatAccess` for every incoming cheat command, the same way
`TownRoom` independently re-validates every `move` message today (see
[`../game/movement.md`](../game/movement.md) and
[`../security/security.md`](../security/security.md)). An audit log of
who issued which cheat command, when, and in which room is planned but
not designed.

## Testing

None yet.

## Related Documents

- [`../game/cheat-system.md`](../game/cheat-system.md)
- [`../game/game-modes.md`](../game/game-modes.md)
- [`../security/security.md`](../security/security.md)
- [`../admin/admin.md`](../admin/admin.md)
