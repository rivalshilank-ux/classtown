import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ONLINE_WINDOW_MS } from "@/lib/class/queries";

export interface AdminOverviewStats {
  totalTeachers: number;
  totalClasses: number;
  activeClasses: number;
  totalStudents: number;
  onlineStudents: number;
}

/**
 * Reads through the admin's own RLS-scoped session (the "Admins can read
 * all ..." policies added in 20260906010000_admin_read_access.sql) rather
 * than the service role -- an admin session is a real authenticated user,
 * so there is no reason to bypass RLS for a read.
 */
export async function getOverviewStats(): Promise<AdminOverviewStats> {
  const supabase = await createSupabaseServerClient();

  const [teacherCount, classRows, participantRows] = await Promise.all([
    supabase.from("teacher_accounts").select("id", { count: "exact", head: true }),
    supabase.from("classes").select("archived_at"),
    supabase.from("student_participants").select("last_seen_at").eq("status", "active"),
  ]);

  const totalClasses = classRows.data?.length ?? 0;
  const activeClasses =
    classRows.data?.filter((row) => row.archived_at === null).length ?? 0;

  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  const totalStudents = participantRows.data?.length ?? 0;
  const onlineStudents =
    participantRows.data?.filter(
      (row) => row.last_seen_at !== null && Date.parse(row.last_seen_at) > cutoff,
    ).length ?? 0;

  return {
    totalTeachers: teacherCount.count ?? 0,
    totalClasses,
    activeClasses,
    totalStudents,
    onlineStudents,
  };
}
