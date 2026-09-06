-- The actual dedup lock for the two weekly cron jobs. A composite primary
-- key on (job_name, run_key) is what makes "acquire the lock" a single
-- atomic statement: `insert ... on conflict do nothing returning *`. No row
-- back means another invocation already owns this run -- this is the same
-- kind of real, DB-enforced guarantee already proven for
-- maintenance_windows_one_active_idx (verified against genuinely concurrent
-- transactions in Phase 3.5), not an application-level check-then-write.
create table public.scheduler_runs (
  job_name text not null,
  -- A date bucket (e.g. '2026-09-13') rather than a timestamp, so the lock
  -- is naturally scoped to "this job, this scheduled occurrence" and
  -- survives a serverless cold start or a retried invocation without
  -- needing a separate cleanup process.
  run_key text not null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  primary key (job_name, run_key)
);

comment on table public.scheduler_runs is
  'Written only by the scheduler routes under the service role. No client of any kind reads or writes this -- it exists purely so two concurrent cron invocations cannot both run the same weekly job.';

alter table public.scheduler_runs enable row level security;

-- Deliberately zero policies: RLS enabled with no policy denies every role
-- except the service role, which bypasses RLS entirely by design (the same
-- pattern already used for join_tickets).
