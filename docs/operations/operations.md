# Operations

## Status

In Progress — deployment is Implemented (Vercel, git-triggered), CI is
Implemented (GitHub Actions, runs on every push to `master`), an
automated weekly update-plan/deployment pipeline is Implemented but
disabled by default (see [`../admin/admin.md`](../admin/admin.md)), an
automated dependency vulnerability scan (`pnpm audit`) is Implemented in
CI, and a daily scheduled health-report job with Discord-webhook alerting
is Implemented but disabled by default; automated backups are Planned.

## Purpose

Record how ClassTown is actually deployed and operated today, and be
explicit that no scheduled maintenance or automated ops process exists
yet — none of it should be assumed to be running.

## Architecture

```
git push (GitHub, rivalshilank-ux/classtown, branch: master)
        │
        ├──> GitHub Actions CI (.github/workflows/ci.yml)
        │        pnpm typecheck && lint && test && build
        │
        └──> Vercel (Git-connected project, Root Directory: apps/web)
                 │  installCommand: cd ../.. && pnpm install --frozen-lockfile
                 │  buildCommand:   cd ../.. && pnpm turbo run build --filter=@classtown/web
                 ▼
             Preview deployment (non-production branch) or Production deployment

Separately, Vercel Cron (apps/web/vercel.json) hits three CRON_SECRET-gated
routes on a schedule:
  Sun 19:00 KST → /api/cron/weekly-check  → proposes an update plan
  Sat 03:00 KST → /api/cron/weekly-update → runs the deploy pipeline,
                                             but only if an admin has
                                             both approved a plan AND
                                             turned ops_config.auto_update_enabled
                                             on (default: off)
  daily 07:00 KST → /api/cron/health-check → checks the game server and
                                             alerts via Discord webhook on
                                             failure, but only if
                                             ops_config.auto_health_report_enabled
                                             is on (default: off)
```

`apps/web/vercel.json` runs install/build from the monorepo root so
Turborepo's workspace graph resolves correctly, rather than trying to
build `apps/web` in isolation. `.vercelignore` (repo root) excludes
`.turbo`, `coverage`, and `*.tsbuildinfo` from the upload — none of these
are excluded by default the way `node_modules` is.

`apps/game-server` is not deployed anywhere today — it has been run only
locally (`pnpm start` / `pnpm dev`) during development and verification.

## Current Implementation

- **CI**: GitHub Actions (`.github/workflows/ci.yml`) runs
  `pnpm typecheck && lint && test && build` on every push to `master` and
  on every pull request. (This did not actually run for a real period of
  time — the workflow was originally scoped to `branches: [main]`, but
  this repository's default branch is `master`; fixed in Phase 8.)
- **Deployment**: Vercel project connected to the GitHub repository.
  Pushing to `master` triggers a build; Production and Preview
  environments exist as separate Vercel deployment targets. Configured
  environment variables were confirmed (by listing names, never printing
  values) to be limited to `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` — no service-role key or other secret
  is registered in Vercel.
- **Automated weekly update pipeline** (see
  [`../adr/0007-scheduler-and-deployment-pipeline.md`](../adr/0007-scheduler-and-deployment-pipeline.md)):
  a Sunday cron proposes an update plan from recent commits; an admin
  reviews and approves it from `/admin/updates`; a Saturday cron walks
  precheck → maintenance → deploy → verify → completed/failed, rolling
  back only if explicitly enabled. **Disabled by default** —
  `ops_config.auto_update_enabled` defaults to `false`, so deploying this
  feature changed nothing in production until an admin opts in. Neither
  cron route has been exercised against real GitHub/Vercel credentials in
  this repository's development environment; both fail closed (fail an
  auth check or report "not configured") without them.
- **Dependency vulnerability scanning**: `pnpm audit --prod --audit-level=high`
  (`pnpm run audit`) runs as a CI step on every push/PR, scoped to what
  actually ships (`apps/web`, `apps/game-server`) rather than every dev
  tool's own transitive graph. One known advisory
  (`@colyseus/core@0.16.24`'s pinned `nanoid@^2.0.0`, three GHSA ids) is
  pre-ignored via `pnpm-workspace.yaml`'s `auditConfig` — see the comment
  there for why it doesn't apply to how this dependency is actually
  called, and why the real fix (`@colyseus/core` >=0.17) is a separate,
  bigger upgrade, not something to force through a version override. Any
  other new advisory in the production dependency graph still fails CI.
- **Health check**: `apps/game-server` exposes `GET /health`;
  `apps/web` exposes `GET /api/health`. Neither is monitored
  continuously in production today — `/admin/system` runs an on-demand
  check when an admin loads the page.
- **Scheduled health report** (`/api/cron/health-check`,
  `apps/web/src/lib/deploy/healthReport.ts`): a daily cron, gated by
  `ops_config.auto_health_report_enabled` (default `false`, toggled on
  `/admin/updates` alongside the other automation flags). When on, it
  reuses the same pure-fetch game-server probe `/admin/system` uses
  (`checkGameServer()`); database reachability needs no separate probe,
  since reading `ops_config` itself already proves the database
  answered. A `down`/`degraded` result posts to a Discord webhook (via
  `DISCORD_WEBHOOK_URL`, optional — degrades to a silent no-op without
  it, the same "not configured" posture as `GITHUB_TOKEN`/`VERCEL_TOKEN`)
  and writes a `medium`-risk `admin_audit_logs` row via
  `recordSystemAuditLog()` (`actor_type: 'system'`, the same session-less
  path the weekly pipeline uses — `record_audit_log()` itself needs
  `is_admin()`, which no cron invocation ever has). A healthy result, or
  `unknown` (the game server URL isn't configured in this project's own
  deployment today), does neither. Locked to once per calendar day the
  same way the weekly jobs are locked to once per week
  (`scheduler_runs`, job name `health-check`).
- **Maintenance mode**: an admin can start/end a maintenance window from
  `/admin/system` (`public.maintenance_windows`, server-authoritative).
  A currently active window is surfaced on the landing, teacher, and
  student entry pages, and blocks new student joins, teacher mutations,
  and new Colyseus joins server-side (never disconnecting a player
  already connected). The weekly update pipeline can start/end a window
  automatically as part of a deploy, but nothing runs on a plain
  calendar schedule outside of that pipeline.
- **Announcements**: an admin can draft and publish a site-wide
  announcement from `/admin/announcements`. A "scheduled" announcement
  does not publish itself at its scheduled time — publishing is always a
  manual admin action; the update pipeline can auto-publish a *completion*
  announcement after a successful deploy if `ops_config.auto_announcement_enabled`
  is on, which is a different thing.
- **Audit log**: `/admin/audit` — append-only, covers admin login/logout,
  announcement/maintenance/update-plan mutations, and AI Ops actions. See
  [`../admin/admin.md`](../admin/admin.md).

## Planned

None of the following is automated or scheduled today:

- Emergency security patch process.
- Continuous (sub-daily) health monitoring — the scheduled health report
  above runs once a day, not continuously, and only ever probes the game
  server specifically, not a broader "deployment health" concept.
- Log management and retention policy.
- Backup and restore process (Supabase's own backup capabilities have
  not been configured or verified for this project).
- Broader Discord-webhook operations reporting — `postDiscordReport()`
  (`apps/web/src/lib/deploy/discord.ts`) is a real, generic, working
  mechanism now, but the only thing that calls it today is the health
  report's failure alert above; routing other events (deploy
  success/failure, a new update plan) through it is still undecided.
- A distributed rate limiter (today's is per-process in-memory — see
  [`../security/security.md`](../security/security.md)).

## Security

See [`../security/security.md`](../security/security.md) for secret
handling. No operational secret (service-role key, database password) is
stored in Vercel's environment variable configuration.

## Testing

`pnpm run audit && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
from the repo root is both the pre-deploy gate and what GitHub Actions CI
runs automatically on every push to `master` and every pull request (the
audit step as of this writing; the rest since Phase 8).

`discord.test.ts` and `healthReport.test.ts` (mocked fetch/Supabase, no
live webhook or database) cover the health-report mechanics: skips
without a probe when disabled or when the config read itself fails,
treats `unknown` as healthy, alerts and logs exactly once per `down`/
`degraded` result. `health-check/route.test.ts` covers the
`CRON_SECRET` fail-closed check and the scheduler-lock short-circuit,
the same pattern as the two existing cron routes'. **No live Discord
webhook, live game server, or live Vercel Cron firing was exercised** —
consistent with every other "not configured" integration path in this
project (see Phase 4/5+6's own testing notes in
[`../admin/admin.md`](../admin/admin.md)).

## Related Documents

- [`../architecture/overview.md`](../architecture/overview.md)
- [`../security/security.md`](../security/security.md)
- [`../admin/admin.md`](../admin/admin.md)
- [`../adr/0007-scheduler-and-deployment-pipeline.md`](../adr/0007-scheduler-and-deployment-pipeline.md)
