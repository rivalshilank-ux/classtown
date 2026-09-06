import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ONLINE_WINDOW_MS } from "@/lib/class/queries";
import { pageRange, toLikePattern, type PagedResult } from "@/lib/admin/pagination";

export interface AdminStudentListItem {
  id: string;
  nickname: string;
  className: string;
  status: "active" | "removed" | "transferred";
  online: boolean;
  lastSeenAt: string | null;
  level: number;
  xp: number;
}

export const STUDENTS_PAGE_SIZE = 20;

export type StudentStatusFilter = "all" | "active" | "removed" | "transferred";

export interface ListStudentsOptions {
  page?: number;
  search?: string;
  status?: StudentStatusFilter;
  classId?: string;
}

/**
 * participant_code is deliberately never selected here: it is the join
 * credential a student uses to come back as the same character, and this
 * listing has no workflow that needs it -- unlike the class code, which a
 * teacher already displays openly for a whole room to read.
 */
export async function listStudents(
  options: ListStudentsOptions = {},
): Promise<PagedResult<AdminStudentListItem>> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("student_participants")
    .select("id, class_id, nickname, status, last_seen_at", { count: "exact" });

  const search = options.search?.trim();
  if (search) {
    query = query.ilike("nickname", toLikePattern(search));
  }

  if (options.status && options.status !== "all") {
    query = query.eq("status", options.status);
  }

  if (options.classId) {
    query = query.eq("class_id", options.classId);
  }

  const { from, to } = pageRange(options.page ?? 1, STUDENTS_PAGE_SIZE);
  const { data, count, error } = await query
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error || !data || data.length === 0) {
    return { items: [], total: count ?? 0 };
  }

  const participantIds = data.map((row) => row.id);
  const classIds = [...new Set(data.map((row) => row.class_id))];

  const [{ data: progressionRows }, { data: classRows }] = await Promise.all([
    supabase
      .from("student_progression")
      .select("participant_id, level, xp")
      .in("participant_id", participantIds),
    supabase.from("classes").select("id, name").in("id", classIds),
  ]);

  const progressionByParticipant = new Map(
    (progressionRows ?? []).map((row) => [row.participant_id, row]),
  );
  const classNameById = new Map((classRows ?? []).map((row) => [row.id, row.name]));

  const cutoff = Date.now() - ONLINE_WINDOW_MS;

  return {
    items: data.map((row) => {
      const progression = progressionByParticipant.get(row.id);
      return {
        id: row.id,
        nickname: row.nickname,
        className: classNameById.get(row.class_id) ?? "(알 수 없음)",
        status: row.status,
        online: row.last_seen_at !== null && Date.parse(row.last_seen_at) > cutoff,
        lastSeenAt: row.last_seen_at,
        level: progression?.level ?? 1,
        xp: progression?.xp ?? 0,
      };
    }),
    total: count ?? 0,
  };
}
