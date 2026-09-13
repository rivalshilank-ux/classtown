# Admin Features

## Status

In Progress. Phase 1 (admin authentication, `/admin` layout, Overview),
Phase 2 (Teachers/Classes/Students listings, audit log), Phase 3
(Announcements, Maintenance Mode, System Health page), Phase 3.5
(production QA and a real Maintenance Gate), Phase 4 (AI Ops + Tool
Registry + approval workflow), a hidden keyboard-shortcut entry point to
`/admin/login` plus a new shared Admin Code pre-gate, and Phase 5+6
(Update Plans + Scheduler + automated deployment pipeline) are Implemented.
Everything else listed under Planned below still does not exist in the
code.

## Purpose

Record the actual scope of administrative capability as it's built, so it
isn't designed ad hoc, and so this document never claims more than the code
does.

## Architecture

Admin functionality lives inside `apps/web`, under `/admin`, as a fully
separate identity from teacher accounts — not elevated teacher permissions.
See [`../adr/0003-admin-authentication.md`](../adr/0003-admin-authentication.md)
for why a separate `admin_accounts` table was chosen over extending
`teacher_accounts`.

Every protected admin route lives under `app/admin/(protected)/` (a route
group -- adds no path segment), with `app/admin/(protected)/layout.tsx` as
the shared guard. `app/admin/login/` is a sibling *outside* that group, on
purpose: nesting it inside the guarded group previously caused an infinite
redirect loop for anyone who wasn't already an admin, since the layout
itself would redirect to `/admin/login` before that page could ever render.
Found and fixed in Phase 3.5 -- see
[`../adr/0004-maintenance-gate.md`](../adr/0004-maintenance-gate.md).

## Current Implementation

- **Identity**: `public.admin_accounts`, one row per `auth.users` row,
  created only by `handle_new_admin()` when signup metadata carries
  `role: 'admin'`. No public signup route exists; accounts are created only
  via `apps/web/scripts/create-admin.ts`, run manually with the service role
  key.
- **Authorization**: server-authoritative, doubled the same way `/teacher`
  is — `proxy.ts` requires an authenticated session for any `/admin/*` path
  except `/admin/login`, and `app/admin/(protected)/layout.tsx`
  independently calls `getCurrentAdmin()` (querying `admin_accounts` by
  `auth.uid()`) and redirects to `/admin/login` if the session isn't
  actually an admin. `signInAdmin()` signs a session back out immediately
  if valid Supabase credentials belong to a non-admin (e.g. a teacher).
- **Data access**: admin reads run through the admin's own RLS-scoped
  session via a new `is_admin()` helper, granted additional `SELECT` access
  to `teacher_accounts`, `classes`, and `student_participants`
  (`20260906010000_admin_read_access.sql`) — additive policies that don't
  change teacher-scoped access to those tables.
- **Overview** (`/admin`): real counts (total teachers, total/active
  classes, total/online students, using the same online-presence window as
  the teacher roster) and a System Health panel (Web, Auth, Database, Game
  Server), each derived from an actual query or HTTP health check — never
  mock data. Recent Errors is still explicitly labeled not-yet-available,
  since no log aggregation exists; update plans and deployment history now
  live at `/admin/updates` (Phase 5+6) rather than on Overview. Admin
  login/logout and any maintenance/announcement action are visible in
  `/admin/audit`, linked from Overview.
- **Hidden admin entry** (no visible UI): a Shift+Cmd (Mac) / Shift+Ctrl
  (Windows/Linux) double-tap, anywhere on the site, navigates to
  `/admin/login` — a pure client-side *entry point* with zero authority; see
  [`../adr/0006-hidden-admin-entry.md`](../adr/0006-hidden-admin-entry.md).
  The login form additionally requires a separate, single shared **Admin
  Code** before real credentials are even attempted:
  `verifyAdminCode()` (`apps/web/src/lib/auth/adminCode.ts`) hashes the
  submitted code with SHA-256 and compares it to `ADMIN_CODE_HASH` (a
  server-only env var, set via `pnpm hash-admin-code`) using
  `crypto.timingSafeEqual`; fails closed if unset. `signInAdmin()` checks
  the rate limit, then the code, before ever calling Supabase — a wrong
  code never touches real credentials or spends Supabase Auth's own rate
  limit.
- **Web health endpoint**: `GET /api/health` on `apps/web`, mirroring the
  game server's existing `GET /health`.
- **Teachers / Classes / Students** (`/admin/teachers`, `/admin/classes`,
  `/admin/students`): paginated, single-field-search listing views over
  `teacher_accounts`, `classes`, and `student_participants` (plus
  `student_progression` for level/XP, granted read access in
  `20260906030000_admin_progression_read_access.sql`). No new personal data
  is collected; `student_participants.participant_code` (the student's join
  credential) is deliberately never selected here, and the class code is
  shown in full since it's already treated as a shareable room code
  elsewhere in the product (see `apps/web/src/lib/admin/classes.ts`).
- **Audit log** (`public.admin_audit_logs`, `/admin/audit`): a generic,
  append-only trail (`actor_type`, `actor_id`, `action`, `target_type`,
  `target_id`, `risk_level`, `status`, `metadata`) designed to be reused by
  moderation, announcements, maintenance, AI Ops, deployment, and the
  scheduler once they exist — not rebuilt per feature. Rows are written only
  through `record_audit_log()`, a `security definer` RPC that requires
  `is_admin()` and always stamps `actor_id` from `auth.uid()`, so an admin
  session can never write a log entry under another admin's identity. Only
  admin login/logout are audited so far (`admin.login`, `admin.logout`)
  from Phase 2; Phase 3 adds `announcement.create`, `announcement.publish`,
  `announcement.expire`, `maintenance.enable`, `maintenance.disable`. Plain
  listing/read requests are never logged, by design, to avoid the log
  growing unboundedly for no operational benefit.
- **Announcements** (`public.system_announcements`, `/admin/announcements`):
  draft → (scheduled) → published → expired. An unexpired, published row's
  `id`/`title`/`body` -- nothing else -- is readable by `anon`/`authenticated`
  through `get_latest_published_announcement()`, a `security definer`
  function, and rendered by `SiteStatusBanner` on the landing, teacher, and
  student entry pages. "Scheduled" does not self-publish -- there is no
  scheduler yet (Phase 5); an admin always publishes explicitly. Time-based
  expiry (`expires_at`) works today without any scheduler, since the
  function itself excludes expired rows regardless of `status`. Phase 3.5
  replaced an earlier, row-level "anyone can read published rows" policy
  with this function after verifying against a real local Supabase instance
  that the row-level version let any client asking for `select=*` read
  `created_by` (an admin's id) too -- see
  [`../adr/0004-maintenance-gate.md`](../adr/0004-maintenance-gate.md).
- **Maintenance mode** (`public.maintenance_windows`, `/admin/system`):
  server-authoritative in two independent ways. First, `is_active` is
  enforced by a partial unique index (`maintenance_windows_one_active_idx`),
  so at most one window can be active even under concurrent admin requests
  -- verified for real against a local Postgres instance by firing two
  genuinely concurrent transactions at it; the second always fails with a
  unique-violation, never both succeeding. Second, as of Phase 3.5, a
  **Maintenance Gate** actually blocks student joins, teacher mutations, and
  new Colyseus joins while active -- see the table below. Only `message` and
  `starts_at` are publicly readable, via `get_active_maintenance_notice()`
  (same reasoning and same real-instance finding as announcements above).
- **System Health page** (`/admin/system`): the Overview panel plus a
  real, on-demand Supabase reachability probe (`checkDatabaseReachable()`)
  and the maintenance control described above, on one screen.

### Maintenance Gate (Phase 3.5)

Three independent gate points, one per existing trust boundary -- see
[`../adr/0004-maintenance-gate.md`](../adr/0004-maintenance-gate.md) for the
full design rationale.

| Area | During maintenance |
| --- | --- |
| Public site (`/`, `/student`, `/teacher` banners) | Allowed -- shows the notice |
| Student join (`joinClass`) | Blocked -- `MAINTENANCE_MODE` |
| Teacher reads (dashboard, roster, activity) | Allowed |
| Teacher mutations (create/archive class, rotate code, toggle join) | Blocked -- `MAINTENANCE_MODE` |
| New Colyseus joins (`TownRoom.onAuth`) | Blocked -- `ServerError(503, MAINTENANCE_MODE_ERROR_CODE)` |
| Existing connected players | Preserved -- `onAuth` never runs again for a session already in the room |
| Reconnection after a dropped connection (`allowReconnection`, [ADR 0008](../adr/0008-connection-recovery.md)) | Allowed -- treated as a continuation of an existing session, not a new join; `onAuth`/the maintenance check never runs on this path |
| Admin (`/admin/*`) | Allowed -- these routes never call any gated function |
| Health checks (`/api/health`, game server `/health`) | Allowed |

`MAINTENANCE_MODE_ERROR_CODE` (`packages/shared-types/src/maintenance.ts`)
is the one shared machine-readable code both apps use; each side maps it to
its own human-facing Korean text independently. Verified end-to-end against
a real running `apps/game-server` process and a real local Supabase
instance: a new join was rejected with `(503) MAINTENANCE_MODE` while
maintenance was active, and a player already connected before maintenance
started kept moving and receiving authoritative position updates throughout
(confirmed via an `onLeave` listener that never fired).

### AI Ops (Phase 4)

`/admin/ai`, backed by Groq (`GROQ_API_KEY`, optional -- the page renders a
clear "not configured" state without it). Full design rationale in
[`../adr/0005-ai-ops-tool-registry.md`](../adr/0005-ai-ops-tool-registry.md);
summary:

- A fixed **Tool Registry** (`apps/web/src/lib/ai/toolRegistry.ts`) is the
  only thing that can execute anything. Risk level (`low`/`medium`/`high`/
  `critical`) is a hardcoded field per tool, never something the model's own
  output can set. Tool arguments from the model are re-validated with `zod`
  server-side regardless of what JSON the model produced.
- `low` tools execute immediately: `get_system_health`,
  `get_recent_admin_actions`, `get_git_changes` (GitHub REST API, needs
  `GITHUB_TOKEN`; "not configured" without one), `get_recent_errors`
  (honestly "not available" -- no log aggregation exists),
  `create_announcement_draft` (a draft has zero public visibility until an
  admin publishes it, unchanged from Phase 3).
- `medium`+ tools are never executed by the AI. `enable_maintenance`/
  `disable_maintenance`/`restart_game_server` (medium), `deploy_release`
  (high), `rollback_release` (critical) instead write a `pending` row to
  `public.ai_tool_executions` — a new table, separate from
  `admin_audit_logs`, tracking the *decision* (`pending` →
  `approved`/`rejected` → `executed`/`failed`). An admin approving on
  `/admin/ai` re-checks `is_admin()` and calls the exact same handler
  function a human clicking the equivalent button elsewhere would call —
  `enable_maintenance`/`disable_maintenance`/`create_announcement_draft`
  all call the same `*Core` functions Phase 3's own UI buttons call
  (`maintenanceCore.ts`/`announcementCore.ts`, extracted from the Phase 3
  action files specifically so an actor-attribution parameter could exist
  without becoming a client-reachable argument on a Server Action).
  `restart_game_server`/`deploy_release`/`rollback_release` are registered
  with real risk levels but their handlers return an explicit "not
  configured" result — no deployment target or Vercel API wiring exists
  yet (Phase 6).
- `record_audit_log()` gained an optional `actorType` (`admin`/`ai`) so a
  `low` tool the AI auto-executed is distinguishable from a human doing the
  same thing by hand in `/admin/audit`. An *approved* `medium`+ action is
  still attributed to `admin` — the click is what authorized it;
  `ai_tool_executions` is where "AI proposed it" is recorded separately.
- No conversation history is persisted; each request is single-shot. No
  read tool's result is persisted either (consistent with Phase 2's
  "don't audit plain reads" rule) — only real state changes and `medium`+
  proposals leave a row anywhere.

### Update Plans + Scheduler + Deployment Pipeline (Phase 5+6)

`/admin/updates`. Full design rationale in
[`../adr/0007-scheduler-and-deployment-pipeline.md`](../adr/0007-scheduler-and-deployment-pipeline.md);
summary:

- **Sunday job** (`GET /api/cron/weekly-check`, Vercel Cron, `0 10 * * 0`
  UTC = 19:00 KST): creates one `public.update_plans` row (`status:
  planned`) via the service role — commits since the last plan, a
  keyword-heuristic risk level (`low`/`medium`/`high`), no admin session
  required or used. An admin can also trigger this on demand from
  `/admin/ai` via the `create_update_plan` tool (queued for approval like
  any other `medium`-risk tool).
- **Approval**: an admin reviews a `planned` row on `/admin/updates` and
  approves or cancels it (`approveUpdatePlan`/`cancelUpdatePlan`) — RLS lets
  an admin session update only `status`/`approved_by`/`approved_at` on
  `update_plans`, never insert a row directly.
- **Saturday job** (`GET /api/cron/weekly-update`, `0 18 * * 5` UTC =
  03:00 KST Saturday): exits immediately at `skipped` unless
  `ops_config.auto_update_enabled` is on and a plan is `approved`. Otherwise
  walks `public.update_executions.state` through
  `prechecking → maintenance → deploying → verifying → completed`, writing
  the new state *before* each check runs: precheck asks whether `master`'s
  latest CI run (`.github/workflows/ci.yml`, checked via the GitHub Actions
  REST API) is green; deploy POSTs to a Vercel Deploy Hook; verify polls the
  Vercel Deployments API for `readyState: READY`. A failed check anywhere
  stops the run at `failed`, always disables maintenance, and always writes
  a `high`-risk `admin_audit_logs` row (`actor_type: 'system'`) — never left
  silently stuck.
- **Rollback**: only if a health check fails *and*
  `ops_config.auto_rollback_enabled` is on, the pipeline promotes the
  pre-update Vercel deployment it checkpointed before touching anything
  (`promoteDeployment`, the real `v10/projects/{id}/promote/{deploymentId}`
  endpoint). Otherwise it stops at `failed` and waits for an admin — this
  project has never verified it has a database backup, so "rollback" here
  never claims to undo data changes, only to point traffic back at the
  previous build.
- **Both cron routes** require `Authorization: Bearer $CRON_SECRET` and
  fail closed (401) if `CRON_SECRET` isn't set — the same fail-closed
  pattern as `ADMIN_CODE_HASH`. Both use a `public.scheduler_runs`
  `(job_name, run_key)` unique-constraint lock (`run_key` is a KST calendar
  date) so a retried or overlapping invocation on the same day is a no-op,
  not a double-run — the same real concurrency pattern already proven for
  `maintenance_windows_one_active_idx` in Phase 3.5.
- `ops_config` (`/admin/updates`, one editable row) defaults every flag to
  `false`. Deploying this feature to Vercel — which does register the
  `crons` array in `apps/web/vercel.json` for real — changes nothing in
  production until an admin explicitly turns automation on.
- `restart_game_server`/`deploy_release`/`rollback_release` in the Tool
  Registry (Phase 4) now call these real modules instead of a hardcoded
  string; the *result* in this project's own sandbox is still "not
  configured" (no `GITHUB_TOKEN`/`VERCEL_TOKEN`/deploy hook exists here),
  but the code path is the real one.

### Scheduled Health Report

A fourth `ops_config` flag, `auto_health_report_enabled` (default
`false`, same `/admin/updates` form), gates a daily
`/api/cron/health-check` job — full detail in
[`../operations/operations.md`](../operations/operations.md). On a
`down`/`degraded` game server, it posts to a Discord webhook
(`DISCORD_WEBHOOK_URL`, optional — "not configured" without it, same
posture as `GITHUB_TOKEN`/`VERCEL_TOKEN` above) and writes a
`medium`-risk, `actor_type: 'system'` row directly to
`admin_audit_logs` via `recordSystemAuditLog()` — not
`record_audit_log()`, which needs `is_admin()` and therefore cannot be
called from a session-less cron invocation.

## Planned

- **Moderation** — reports, warnings, temporary restrictions.
- **Room monitoring, player management, in-game events, weather/time
  control** — the original gameplay-facing admin scope from this document's
  first version; still entirely undesigned.

## Security

Server-authoritative throughout: the client never decides admin access, and
Supabase's own row-level security — not application code — is the actual
enforcement boundary for every admin data read. See
[`../security/security.md`](../security/security.md) and
[`../adr/0003-admin-authentication.md`](../adr/0003-admin-authentication.md).

Phase 3.5 ran a real security audit against a local Supabase instance
(migrations applied fresh from `supabase/migrations/`, not assumed):
confirmed RLS is enabled on every admin-related table; confirmed
`is_admin()`/`record_audit_log()`/`handle_new_admin()`/`handle_new_teacher()`
are all `security definer`; confirmed a teacher session reading
`admin_accounts` or `admin_audit_logs` gets an empty result, and a teacher
calling `record_audit_log()` directly gets a `42501 not authorized` error;
confirmed `anon` cannot call `create_class` and an authenticated teacher
cannot call `join_class` (service-role-only) or insert into
`maintenance_windows`; confirmed cross-teacher IDOR is still blocked (a
second teacher can neither see nor archive the first teacher's class via a
direct PostgREST call with the class's real id); and found + fixed the
public-read column-leak described above. See
[`../adr/0004-maintenance-gate.md`](../adr/0004-maintenance-gate.md) for
what changed as a result.

## Testing

`getCurrentAdmin.test.ts`, `adminActions.test.ts`, and `proxy.test.ts` (extended
for every `/admin` sub-route) cover the authorization boundary described
above. `teachers.test.ts`, `classes.test.ts`, `students.test.ts`, and
`audit.test.ts` cover query filtering, pagination, and the empty/error
fallback paths for the Phase 2 listing views. `announcements.test.ts`,
`announcementActions.test.ts`, `maintenance.test.ts`,
`maintenanceActions.test.ts`, and the `src/lib/site/*.test.ts` files cover
Phase 3's CRUD, audit-log wiring, and the public-read path used by
`SiteStatusBanner`. `studentActions.test.ts` and `teacherActions.test.ts`
each gained a maintenance-blocked case per gated function; `TownRoom.test.ts`
gained a `maintenance mode` suite (new join rejected, existing player
unaffected, joins resume after maintenance ends) that runs against a real
Colyseus server instance over a real WebSocket connection (`FakePersistence`
only stands in for the database).

Beyond unit tests, Phase 3.5 additionally verified against a disposable
local Supabase instance (`supabase start`, stopped and cleaned up afterward;
no production data touched): all 14 migrations apply cleanly in order;
every RLS/grant claim above; a real concurrent-transaction race against
`maintenance_windows_one_active_idx`; a real `apps/game-server` process
handling an actual join/reject/persist cycle; and the actual server-rendered
HTML of `/` and `/student` (fetched via plain HTTP, real Next.js dev
server) containing a published announcement and active maintenance message,
and never containing a draft announcement.

Phase 4's `toolRegistry.test.ts`, `runDiagnostics.test.ts`, and
`approvalActions.test.ts` cover the registry/approval mechanics with a
mocked Groq client — a `low` tool executing without creating an
`ai_tool_executions` row, a `medium`+ proposal creating a `pending` row
without calling its handler, approving calling the real handler exactly
once, and a decided row rejecting a second decision. **No live Groq API
key or live Supabase instance was used for Phase 4** — unlike Phase 3.5,
this was unit-tested only; see the Phase 4 completion report for exactly
what that does and doesn't cover.

`adminShortcutDetector.test.ts` (pure, no jsdom needed — double-tap timing,
wrong-key reset, editable-target guard) and `adminCode.test.ts`
(fails closed without `ADMIN_CODE_HASH`, constant-time correct/incorrect
comparison) cover the hidden entry point; `adminActions.test.ts` gained
rate-limit and wrong-code cases ahead of the existing Supabase-credential
ones. `schedulerLock.test.ts`, `updatePlans.test.ts`,
`updatePlanActions.test.ts`, `opsConfig.test.ts`, `opsConfigActions.test.ts`,
`systemMaintenance.test.ts`, `github.test.ts`, `vercel.test.ts`, and
`pipeline.test.ts` (one case per state-machine branch: precheck
unavailable/failed, deploy failed, verify unavailable, health check failed
with and without auto-rollback enabled, full success) cover Phase 5+6, all
against mocked Supabase/GitHub/Vercel clients. The two cron route handlers
(`weekly-check/route.test.ts`, `weekly-update/route.test.ts`) cover the
`CRON_SECRET` fail-closed check and the scheduler-lock short-circuit.
**No live Vercel Cron firing, live GitHub Actions run, live Vercel
deploy/rollback, or live Groq-assisted risk summary was exercised** — every
integration's "not configured" path is what the test suite actually runs.

The Scheduled Health Report above (added after Phase 5+6) follows the
identical convention: `discord.test.ts`, `healthReport.test.ts`, and
`health-check/route.test.ts` cover it the same way, against mocked
fetch/Supabase — no live Discord webhook or live game server deployment
was exercised either.

## Related Documents

- [`../teacher/teacher.md`](../teacher/teacher.md)
- [`../security/security.md`](../security/security.md)
- [`../adr/0003-admin-authentication.md`](../adr/0003-admin-authentication.md)
- [`../adr/0004-maintenance-gate.md`](../adr/0004-maintenance-gate.md)
- [`../adr/0005-ai-ops-tool-registry.md`](../adr/0005-ai-ops-tool-registry.md)
- [`../adr/0006-hidden-admin-entry.md`](../adr/0006-hidden-admin-entry.md)
- [`../adr/0007-scheduler-and-deployment-pipeline.md`](../adr/0007-scheduler-and-deployment-pipeline.md)
- [`../cheat-tool/cheat-tool.md`](../cheat-tool/cheat-tool.md)
