import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Enums } from "@classtown/shared-types/database";
import { getRecentCommits, type RecentCommit } from "@/lib/ai/github";

export type UpdateState = Enums<"update_state">;

export interface UpdatePlanSummary {
  id: string;
  status: UpdateState;
  summary: string;
  riskLevel: Enums<"audit_risk_level">;
  createdByType: Enums<"audit_actor_type">;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export async function listUpdatePlans(limit = 20): Promise<UpdatePlanSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("update_plans")
    .select(
      "id, status, summary, risk_level, created_by_type, approved_by, approved_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    status: row.status,
    summary: row.summary,
    riskLevel: row.risk_level,
    createdByType: row.created_by_type,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
  }));
}

export interface UpdateExecutionSummary {
  id: string;
  state: UpdateState;
  startedAt: string;
  finishedAt: string | null;
  checkpointDeploymentId: string | null;
}

/** Admin-session read of a plan's attempt history -- the pipeline itself only ever writes via the service role. */
export async function listUpdateExecutions(planId: string): Promise<UpdateExecutionSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("update_executions")
    .select("id, state, started_at, finished_at, checkpoint_deployment_id")
    .eq("update_plan_id", planId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    state: row.state,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    checkpointDeploymentId: row.checkpoint_deployment_id,
  }));
}

/** What the Saturday pipeline is actually allowed to act on -- service role, no admin session in a cron context. */
export async function getLatestApprovedPlan(): Promise<{ id: string; summary: string } | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("update_plans")
    .select("id, summary")
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data;
}

function assessRisk(commits: RecentCommit[]): "low" | "medium" | "high" {
  const text = commits.map((c) => c.message.toLowerCase()).join("\n");
  if (/migration|drop table|drop column|\brls\b|delete from/.test(text)) {
    return "high";
  }
  if (/fix|security|patch/.test(text)) {
    return "medium";
  }
  return "low";
}

function buildSummary(commits: RecentCommit[], riskLevel: string): string {
  const lines = commits
    .slice(0, 10)
    .map((c) => `- ${c.sha} ${c.message}`)
    .join("\n");
  return `최근 ${commits.length}개 커밋 검토됨. 위험도: ${riskLevel}.\n${lines}`;
}

/**
 * The Sunday job's own writer -- service role, since a cron invocation has
 * no admin session. Falls back to a plain heuristic (see assessRisk) when
 * Groq isn't configured; plan creation is never blocked on AI being
 * unavailable.
 */
export async function createSystemUpdatePlan(): Promise<{ id: string } | null> {
  const supabase = createSupabaseServiceClient();
  const commits = await getRecentCommits(20);
  const commitList = commits.available ? commits.commits : [];
  const riskLevel = assessRisk(commitList);
  const summary = commits.available
    ? buildSummary(commitList, riskLevel)
    : `커밋 내역을 가져오지 못했습니다 (${commits.reason}). 관리자가 직접 검토해야 합니다.`;

  const { data, error } = await supabase
    .from("update_plans")
    .insert({
      summary,
      changes: { commits: commitList } as never,
      risk_level: riskLevel,
      created_by_type: "system",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createSystemUpdatePlan failed:", error?.message ?? "no row returned");
    return null;
  }
  return data;
}

/**
 * The AI Ops on-demand path -- runs under the admin's own session (the
 * "Admins can propose an update plan" RLS policy), unlike the scheduler's
 * service-role writer above. Reused by the create_update_plan tool.
 */
export async function createUpdatePlanViaAdmin(): Promise<{ id: string } | null> {
  const supabase = await createSupabaseServerClient();
  const commits = await getRecentCommits(20);
  const commitList = commits.available ? commits.commits : [];
  const riskLevel = assessRisk(commitList);
  const summary = commits.available
    ? buildSummary(commitList, riskLevel)
    : `커밋 내역을 가져오지 못했습니다 (${commits.reason}). 관리자가 직접 검토해야 합니다.`;

  const { data, error } = await supabase
    .from("update_plans")
    .insert({
      summary,
      changes: { commits: commitList } as never,
      risk_level: riskLevel,
      created_by_type: "ai",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createUpdatePlanViaAdmin failed:", error?.message ?? "no row returned");
    return null;
  }
  return data;
}
