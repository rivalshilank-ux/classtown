import "server-only";
import type { TeacherAccount } from "@classtown/shared-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

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

export async function getCurrentTeacher(): Promise<TeacherAccount | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("teacher_accounts")
    .select("id, name, school_name, email, role, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return mapRow(profile, user.email_confirmed_at != null);
}
