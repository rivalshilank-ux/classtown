import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums, Json } from "@classtown/shared-types/database";
import { pageRange, type PagedResult } from "@/lib/admin/pagination";

export type AuditRiskLevel = Enums<"audit_risk_level">;
export type AuditStatus = Enums<"audit_status">;
export type AuditActorType = Enums<"audit_actor_type">;

/** 'system' is deliberately excluded -- it's reserved for session-less service-role inserts that never go through this RPC at all. */
export type LoggableActorType = Extract<AuditActorType, "admin" | "ai">;

export interface RecordAuditLogInput {
  action: string;
  targetType?: string;
  targetId?: string;
  riskLevel?: AuditRiskLevel;
  status?: AuditStatus;
  metadata?: Record<string, unknown>;
  /** Defaults to "admin". Set to "ai" only when AI Ops auto-executed a LOW-risk tool -- see docs/adr/0005-ai-ops-tool-registry.md. */
  actorType?: LoggableActorType;
}

/**
 * Best-effort by design: a logging failure must never block the admin action
 * it describes (a login/logout that already succeeded shouldn't fail because
 * the audit write did). There is deliberately no way to pass an actor id --
 * record_audit_log() always stamps auth.uid() server-side, so this function
 * cannot be used to log an action under anyone else's identity. actorType
 * only distinguishes *who decided to act* (a human vs. AI Ops), never *whose
 * session it ran under*.
 */
export async function recordAuditLog(input: RecordAuditLogInput): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("record_audit_log", {
    p_action: input.action,
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_risk_level: input.riskLevel ?? "low",
    p_status: input.status ?? "success",
    p_metadata: (input.metadata ?? {}) as Json,
    p_actor_type: input.actorType ?? "admin",
  });

  if (error) {
    console.error("record_audit_log failed:", error.message);
  }
}

export interface AuditLogEntry {
  id: string;
  actorType: AuditActorType;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  riskLevel: AuditRiskLevel;
  status: AuditStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const AUDIT_PAGE_SIZE = 20;

export async function listAuditLogs(page = 1): Promise<PagedResult<AuditLogEntry>> {
  const supabase = await createSupabaseServerClient();
  const { from, to } = pageRange(page, AUDIT_PAGE_SIZE);

  const { data, count, error } = await supabase
    .from("admin_audit_logs")
    .select(
      "id, actor_type, actor_id, action, target_type, target_id, risk_level, status, metadata, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data) {
    return { items: [], total: 0 };
  }

  return {
    items: data.map((row) => ({
      id: row.id,
      actorType: row.actor_type,
      actorId: row.actor_id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      riskLevel: row.risk_level,
      status: row.status,
      metadata: (row.metadata as Record<string, unknown> | null) ?? {},
      createdAt: row.created_at,
    })),
    total: count ?? 0,
  };
}
