import "server-only";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAuditLog, type LoggableActorType } from "@/lib/admin/audit";

export type AdminActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

const GENERIC_ERROR = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const VALIDATION_ERROR = "제목과 내용을 확인해 주세요.";

export const draftSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해 주세요.").max(100, "제목이 너무 깁니다."),
  body: z.string().trim().min(1, "내용을 입력해 주세요.").max(2000, "내용이 너무 깁니다."),
});

/**
 * The actual logic behind createAnnouncementDraft, in a plain module (no
 * "use server") so it can take an actorType param without that param ever
 * becoming a network-reachable argument -- every exported async function in
 * a "use server" file becomes an invokable Server Action regardless of
 * intent, so accepting "who's calling" as a parameter belongs here, not on
 * the public action in announcementActions.ts. Callers: the public
 * createAnnouncementDraft action (always "admin") and the AI Ops tool
 * registry (always "ai") -- see docs/adr/0005-ai-ops-tool-registry.md.
 */
export async function createAnnouncementDraftCore(
  input: unknown,
  actorType: LoggableActorType,
): Promise<AdminActionResult<{ id: string }>> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: VALIDATION_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: GENERIC_ERROR };
  }

  const { data, error } = await supabase
    .from("system_announcements")
    .insert({ title: parsed.data.title, body: parsed.data.body, created_by: user.id })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createAnnouncementDraft failed:", error?.message ?? "no row returned");
    return { success: false, error: GENERIC_ERROR };
  }

  await recordAuditLog({
    action: "announcement.create",
    targetType: "announcement",
    targetId: data.id,
    riskLevel: "low",
    actorType,
  });

  return { success: true, data: { id: data.id } };
}
