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
| [`development/`](./development/setup.md) | Local development setup: prerequisites, install, env vars, running (macOS + Windows) |
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

- **`apps/web`** — Next.js 16 app. Teacher signup/login/logout, a
  dashboard with real class management (create/rename/archive/regenerate
  code) and student roster/removal, a student entry flow (ticket-based
  join, no account), and a full Admin Operations Center (`/admin/*`) —
  separate identity, teacher/class/student oversight, audit log,
  announcements, maintenance mode, AI Ops, and an automated (opt-in)
  weekly update/deployment pipeline. A `/play` page embeds the Phaser
  game client. See [`teacher/teacher.md`](./teacher/teacher.md),
  [`admin/admin.md`](./admin/admin.md), and
  [`security/security.md`](./security/security.md).
- **`apps/game-server`** — Colyseus server. A single room type,
  `TownRoom`, with server-authoritative movement and campus-map
  collision, ticket-verified join identity, presence/activity persisted
  to Supabase, and reconnection handling for dropped connections. See
  [`game/movement.md`](./game/movement.md) and
  [`adr/0008-connection-recovery.md`](./adr/0008-connection-recovery.md).
- **`packages/game-client`** — Phaser 4 client wrapper used by `/play`.
- **`packages/shared-schema`** — Zod schemas (validation) and
  `@colyseus/schema` state classes (network sync), shared between
  `apps/web`, `packages/game-client`, and `apps/game-server`.
- **`packages/shared-types`**, **`packages/ui`**, **`packages/i18n`**,
  **`packages/config`** — supporting packages (TypeScript types, design
  system components, translated strings, shared lint/tsconfig).
- **CI/Deployment** — GitHub Actions runs typecheck/lint/test/build on
  every push; Vercel auto-deploys `apps/web` on push to `master`. See
  [`operations/operations.md`](./operations/operations.md).

Everything under `game/` beyond movement (NPCs, quests, inventory, house,
seasons, events, tutorial, game modes), `cheat-tool/`, and `messenger/` is
still **Planned** — none of that has changed. `admin/` and `teacher/` are
each substantially **Implemented** now; read those two documents directly
rather than assuming "Planned" from this summary alone.

## Related Documents

- [`adr/0001-teacher-authentication.md`](./adr/0001-teacher-authentication.md)
- [`adr/0002-class-and-student-participants.md`](./adr/0002-class-and-student-participants.md)
- [`adr/0003-admin-authentication.md`](./adr/0003-admin-authentication.md)
- [`adr/0004-maintenance-gate.md`](./adr/0004-maintenance-gate.md)
- [`adr/0005-ai-ops-tool-registry.md`](./adr/0005-ai-ops-tool-registry.md)
- [`adr/0006-hidden-admin-entry.md`](./adr/0006-hidden-admin-entry.md)
- [`adr/0007-scheduler-and-deployment-pipeline.md`](./adr/0007-scheduler-and-deployment-pipeline.md)
- [`adr/0008-connection-recovery.md`](./adr/0008-connection-recovery.md)
