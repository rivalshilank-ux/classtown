import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * The scheduler's own maintenance control and audit-log writer, using the
 * service role directly -- not maintenanceCore.ts (which needs a
 * cookie-based admin session a cron invocation never has) and not
 * record_audit_log() (which requires is_admin(), always false with no
 * session). This is exactly the 'system' actor path Phase 2/ADR 0005
 * reserved for genuinely session-less server code.
 */

export async function recordSystemAuditLog(input: {
  action: string;
  targetType?: string;
  targetId?: string;
  riskLevel?: "low" | "medium" | "high" | "critical";
  status?: "success" | "failed" | "pending";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_type: "system",
    actor_id: null,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    risk_level: input.riskLevel ?? "low",
    status: input.status ?? "success",
    metadata: (input.metadata ?? {}) as never,
  });

  if (error) {
    console.error("recordSystemAuditLog failed:", error.message);
  }
}

export async function enableSystemMaintenance(message: string, reason?: string): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("maintenance_windows").insert({
    message,
    reason: reason ?? "자동 업데이트 파이프라인",
  });

  if (error) {
    console.error("enableSystemMaintenance failed:", error.message);
    return false;
  }

  await recordSystemAuditLog({
    action: "maintenance.enable",
    targetType: "maintenance_window",
    riskLevel: "medium",
    metadata: { reason: reason ?? null },
  });
  return true;
}

export async function disableSystemMaintenance(): Promise<boolean> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("maintenance_windows")
    .update({ is_active: false, ends_at: new Date().toISOString() })
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("disableSystemMaintenance failed:", error.message);
    return false;
  }
  if (!data) {
    // Nothing was active -- not an error, just nothing to do.
    return true;
  }

  await recordSystemAuditLog({
    action: "maintenance.disable",
    targetType: "maintenance_window",
    targetId: data.id,
    riskLevel: "medium",
  });
  return true;
}
