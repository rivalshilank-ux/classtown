import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * A date bucket in Asia/Seoul (e.g. "2026-09-13"), so the lock is scoped to
 * "this job, this scheduled occurrence" regardless of which UTC instant the
 * invocation actually lands on. Uses Intl.DateTimeFormat directly rather
 * than round-tripping through `new Date(someLocalizedString)`, which would
 * silently reinterpret the formatted wall-clock string in the server's own
 * system timezone instead of Asia/Seoul.
 */
export function currentRunKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * The real dedup lock: `INSERT ... ON CONFLICT (job_name, run_key) DO
 * NOTHING` via upsert+ignoreDuplicates. A row coming back means this
 * invocation acquired the lock; an empty result means another invocation
 * already holds it for this job/run_key -- verified for real, under actual
 * concurrent transactions, for the identical pattern on
 * maintenance_windows_one_active_idx in Phase 3.5.
 */
export async function acquireSchedulerLock(jobName: string, runKey: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("scheduler_runs")
    .upsert(
      { job_name: jobName, run_key: runKey, status: "running" },
      { onConflict: "job_name,run_key", ignoreDuplicates: true },
    )
    .select("job_name");

  if (error) {
    // Fail closed: if we can't confirm we hold the lock, don't proceed as
    // though we do.
    console.error("acquireSchedulerLock failed:", error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

export async function finishSchedulerRun(
  jobName: string,
  runKey: string,
  status: string,
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("scheduler_runs")
    .update({ status, finished_at: new Date().toISOString() })
    .eq("job_name", jobName)
    .eq("run_key", runKey);

  if (error) {
    console.error("finishSchedulerRun failed:", error.message);
  }
}
