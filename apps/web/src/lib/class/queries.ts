import "server-only";
import type {
  ActivityEntry,
  ClassRecord,
  ClassSummary,
  RosterEntry,
} from "@classtown/shared-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * A student is counted online if the game server touched `last_seen_at` inside
 * this window. Presence is deliberately coarse: it costs one batched update per
 * room per minute instead of a write per movement packet, so a closed tab can
 * read as online for up to this long.
 */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;

/**
 * None of these take a teacher id. Ownership comes from the session via RLS, so
 * a tampered class id returns an empty result rather than another teacher's data.
 *
 * The two-table reads below are issued as two statements joined in TypeScript
 * rather than as PostgREST embeds. Embeds infer as `any` under the current
 * generated types, and the alternative — hand-editing generated output — is
 * worse than a second indexed query over at most a classroom's worth of rows.
 */
export async function listClasses(): Promise<ClassRecord[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("classes")
    .select("id, name, class_code, join_mode, join_open, archived_at, created_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    classCode: row.class_code,
    joinMode: row.join_mode,
    joinOpen: row.join_open,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  }));
}

export async function getClassSummary(classId: string): Promise<ClassSummary> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("student_participants")
    .select("last_seen_at")
    .eq("class_id", classId)
    .eq("status", "active");

  if (error || !data) {
    return { studentCount: 0, onlineCount: 0 };
  }

  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  const onlineCount = data.filter(
    (row) => row.last_seen_at !== null && Date.parse(row.last_seen_at) > cutoff,
  ).length;

  return { studentCount: data.length, onlineCount };
}

export async function listRoster(classId: string): Promise<RosterEntry[]> {
  const supabase = await createSupabaseServerClient();

  const { data: participants, error } = await supabase
    .from("student_participants")
    .select("id, nickname, participant_code, status, last_seen_at")
    .eq("class_id", classId)
    .neq("status", "removed")
    .order("nickname");

  if (error || !participants || participants.length === 0) {
    return [];
  }

  const { data: progression } = await supabase
    .from("student_progression")
    .select("participant_id, level, xp")
    .in(
      "participant_id",
      participants.map((row) => row.id),
    );

  const byParticipant = new Map(
    (progression ?? []).map((row) => [row.participant_id, row]),
  );

  return participants.map((row) => {
    // A progression row is created by trigger with every participant, so the
    // fallback only covers a read that RLS filtered out from under us.
    const stats = byParticipant.get(row.id);
    return {
      id: row.id,
      nickname: row.nickname,
      participantCode: row.participant_code,
      status: row.status,
      lastSeenAt: row.last_seen_at,
      level: stats?.level ?? 1,
      xp: stats?.xp ?? 0,
    };
  });
}

export async function listRecentActivity(
  classId: string,
  limit = 50,
): Promise<ActivityEntry[]> {
  const supabase = await createSupabaseServerClient();

  const { data: events, error } = await supabase
    .from("student_activity_events")
    .select("participant_id, event_type, occurred_at")
    .eq("class_id", classId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error || !events || events.length === 0) {
    return [];
  }

  const { data: participants } = await supabase
    .from("student_participants")
    .select("id, nickname")
    .in("id", [...new Set(events.map((row) => row.participant_id))]);

  const nicknameById = new Map(
    (participants ?? []).map((row) => [row.id, row.nickname]),
  );

  return events.map((row) => ({
    eventType: row.event_type,
    nickname: nicknameById.get(row.participant_id) ?? "",
    occurredAt: row.occurred_at,
  }));
}
