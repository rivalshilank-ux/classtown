# 0007: A Weekly Pipeline That Stops Instead of Guessing

## Status

Accepted.

## Context

Phase 4 shipped `deploy_release`/`rollback_release`/`restart_game_server` as
Tool Registry entries that honestly returned "not configured" — there was
nowhere to deploy to yet, and no plan record to attach an approval to.
Phases 5 and 6 fill that in: a Sunday job proposes an update plan, an admin
approves it, and a Saturday job actually walks it through precheck →
maintenance → deploy → verify → (rollback if needed). Every prior phase of
this project has refused to fabricate success for infrastructure this
sandbox doesn't have (no `GITHUB_TOKEN`, no `VERCEL_TOKEN`, no deploy hook
configured here); this phase is no exception; every integration below has a
real API shape and an honest "not configured" result.

## Decision

**Two independent locks, one enum.** `scheduler_runs (job_name, run_key)` is
a unique constraint, not an application-level check — `acquireSchedulerLock`
does `upsert(..., {onConflict: "job_name,run_key", ignoreDuplicates: true})`
and treats "no row came back" as "someone else already owns this run," the
same pattern proven against real concurrent transactions by
`maintenance_windows_one_active_idx` in Phase 3.5. `run_key` is a KST date
bucket (`Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Seoul", ...})`, never
`new Date(x.toLocaleString())` — that round-trips through the *server's*
local timezone, not Seoul's), so a retried or overlapping Vercel Cron
invocation on the same calendar day is a no-op, not a double-run.

**The state machine never skips a step, and "failed" is a real stop, not a
detour.** `update_executions.state` walks
`prechecking → maintenance → deploying → verifying → completed`, or
`→ failed` / `→ rolling_back → rolled_back`. `runWeeklyUpdatePipeline()`
(`apps/web/src/lib/deploy/pipeline.ts`) writes the new state to the database
*before* running the check for that state, so a crash mid-pipeline leaves an
honest, inspectable "we got this far" record rather than a row stuck at
whatever state was written last on success. A single `fail()` closure is the
only path that can mark an execution `failed` — it always disables
maintenance and writes an audit log, so there is no route through this
function that leaves the site stuck in maintenance mode with no explanation
in the log.

**Precheck asks "is `master` green right now," it does not trigger and wait.**
`getWorkflowConclusion()` (`apps/web/src/lib/deploy/github.ts`) reads the
conclusion of the most recent completed run of `.github/workflows/ci.yml`
via the Actions REST API. The original plan described a second,
`workflow_dispatch`-triggered workflow file for this; it was dropped during
implementation once it became clear the real design needs no such trigger —
`ci.yml` already runs on every push to `master`, so by the time Saturday's job
asks, an answer already exists. A dispatch-and-poll workflow would have had
no caller and would have doubled CI cost for no benefit.

**Deploy is a webhook, not a push.** `triggerDeployHook()` POSTs to
`VERCEL_DEPLOY_HOOK_URL` — Vercel builds and deploys whatever is already on
`master`. This pipeline never runs `git push`; the only "release" is a
decision to build what's already there. Verification
(`getLatestProductionDeployment()`) polls the real Vercel Deployments API
for `readyState`; a non-`READY` result is a failed health check, never
assumed-passing.

**Rollback promotes a checkpoint captured before anything changed, and is
opt-in.** Before the first write, the pipeline records
`checkpoint_deployment_id` — whatever was in production a moment ago. If
verification fails, rollback runs `promoteDeployment(checkpointDeploymentId)`
(Vercel's real `v10/projects/{id}/promote/{deploymentId}`) **only if**
`ops_config.auto_rollback_enabled` is true and both the checkpoint ID and
`VERCEL_TOKEN` exist. Otherwise the pipeline stops at `failed` with
maintenance disabled and a `high`-risk audit entry — it hands the situation
to an admin rather than guessing that an untested rollback path is safer
than leaving a known-bad deploy up. This project has never verified it has a
database backup/restore story, so "rollback" here means "promote the
previous Vercel deployment," not "undo any data changes that shipped with
it" — a real update that also carries a breaking migration is not something
this pipeline can safely reverse, and it does not pretend to.

**Every write from a cron context uses the service role, never the RPC.**
`record_audit_log()` requires `is_admin()`, which is always false with no
admin session. `systemMaintenance.ts` inserts into `admin_audit_logs`
directly via the service-role client with `actor_type: 'system'`,
`actor_id: null` — the same reserved actor type documented in Phase 2 /
ADR 0005 for exactly this situation. `update_plans`/`update_executions` have
no client `INSERT` policy at all; only the service role (the scheduler)
creates rows, mirroring `join_tickets`. Admins can `SELECT` both tables and
`UPDATE` only `update_plans.status`/`approved_by`/`approved_at` (to approve
or cancel) — RLS enforces that an admin approves a plan, never authors one
directly as if it were their own action.

**`ops_config` defaults to every flag `false`.** Adding a `crons` array to
`apps/web/vercel.json` has a real effect the moment this branch is deployed
— Vercel will start invoking `/api/cron/weekly-check` and
`/api/cron/weekly-update` on schedule. Both routes require
`Authorization: Bearer $CRON_SECRET` and fail closed (401) if `CRON_SECRET`
isn't set, exactly like every other fail-closed gate in this project. Past
that gate, `weekly-check` always creates a plan (that's just a proposal,
reviewed via `/admin/updates`) but `weekly-update` exits at `skipped` unless
an admin has explicitly turned `auto_update_enabled` on — so a fresh
deploy of this feature, before any admin touches the toggle, changes nothing
in production.

## Consequences

- An admin must actively approve a plan and enable `auto_update_enabled`
  before anything in this pipeline can touch production; there is no
  "silently starts automating deploys" failure mode.
- A failed pipeline always leaves maintenance mode off and an audit trail
  behind — never a site stuck down with no record of why.
- Rollback is bounded to "promote the last known-good Vercel deployment." A
  release that requires a coordinated data migration rollback is out of
  scope and must be handled by an admin manually; the pipeline reports
  `failed` and stops rather than claiming to have fixed it.
- **Not verified in this sandbox**: an actual Vercel Cron invocation, an
  actual GitHub Actions run, an actual Vercel deploy/promote call, or a
  Groq-assisted risk summary. No `GITHUB_TOKEN`, `VERCEL_TOKEN`, deploy hook,
  or `CRON_SECRET` exists here — every integration's "not configured" path
  is what's exercised by the test suite; the "real API called successfully"
  path is verified against the documented request/response shapes only.
