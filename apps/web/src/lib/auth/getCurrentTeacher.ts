import "server-only";
import type { TeacherAccount } from "@classtown/shared-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@classtown/shared-types/database";

type TeacherAccountRow = Tables<"teacher_accounts">;

function mapRow(row: TeacherAccountRow, emailVerified: boolean): TeacherAccount {
  return {
    id: row.id,
    role: "teacher",
    name: row.name,
    schoolName: row.school_name,
    email: row.email,
    emailVerified,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Server-only file (see the "server-only" import above), so this never
// reaches the browser -- no reason to gate it on NODE_ENV, which would only
// suppress it in production, exactly where a real teacher_accounts lookup
// failure needs to be diagnosable from the server/Vercel function log.
function authLog(step: string, detail?: Record<string, unknown>) {
  console.log(`[auth:getCurrentTeacher] ${step}`, detail ?? "");
}

export async function getCurrentTeacher(): Promise<TeacherAccount | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    authLog("no authenticated user");
    return null;
  }

  const { data: profile, error } = await supabase
    .from("teacher_accounts")
    .select("id, name, school_name, email, role, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    authLog("teacher account lookup failed", { code: error?.code, message: error?.message });
    return null;
  }

  authLog("teacher account found");
  return mapRow(profile, user.email_confirmed_at != null);
}
