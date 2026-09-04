import "server-only";
import type { TeacherAccount } from "@classtown/shared-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface TeacherAccountRow {
  id: string;
  name: string;
  school_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

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

/**
 * The one place that decides "who is the current teacher". Combines the
 * Supabase Auth user (source of truth for whether a session exists at
 * all, and for email-verification status) with the teacher_accounts
 * profile row. The query is explicitly scoped to the caller's own id —
 * RLS enforces the same boundary at the database level, this is
 * defense in depth, not the only thing standing between a teacher and
 * someone else's profile.
 */
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
    .select("id, name, school_name, email, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return mapRow(profile, user.email_confirmed_at != null);
}
