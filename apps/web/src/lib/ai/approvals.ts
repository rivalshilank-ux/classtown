import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@classtown/shared-types/database";
import type { RiskLevel } from "@/lib/ai/toolRegistry";

export type AiExecutionStatus = Enums<"ai_execution_status">;

export interface PendingApproval {
  id: string;
  toolName: string;
  riskLevel: RiskLevel;
  input: unknown;
  status: AiExecutionStatus;
  createdAt: string;
}

/** Only ever the still-open queue -- decided rows stay in the table for audit history but don't need to reload on every visit. */
export async function listPendingApprovals(): Promise<PendingApproval[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("ai_tool_executions")
    .select("id, tool_name, risk_level, input, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    toolName: row.tool_name,
    riskLevel: row.risk_level,
    input: row.input,
    status: row.status,
    createdAt: row.created_at,
  }));
}
