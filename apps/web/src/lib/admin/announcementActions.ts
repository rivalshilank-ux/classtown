"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditLog } from "@/lib/admin/audit";
import { createAnnouncementDraftCore, type AdminActionResult } from "@/lib/admin/announcementCore";

export type { AdminActionResult };

const GENERIC_ERROR = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export async function createAnnouncementDraft(
  input: unknown,
): Promise<AdminActionResult<{ id: string }>> {
  return createAnnouncementDraftCore(input, "admin");
}

/**
 * "Publish now," regardless of any scheduled_at on the row -- there is no
 * scheduler yet to act on scheduled_at automatically (that's Phase 5). This
 * is the only way an announcement actually becomes publicly visible today.
 */
export async function publishAnnouncement(id: unknown): Promise<AdminActionResult> {
  if (typeof id !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("system_announcements")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("publishAnnouncement failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }

  await recordAuditLog({
    action: "announcement.publish",
    targetType: "announcement",
    targetId: id,
    riskLevel: "medium",
  });

  return { success: true, data: null };
}

/** Retires an announcement early. A row also stops showing publicly on its own once expires_at passes, with no action needed. */
export async function expireAnnouncement(id: unknown): Promise<AdminActionResult> {
  if (typeof id !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("system_announcements")
    .update({ status: "expired" })
    .eq("id", id);

  if (error) {
    console.error("expireAnnouncement failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }

  await recordAuditLog({
    action: "announcement.expire",
    targetType: "announcement",
    targetId: id,
    riskLevel: "low",
  });

  return { success: true, data: null };
}
