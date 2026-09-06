# 0005: AI Ops — the LLM Proposes, a Fixed Tool Registry Authorizes

## Status

Accepted — Phase 4.

## Context

Phase 4 gives `/admin/ai` an assistant (Groq) that can diagnose ClassTown's
operational state and take some actions on an admin's behalf. The one hard
requirement carried through every prior phase of this project is that the
client is never the final authority on anything — Phase 4 extends that
principle to the LLM itself: its own output must never be the thing that
decides whether an action is allowed to happen, for the same reason a
browser's client-side check was never allowed to be the real gate for admin
access, maintenance, or RLS.

Phases 5 (Scheduler) and 6 (Automated Deployment) don't exist yet, so this
phase is also bounded by what can honestly be done today: no CI, no
deployment tracking, no `update_plans` table.

## Decision

**Risk level is a hardcoded field on a fixed registry entry, never something
derived from the model's output.** `apps/web/src/lib/ai/toolRegistry.ts`
defines every tool the model may call as a plain object literal —
`{ name, description, riskLevel, parameters, inputSchema, handler }`. The
model receives only `name`/`description`/`parameters` (as OpenAI-compatible
function-calling tool definitions) and can only ever request a tool by
*name*; it has no channel to claim a different risk level for itself or to
invent a tool that isn't in the array. Every tool call's arguments are
re-validated with a `zod` schema server-side regardless of what JSON the
model produced — Groq's own docs note the model "does not always generate
valid JSON, and may hallucinate parameters," so this validation is not
optional.

**`low`-risk tools execute immediately; everything else is queued.**
`isAutoExecuted(riskLevel)` is `true` only for `"low"`. A `medium`+ proposal
is written to a new `public.ai_tool_executions` row with `status =
'pending'` and its handler is **never called** at that point — the row is
the only thing that happens. An admin must click Approve on `/admin/ai`,
which independently re-checks `getCurrentAdmin()` and then calls the exact
same `tool.handler` the auto-execute path would have called. There is no
second, more-privileged code path for "the AI's execution" — approving runs
precisely the function a human clicking the equivalent button elsewhere in
the admin panel would run.

**Handlers are the existing, already-RLS-enforced action functions, not
new ones.** `enable_maintenance`/`disable_maintenance`/
`create_announcement_draft` call `enableMaintenanceCore`/
`disableMaintenanceCore`/`createAnnouncementDraftCore` — new files
(`maintenanceCore.ts`, `announcementCore.ts`) extracted from the existing
Phase 3 `"use server"` action files specifically so an `actorType` parameter
could be threaded through *without* that parameter ever becoming a
network-reachable argument. This matters because every exported async
function in a file marked `"use server"` becomes an invokable Server Action
regardless of intent — a plain, non-`"use server"` module was the only way
to let two trusted callers (the public action, and the tool registry) pass
different `actorType` values without exposing `actorType` as something a
client request could set on the public action.

**Attribution**: `record_audit_log()` gained an optional `p_actor_type`
(`'admin'` or `'ai'` only — never `'system'`, reserved for genuinely
session-less service-role inserts) so a `low`-risk tool the AI auto-executed
is distinguishable in `/admin/audit` from a human clicking the same button.
An *approved* `medium`+ action is still attributed to `'admin'`, not `'ai'`
— the admin's click is what actually authorized it; `ai_tool_executions`
(`requested_by` vs. `decided_by`) is where "the AI proposed this, this admin
approved it" is recorded, kept deliberately separate from the action-level
audit log.

**`runDiagnostics` (the only function that calls Groq) checks admin status
itself, before calling Groq.** Relying solely on `/admin/ai` being
route-guarded would still let a direct call to this Server Action spend
real Groq API quota before any downstream RLS check ever ran — the actual
DB writes are RLS-safe regardless, but an unauthorized, costly external API
call is a problem the DB layer can't prevent by itself.

**Diagnostics are not persisted.** Consistent with Phase 2's "don't audit
plain reads" rule, `low`-risk *read* tools (`get_system_health`,
`get_recent_admin_actions`, `get_git_changes`, `get_recent_errors`) return a
transient result shown once in the `/admin/ai` UI — no new table records
"what did the AI look at." Only real state changes (via the reused action
functions) or `medium`+ proposals (`ai_tool_executions`) are persisted.

**Nothing without real backing infrastructure pretends to work.**
`restart_game_server`/`deploy_release`/`rollback_release` are registered
with real risk levels (matching this project's own worked examples —
`get_system_health`→low, `create_announcement_draft`→low,
`restart_game_server`→medium, `deploy_release`→high; `rollback_release`→
critical, reasoned by analogy) so the registry and approval UI are complete
and real, but their handlers return an explicit "not configured" result —
`apps/game-server` has no deployment target and there is no Vercel API
wiring yet. `get_deployment_status`/`get_test_results`/`create_update_plan`
are not registered at all in Phase 4; they depend on infrastructure
(CI, `update_plans`) that Phase 5 owns, and a permanent stub tool would just
be more surface area to keep honest for no benefit before Phase 5 exists.

## Consequences

- No conversation history is stored — each `/admin/ai` request is
  single-shot (prompt in, tool calls + one summary out). A stored
  multi-turn chat can be added later without changing the security model
  above; it just wasn't needed to satisfy this phase's actual goal (the
  registry and approval mechanics).
- `GROQ_API_KEY`/`GITHUB_TOKEN` are both optional at the infrastructure
  level; the feature degrades to an honest "not configured" message rather
  than a crash or a fake response either way. This has not been exercised
  against a live Groq API key or a live Supabase project in this
  development session — see the Phase 4 completion report for what was and
  wasn't verified for real.
- `ai_tool_executions.input`/`tool_name`/`risk_level`/`requested_by` are
  immutable after creation (column-level grants, mirroring `classes`'
  pattern) — an admin can change a row's `status`/`result`/`error`/
  `decided_by`/`decided_at` by approving or rejecting it, but cannot alter
  what was actually proposed after the fact.

## Related Documents

- [`0003-admin-authentication.md`](./0003-admin-authentication.md)
- [`0004-maintenance-gate.md`](./0004-maintenance-gate.md)
- [`../admin/admin.md`](../admin/admin.md)
