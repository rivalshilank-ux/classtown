import "server-only";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditLog, type LoggableActorType } from "@/lib/admin/audit";

export type AdminActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

const GENERIC_ERROR = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export const enableSchema = z.object({
  message: z.string().trim().min(1, "안내 메시지를 입력해 주세요.").max(500, "메시지가 너무 깁니다."),
  reason: z.string().trim().max(500, "사유가 너무 깁니다.").optional(),
});

/**
 * See announcementCore.ts's doc comment: this lives in a plain module (no
 * "use server") specifically so it can take an actorType parameter without
 * that parameter becoming a network-reachable argument on a Server Action.
 * Callers: the public enableMaintenance action (always "admin") and the AI
 * Ops tool registry (always "ai").
 */
export async function enableMaintenanceCore(
  input: unknown,
  actorType: LoggableActorType,
): Promise<AdminActionResult> {
  const parsed = enableSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "입력값을 확인해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: GENERIC_ERROR };
  }

  const { error } = await supabase.from("maintenance_windows").insert({
    message: parsed.data.message,
    reason: parsed.data.reason || null,
    created_by: user.id,
  });

  if (error) {
    // maintenance_windows_one_active_idx (a partial unique index) is the
    // real guard against two active windows at once -- this branch is what
    // a second admin hits if they both submit at nearly the same time.
    console.error("enableMaintenance failed:", error.message);
    return { success: false, error: "이미 점검 중이거나 요청을 처리하지 못했습니다." };
  }

  await recordAuditLog({
    action: "maintenance.enable",
    targetType: "maintenance_window",
    riskLevel: "medium",
    metadata: { reason: parsed.data.reason || null },
    actorType,
  });

  return { success: true, data: null };
}

export async function disableMaintenanceCore(
  actorType: LoggableActorType,
): Promise<AdminActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("maintenance_windows")
    .update({ is_active: false, ends_at: new Date().toISOString() })
    .eq("is_active", true)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("disableMaintenance failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }

  if (!data) {
    return { success: false, error: "진행 중인 점검이 없습니다." };
  }

  await recordAuditLog({
    action: "maintenance.disable",
    targetType: "maintenance_window",
    targetId: data.id,
    riskLevel: "medium",
    actorType,
  });

  return { success: true, data: null };
}
