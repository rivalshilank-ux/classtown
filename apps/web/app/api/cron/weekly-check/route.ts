import { NextResponse, type NextRequest } from "next/server";
import { acquireSchedulerLock, currentRunKey, finishSchedulerRun } from "@/lib/deploy/schedulerLock";
import { createSystemUpdatePlan } from "@/lib/deploy/updatePlans";

// Sunday 19:00 KST (apps/web/vercel.json: 0 10 * * 0 UTC). Not reachable
// without CRON_SECRET -- see isAuthorized below.
export const dynamic = "force-dynamic";

const JOB_NAME = "weekly-check";

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
    // Another invocation already owns this week's run -- not an error.
    return NextResponse.json({ status: "already run this week" });
  }

  const plan = await createSystemUpdatePlan();
  await finishSchedulerRun(JOB_NAME, runKey, plan ? "completed" : "failed");

  return NextResponse.json({ status: plan ? "created" : "failed", planId: plan?.id ?? null });
}
