"use server";

import { z } from "zod";
import { getCurrentAdmin } from "@/lib/auth/getCurrentAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/admin/audit";

export type OpsConfigActionResult = { success: true } | { success: false; error: string };

const GENERIC_ERROR = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

const updateSchema = z.object({
  autoUpdateEnabled: z.boolean(),
  autoAnnouncementEnabled: z.boolean(),
  autoRollbackEnabled: z.boolean(),
});

export async function updateOpsConfig(input: unknown): Promise<OpsConfigActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "입력값을 확인해 주세요." };
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, error: GENERIC_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("ops_config")
    .update({
      auto_update_enabled: parsed.data.autoUpdateEnabled,
      auto_announcement_enabled: parsed.data.autoAnnouncementEnabled,
      auto_rollback_enabled: parsed.data.autoRollbackEnabled,
      updated_by: admin.id,
    })
    .eq("singleton", true);

  if (error) {
    console.error("updateOpsConfig failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }

  await recordAuditLog({
    action: "ops_config.update",
    targetType: "ops_config",
    riskLevel: "high",
    metadata: { ...parsed.data },
  });

  return { success: true };
}
