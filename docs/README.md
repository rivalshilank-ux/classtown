# ClassTown Development Documentation

This directory is the single source of truth for how ClassTown is designed,
what is actually built, and what is only planned. When documentation and
code disagree, **the code is correct and the documentation is wrong** —
file a fix to the doc, not the other way around.

Every document states a **Status** at the top:

- **Implemented** — exists in the code on the current branch, and is
  covered by the test suite referenced in the document.
- **In Progress** — partially implemented; the document says exactly what
  part.
- **Planned** — no code exists yet. The document records a design
  direction only, not an API, schema, or file structure, unless that
  structure has actually been decided and written down elsewhere (in which
  case it links to that decision).
- **Deprecated** — previously implemented, since removed or replaced.

## Structure

| Path | Covers |
|---|---|
| [`architecture/`](./architecture/overview.md) | System-wide architecture: apps, packages, data flow, auth flow |
| [`game/`](./game/) | Gameplay: movement, map, tutorial, modes, cheat mode, economy, inventory, house, events, seasons |
| [`teacher/`](./teacher/teacher.md) | Teacher-facing features: authentication, profile, classroom, room, game control |
| [`admin/`](./admin/admin.md) | Administrative features: monitoring, moderation, operations |
| [`cheat-tool/`](./cheat-tool/cheat-tool.md) | The standalone ClassTown Cheat Tool (web/extension/desktop) — a separate product from in-game Cheat Mode |
| [`messenger/`](./messenger/messenger.md) | ClassTown Messenger — a separate service from the game, with optional integration |
| [`operations/`](./operations/operations.md) | Deployment, maintenance, backups, monitoring |
| [`security/`](./security/security.md) | Authentication, authorization, RLS, secret management, server-authoritative design |
| [`adr/`](./adr/) | Architecture Decision Records — one file per significant decision, never edited after acceptance except to add a new superseding ADR |

## Current implementation summary

As of this writing, ClassTown consists of:

- **`apps/web`** — Next.js 16 app. Implements teacher signup/login/logout
  via Supabase Auth, a protected `/teacher` page, and a `/play` page that
  embeds the Phaser game client. See [`teacher/teacher.md`](./teacher/teacher.md)
  and [`security/security.md`](./security/security.md).
- **`apps/game-server`** — Colyseus server. Implements a single room type,
  `TownRoom`, with server-authoritative player movement. See
  [`game/movement.md`](./game/movement.md).
- **`packages/game-client`** — Phaser 4 client wrapper used by `/play`.
- **`packages/shared-schema`** — Zod schemas (validation) and
  `@colyseus/schema` state classes (network sync), shared between
  `apps/web`, `packages/game-client`, and `apps/game-server`.
- **`packages/shared-types`**, **`packages/ui`**, **`packages/i18n`**,
  **`packages/config`** — supporting packages (TypeScript types, design
  system components, translated strings, shared lint/tsconfig).

Everything else described anywhere under `game/`, `admin/`,
`cheat-tool/`, and `messenger/` is **Planned** unless its document says
otherwise.

## Related Documents

- [`adr/0001-teacher-authentication.md`](./adr/0001-teacher-authentication.md)
