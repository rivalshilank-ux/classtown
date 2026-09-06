"use server";

import { getCurrentAdmin } from "@/lib/auth/getCurrentAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTool } from "@/lib/ai/toolRegistry";

export type ApprovalActionResult =
  | { success: true }
  | { success: false; error: string };

const GENERIC_ERROR = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export async function rejectApproval(id: unknown): Promise<ApprovalActionResult> {
  if (typeof id !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, error: GENERIC_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  // The `eq("status", "pending")` guard is what actually prevents deciding
  // an already-decided row twice under a race (two admins, or a double
  // click) -- not a check-then-update in application code.
  const { data, error } = await supabase
    .from("ai_tool_executions")
    .update({ status: "rejected", decided_by: admin.id, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("rejectApproval failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }
  if (!data) {
    return { success: false, error: "이미 처리된 요청입니다." };
  }

  return { success: true };
}

export async function approveApproval(id: unknown): Promise<ApprovalActionResult> {
  if (typeof id !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, error: GENERIC_ERROR };
  }

  const supabase = await createSupabaseServerClient();

  // Claim the row first (pending -> approved), same race guard as reject.
  // Only the claimer goes on to actually run the handler.
  const { data: claimed, error: claimError } = await supabase
    .from("ai_tool_executions")
    .update({ status: "approved", decided_by: admin.id, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, tool_name, input")
    .maybeSingle();

  if (claimError) {
    console.error("approveApproval failed to claim row:", claimError.message);
    return { success: false, error: GENERIC_ERROR };
  }
  if (!claimed) {
    return { success: false, error: "이미 처리된 요청입니다." };
  }

  const tool = getTool(claimed.tool_name);
  if (!tool) {
    await supabase
      .from("ai_tool_executions")
      .update({ status: "failed", error: "unknown tool" })
      .eq("id", claimed.id);
    return { success: false, error: "알 수 없는 작업입니다." };
  }

  // Approving is the human authorization; the underlying action runs the
  // same way it would if an admin had clicked the button directly, tagged
  // "admin" in the audit log -- the AI only ever proposed it (see
  // ai_tool_executions.requested_by for that half of the story).
  const result = await tool.handler(claimed.input, "admin");

  const { error: recordError } = await supabase
    .from("ai_tool_executions")
    .update({
      status: result.ok ? "executed" : "failed",
      result: result.ok ? ((result.data ?? {}) as never) : null,
      error: result.ok ? null : (result.message ?? "실행에 실패했습니다."),
      executed_at: new Date().toISOString(),
    })
    .eq("id", claimed.id);

  if (recordError) {
    // Best-effort bookkeeping: the underlying action already ran (or
    // failed) above -- a failure to record that here doesn't change what
    // actually happened, only the audit trail's freshness.
    console.error("Failed to record AI tool execution result:", recordError.message);
  }

  if (!result.ok) {
    return { success: false, error: result.message ?? GENERIC_ERROR };
  }

  return { success: true };
}
