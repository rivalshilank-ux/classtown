import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pageRange, toLikePattern, type PagedResult } from "@/lib/admin/pagination";

export interface AdminClassListItem {
  id: string;
  name: string;
  classCode: string;
  teacherName: string;
  teacherSchool: string;
  status: "active" | "archived";
  studentCount: number;
  createdAt: string;
}

export const CLASSES_PAGE_SIZE = 20;

export type ClassStatusFilter = "all" | "active" | "archived";

export interface ListClassesOptions {
  page?: number;
  search?: string;
  status?: ClassStatusFilter;
}

/**
 * The class code is shown in full, not masked: it is already treated as a
 * shareable room code rather than a secret everywhere else in the product --
 * a teacher displays it full-size for a whiteboard (formatEntryCode in
 * app/teacher/page.tsx), and it rotates on demand. Masking it here would add
 * friction for the one workflow this page exists for (an operator
 * investigating a join issue) without reducing real exposure, since anyone
 * in the physical classroom already has it.
 */
export async function listClasses(
  options: ListClassesOptions = {},
): Promise<PagedResult<AdminClassListItem>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("classes")
    .select("id, name, class_code, teacher_id, archived_at, created_at", { count: "exact" });

  const search = options.search?.trim();
  if (search) {
    query = query.ilike("name", toLikePattern(search));
  }

  const status = options.status ?? "all";
  if (status === "active") {
    query = query.is("archived_at", null);
  } else if (status === "archived") {
    query = query.not("archived_at", "is", null);
  }

  const { from, to } = pageRange(options.page ?? 1, CLASSES_PAGE_SIZE);
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error || !data || data.length === 0) {
    return { items: [], total: count ?? 0 };
  }

  const classIds = data.map((row) => row.id);
  const teacherIds = [...new Set(data.map((row) => row.teacher_id))];

  const [{ data: teacherRows }, { data: participantRows }] = await Promise.all([
    supabase.from("teacher_accounts").select("id, name, school_name").in("id", teacherIds),
    supabase
      .from("student_participants")
      .select("class_id")
      .in("class_id", classIds)
      .eq("status", "active"),
  ]);

  const teacherById = new Map((teacherRows ?? []).map((row) => [row.id, row]));
  const studentCountByClass = new Map<string, number>();
  for (const row of participantRows ?? []) {
    studentCountByClass.set(row.class_id, (studentCountByClass.get(row.class_id) ?? 0) + 1);
  }

  return {
    items: data.map((row) => {
      const teacher = teacherById.get(row.teacher_id);
      return {
        id: row.id,
        name: row.name,
        classCode: row.class_code,
        teacherName: teacher?.name ?? "(알 수 없음)",
        teacherSchool: teacher?.school_name ?? "",
        status: row.archived_at === null ? ("active" as const) : ("archived" as const),
        studentCount: studentCountByClass.get(row.id) ?? 0,
        createdAt: row.created_at,
      };
    }),
    total: count ?? 0,
  };
}
