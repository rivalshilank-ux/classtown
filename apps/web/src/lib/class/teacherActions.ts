"use server";

import { classNameSchema } from "@classtown/shared-schema";
import type { ClassRecord } from "@classtown/shared-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ClassActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const GENERIC_ERROR = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const NAME_ERROR = "학급 이름을 확인해 주세요.";

function toClassRecord(row: {
  id: string;
  name: string;
  class_code: string;
  join_mode: "open" | "roster";
  join_open: boolean;
  archived_at: string | null;
  created_at: string;
}): ClassRecord {
  return {
    id: row.id,
    name: row.name,
    classCode: row.class_code,
    joinMode: row.join_mode,
    joinOpen: row.join_open,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

/**
 * Every action here runs on the teacher's own session, so ownership is enforced
 * by RLS rather than by a teacher id travelling in the request.
 */
export async function createClass(
  input: unknown,
): Promise<ClassActionResult<ClassRecord>> {
  const parsed = classNameSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: NAME_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_class", {
    p_name: parsed.data,
  });

  if (error || !data) {
    // Never sent to the browser -- the client only ever sees GENERIC_ERROR.
    // Without this, a misapplied migration or a missing teacher_accounts row
    // fails completely silently, with no trail to diagnose it from.
    console.error("create_class failed:", error?.message ?? "no row returned");
    return { success: false, error: GENERIC_ERROR };
  }

  return { success: true, data: toClassRecord(data) };
}

export async function regenerateClassCode(
  classId: unknown,
): Promise<ClassActionResult<string>> {
  if (typeof classId !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("regenerate_class_code", {
    p_class_id: classId,
  });

  if (error || !data) {
    console.error("regenerate_class_code failed:", error?.message ?? "no row returned");
    return { success: false, error: GENERIC_ERROR };
  }

  return { success: true, data };
}

/** "Delete class" in the UI. There is no DELETE policy to reach. */
export async function archiveClass(
  classId: unknown,
): Promise<ClassActionResult<null>> {
  if (typeof classId !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("classes")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", classId);

  if (error) {
    console.error("archiveClass failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }

  return { success: true, data: null };
}

export async function setClassJoinOpen(
  classId: unknown,
  joinOpen: unknown,
): Promise<ClassActionResult<null>> {
  if (typeof classId !== "string" || typeof joinOpen !== "boolean") {
    return { success: false, error: GENERIC_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("classes")
    .update({ join_open: joinOpen })
    .eq("id", classId);

  if (error) {
    console.error("setClassJoinOpen failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }

  return { success: true, data: null };
}
