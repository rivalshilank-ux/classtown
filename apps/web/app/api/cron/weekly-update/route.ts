import { NextResponse, type NextRequest } from "next/server";
import { acquireSchedulerLock, currentRunKey, finishSchedulerRun } from "@/lib/deploy/schedulerLock";
import { runWeeklyUpdatePipeline } from "@/lib/deploy/pipeline";

// Saturday 03:00 KST (apps/web/vercel.json: 0 18 * * 5 UTC, i.e. Friday
// 18:00 UTC). Not reachable without CRON_SECRET -- see isAuthorized below.
export const dynamic = "force-dynamic";

const JOB_NAME = "weekly-update";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
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
    return NextResponse.json({ status: "already run this week" });
  }

  const result = await runWeeklyUpdatePipeline();
  await finishSchedulerRun(JOB_NAME, runKey, result.finalState);

  return NextResponse.json(result);
}
