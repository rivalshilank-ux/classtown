import { NextResponse, type NextRequest } from "next/server";
import { acquireSchedulerLock, currentRunKey, finishSchedulerRun } from "@/lib/deploy/schedulerLock";
import { runScheduledHealthReport } from "@/lib/deploy/healthReport";

// Once daily (apps/web/vercel.json). Not reachable without CRON_SECRET --
// see isAuthorized below. Disabled by default via
// ops_config.auto_health_report_enabled -- see docs/operations/operations.md.
export const dynamic = "force-dynamic";

const JOB_NAME = "health-check";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fails closed: an unconfigured secret must not turn into "anyone can
    // trigger this."
    return false;
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const runKey = currentRunKey();
  const acquired = await acquireSchedulerLock(JOB_NAME, runKey);
  if (!acquired) {
    // Another invocation already owns today's run -- not an error.
    return NextResponse.json({ status: "already run today" });
  }

  const result = await runScheduledHealthReport();
  await finishSchedulerRun(JOB_NAME, runKey, result.outcome);

  return NextResponse.json({ status: result.outcome, gameServer: result.gameServer ?? null });
}
