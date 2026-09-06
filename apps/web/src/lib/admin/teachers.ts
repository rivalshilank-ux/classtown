import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pageRange, toLikePattern, type PagedResult } from "@/lib/admin/pagination";

export interface AdminTeacherListItem {
  id: string;
  name: string;
  schoolName: string;
  email: string;
  classCount: number;
  createdAt: string;
}

export const TEACHERS_PAGE_SIZE = 20;

export interface ListTeachersOptions {
  page?: number;
  search?: string;
}

/**
 * Reads through the admin's own RLS-scoped session (the "Admins can read all
 * teacher accounts" policy from Phase 1) -- no service role involved. Class
 * count is a second, batched query rather than a PostgREST embed: embeds
 * infer as `any` under the current hand-maintained generated types (same
 * reasoning as apps/web/src/lib/class/queries.ts).
 */
export async function listTeachers(
  options: ListTeachersOptions = {},
): Promise<PagedResult<AdminTeacherListItem>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("teacher_accounts")
    .select("id, name, school_name, email, created_at", { count: "exact" });

  const search = options.search?.trim();
  if (search) {
    query = query.ilike("name", toLikePattern(search));
  }

  const { from, to } = pageRange(options.page ?? 1, TEACHERS_PAGE_SIZE);
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data || data.length === 0) {
    return { items: [], total: count ?? 0 };
  }

  const { data: classRows } = await supabase
    .from("classes")
    .select("teacher_id")
    .in(
      "teacher_id",
      data.map((row) => row.id),
    );

  const classCountByTeacher = new Map<string, number>();
  for (const row of classRows ?? []) {
    classCountByTeacher.set(row.teacher_id, (classCountByTeacher.get(row.teacher_id) ?? 0) + 1);
  }

  return {
    items: data.map((row) => ({
      id: row.id,
      name: row.name,
      schoolName: row.school_name,
      email: row.email,
      classCount: classCountByTeacher.get(row.id) ?? 0,
      createdAt: row.created_at,
    })),
    total: count ?? 0,
  };
}
