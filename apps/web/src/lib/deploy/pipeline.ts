import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getWorkflowConclusion } from "@/lib/deploy/github";
import {
  getLatestProductionDeployment,
  promoteDeployment,
  triggerDeployHook,
} from "@/lib/deploy/vercel";
import {
  disableSystemMaintenance,
  enableSystemMaintenance,
  recordSystemAuditLog,
} from "@/lib/deploy/systemMaintenance";
import { getLatestApprovedPlan } from "@/lib/deploy/updatePlans";
import { getOpsConfigForScheduler } from "@/lib/deploy/opsConfig";

export interface PipelineResult {
  ranAt: string;
  finalState: string;
  reason?: string;
}

async function setExecutionState(
  executionId: string,
  state: string,
  patch: Record<string, unknown> = {},
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("update_executions")
    .update({ state, ...patch } as never)
    .eq("id", executionId);
  if (error) {
    console.error(`Failed to set update_executions.state=${state}:`, error.message);
  }
}

async function setPlanStatus(planId: string, status: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("update_plans")
    .update({ status } as never)
    .eq("id", planId);
  if (error) {
    console.error(`Failed to set update_plans.status=${status}:`, error.message);
  }
}

/**
 * Walks update_executions.state through every step in order -- no state is
 * ever skipped. Stops (state: "failed") the moment any real check comes
 * back anything other than a real success; never fabricates a passing
 * result to keep going. See docs/adr/0007-scheduler-and-deployment-pipeline.md.
 */
export async function runWeeklyUpdatePipeline(): Promise<PipelineResult> {
  const ranAt = new Date().toISOString();
  const supabase = createSupabaseServiceClient();

  const config = await getOpsConfigForScheduler();
  if (!config || !config.autoUpdateEnabled) {
    return { ranAt, finalState: "skipped", reason: "auto_update_enabled is false" };
  }

  const plan = await getLatestApprovedPlan();
  if (!plan) {
    return { ranAt, finalState: "skipped", reason: "no approved update plan" };
  }

  // Checkpoint before touching anything -- the "rollback point," not a
  // database backup (this project has never verified it has one -- see the
  // ADR).
  const priorDeployment = await getLatestProductionDeployment();
  const checkpointDeploymentId = priorDeployment.available ? priorDeployment.deployment.id : null;

  const { data: execution, error: execError } = await supabase
    .from("update_executions")
    .insert({
      update_plan_id: plan.id,
      state: "prechecking",
      checkpoint_deployment_id: checkpointDeploymentId,
    })
    .select("id")
    .single();

  if (execError || !execution) {
    console.error("Failed to create update_executions row:", execError?.message);
    return { ranAt, finalState: "failed", reason: "could not create update_executions row" };
  }

  const executionId: string = execution.id;

  async function fail(reason: string, action: string, metadata?: Record<string, unknown>) {
    await setExecutionState(executionId, "failed", { finished_at: new Date().toISOString() });
    await setPlanStatus(plan!.id, "failed");
    await disableSystemMaintenance();
    await recordSystemAuditLog({
      action,
      targetType: "update_plan",
      targetId: plan!.id,
      riskLevel: "high",
      status: "failed",
      metadata,
    });
    return { ranAt, finalState: "failed", reason };
  }

  // PRECHECKING: is main's HEAD actually green?
  const workflowStatus = await getWorkflowConclusion();
  await setExecutionState(executionId, "prechecking", {
    precheck_result: workflowStatus,
  });

  if (!workflowStatus.available) {
    return await fail(`precheck unavailable: ${workflowStatus.reason}`, "update.precheck_unavailable");
  }
  if (workflowStatus.conclusion !== "success") {
    return await fail("precheck failed: master is not green", "update.precheck_failed", {
      conclusion: workflowStatus.conclusion,
    });
  }

  // MAINTENANCE
  await setExecutionState(executionId, "maintenance");
  await enableSystemMaintenance("자동 업데이트 진행 중입니다. 잠시 후 다시 이용해 주세요.");

  // DEPLOYING (the build itself happens as part of Vercel's own deploy-hook build)
  await setExecutionState(executionId, "deploying");
  const deployResult = await triggerDeployHook();

  if (!deployResult.ok) {
    return await fail(deployResult.message, "update.deploy_failed", { message: deployResult.message });
  }

  // VERIFYING
  await setExecutionState(executionId, "verifying");
  const latestDeployment = await getLatestProductionDeployment();

  if (!latestDeployment.available) {
    await setExecutionState(executionId, "verifying", {
      health_check_result: latestDeployment,
    });
    return await fail(
      `cannot verify deployment: ${latestDeployment.reason}`,
      "update.verify_unavailable",
    );
  }

  const healthOk = latestDeployment.deployment.readyState === "READY";
  await setExecutionState(executionId, "verifying", {
    health_check_result: latestDeployment.deployment,
  });

  if (!healthOk) {
    await setExecutionState(executionId, "rolling_back");

    if (config.autoRollbackEnabled && checkpointDeploymentId) {
      const rollback = await promoteDeployment(checkpointDeploymentId);
      await setExecutionState(executionId, rollback.ok ? "rolled_back" : "failed", {
        finished_at: new Date().toISOString(),
      });
      await setPlanStatus(plan.id, rollback.ok ? "rolled_back" : "failed");
      await disableSystemMaintenance();
      await recordSystemAuditLog({
        action: "update.rollback",
        targetType: "update_plan",
        targetId: plan.id,
        riskLevel: "critical",
        status: rollback.ok ? "success" : "failed",
        metadata: rollback.ok ? undefined : { message: rollback.message },
      });
      return { ranAt, finalState: rollback.ok ? "rolled_back" : "failed" };
    }

    return await fail(
      "health check failed, rollback not enabled or not configured",
      "update.health_check_failed",
    );
  }

  // COMPLETED
  await setExecutionState(executionId, "completed", { finished_at: new Date().toISOString() });
  await setPlanStatus(plan.id, "completed");
  await disableSystemMaintenance();
  await recordSystemAuditLog({
    action: "update.completed",
    targetType: "update_plan",
    targetId: plan.id,
    riskLevel: "medium",
    status: "success",
  });

  if (config.autoAnnouncementEnabled) {
    const { error: announceError } = await supabase.from("system_announcements").insert({
      title: "업데이트 완료 안내",
      body: "ClassTown이 새로운 버전으로 업데이트되었습니다.",
      status: "published",
      published_at: new Date().toISOString(),
    });
    if (announceError) {
      console.error("Failed to auto-publish completion announcement:", announceError.message);
    }
  }

  return { ranAt, finalState: "completed" };
}
