"use server";

import { getCurrentAdmin } from "@/lib/auth/getCurrentAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/admin/audit";

export type UpdatePlanActionResult = { success: true } | { success: false; error: string };

const GENERIC_ERROR = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export async function approveUpdatePlan(id: unknown): Promise<UpdatePlanActionResult> {
  if (typeof id !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, error: GENERIC_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  // The `eq("status", "planned")` guard is the real protection against
  // approving an already-decided plan twice under a race -- same pattern
  // already proven for ai_tool_executions in Phase 4.
  const { data, error } = await supabase
    .from("update_plans")
    .update({ status: "approved", approved_by: admin.id, approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "planned")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("approveUpdatePlan failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }
  if (!data) {
    return { success: false, error: "이미 처리되었거나 승인할 수 없는 상태입니다." };
  }

  await recordAuditLog({
    action: "update_plan.approve",
    targetType: "update_plan",
    targetId: id,
    riskLevel: "high",
  });

  return { success: true };
}

export async function cancelUpdatePlan(id: unknown): Promise<UpdatePlanActionResult> {
  if (typeof id !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, error: GENERIC_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("update_plans")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["planned", "approved"])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("cancelUpdatePlan failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }
  if (!data) {
    return { success: false, error: "이미 처리된 계획입니다." };
  }

  await recordAuditLog({
    action: "update_plan.cancel",
    targetType: "update_plan",
    targetId: id,
    riskLevel: "medium",
  });

  return { success: true };
}
