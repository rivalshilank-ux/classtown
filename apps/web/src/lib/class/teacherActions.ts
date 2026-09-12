"use server";

import { classAnnouncementSchema, classNameSchema, nicknameSchema } from "@classtown/shared-schema";
import type { ClassRecord, RosterParticipant } from "@classtown/shared-types";
import { MAINTENANCE_MODE_ERROR_CODE } from "@classtown/shared-types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveMaintenanceNotice } from "@/lib/site/maintenance";

export type ClassActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: typeof MAINTENANCE_MODE_ERROR_CODE };

const GENERIC_ERROR = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const NAME_ERROR = "학급 이름을 확인해 주세요.";
const MAINTENANCE_ERROR = "현재 ClassTown은 점검 중입니다. 잠시 후 다시 이용해 주세요.";

/**
 * Server-authoritative maintenance gate for teacher mutations. Reads (in
 * class/queries.ts) are deliberately not gated -- Maintenance Mode blocks
 * writes, not dashboard visibility, per docs/admin/admin.md.
 */
async function checkMaintenanceGate(): Promise<{ error: string; code: typeof MAINTENANCE_MODE_ERROR_CODE } | null> {
  const notice = await getActiveMaintenanceNotice();
  if (!notice) {
    return null;
  }
  return { error: MAINTENANCE_ERROR, code: MAINTENANCE_MODE_ERROR_CODE };
}

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

  const maintenance = await checkMaintenanceGate();
  if (maintenance) {
    return { success: false, ...maintenance };
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

export async function renameClass(
  classId: unknown,
  name: unknown,
): Promise<ClassActionResult<null>> {
  if (typeof classId !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const parsed = classNameSchema.safeParse(name);
  if (!parsed.success) {
    return { success: false, error: NAME_ERROR };
  }

  const maintenance = await checkMaintenanceGate();
  if (maintenance) {
    return { success: false, ...maintenance };
  }

  const supabase = await createSupabaseServerClient();
  // .eq("id", classId) alone is not the ownership check -- RLS's own
  // `using (is_class_teacher(id))` on this UPDATE policy is. A foreign
  // class id simply matches no row here, exactly like every other
  // teacher-scoped mutation in this file.
  const { error } = await supabase
    .from("classes")
    .update({ name: parsed.data })
    .eq("id", classId);

  if (error) {
    console.error("renameClass failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }

  return { success: true, data: null };
}

export async function regenerateClassCode(
  classId: unknown,
): Promise<ClassActionResult<string>> {
  if (typeof classId !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const maintenance = await checkMaintenanceGate();
  if (maintenance) {
    return { success: false, ...maintenance };
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

  const maintenance = await checkMaintenanceGate();
  if (maintenance) {
    return { success: false, ...maintenance };
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

  const maintenance = await checkMaintenanceGate();
  if (maintenance) {
    return { success: false, ...maintenance };
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

/**
 * `open` classes accept a bare nickname at the door and mint a participant on
 * the spot; `roster` classes only ever admit a nickname the teacher already
 * created via `createRosterParticipant` below (see `join_class` in
 * 20260905070000_class_rpcs.sql). Switching an `open` class to `roster` does
 * not affect students already inside -- their participant codes still work
 * for rejoining either way.
 */
export async function setClassJoinMode(
  classId: unknown,
  joinMode: unknown,
): Promise<ClassActionResult<null>> {
  if (typeof classId !== "string" || (joinMode !== "open" && joinMode !== "roster")) {
    return { success: false, error: GENERIC_ERROR };
  }

  const maintenance = await checkMaintenanceGate();
  if (maintenance) {
    return { success: false, ...maintenance };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("classes")
    .update({ join_mode: joinMode })
    .eq("id", classId);

  if (error) {
    console.error("setClassJoinMode failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }

  return { success: true, data: null };
}

/**
 * A roster class has no self-registration fallback, so a student can only
 * ever enter with a participant code the teacher minted ahead of time here.
 * The nickname is cosmetic -- the code is what the student actually types in.
 */
export async function createRosterParticipant(
  classId: unknown,
  nickname: unknown,
): Promise<ClassActionResult<RosterParticipant>> {
  if (typeof classId !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const parsed = nicknameSchema.safeParse(nickname);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? NAME_ERROR };
  }

  const maintenance = await checkMaintenanceGate();
  if (maintenance) {
    return { success: false, ...maintenance };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_roster_participant", {
    p_class_id: classId,
    p_nickname: parsed.data,
  });

  if (error || !data) {
    console.error("create_roster_participant failed:", error?.message ?? "no row returned");
    return { success: false, error: GENERIC_ERROR };
  }

  return {
    success: true,
    data: {
      id: data.id,
      nickname: data.nickname,
      participantCode: data.participant_code,
    },
  };
}

/**
 * Queues a message the game server delivers live to whichever of this
 * class's students are currently connected to TownRoom (see
 * apps/game-server/src/rooms/TownRoom.ts's deliverAnnouncements). There is
 * no delivery confirmation surfaced here -- a class with nobody online
 * right now just has the row sit pending until someone connects.
 */
export async function sendAnnouncement(
  classId: unknown,
  message: unknown,
): Promise<ClassActionResult<null>> {
  if (typeof classId !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const parsed = classAnnouncementSchema.safeParse(message);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? GENERIC_ERROR };
  }

  const maintenance = await checkMaintenanceGate();
  if (maintenance) {
    return { success: false, ...maintenance };
  }

  const supabase = await createSupabaseServerClient();
  // Ownership is RLS's `with check (is_class_teacher(class_id))` on this
  // table's insert policy -- a class id from another teacher's class is
  // simply refused, the same IDOR shape as every other mutation here.
  const { error } = await supabase
    .from("class_announcements")
    .insert({ class_id: classId, message: parsed.data });

  if (error) {
    console.error("sendAnnouncement failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }

  return { success: true, data: null };
}

/**
 * Removal is `status = 'removed'`, never a row delete -- progression and
 * activity history stay in place. The same column-level grant this reuses
 * (`update (nickname, status)`, 20260905030000) also permits setting status
 * back to 'active', so restoring a removed student needs no new grant or
 * migration if a future UI ever surfaces one; this phase only exposes remove.
 */
export async function removeParticipant(
  participantId: unknown,
): Promise<ClassActionResult<null>> {
  if (typeof participantId !== "string") {
    return { success: false, error: GENERIC_ERROR };
  }

  const maintenance = await checkMaintenanceGate();
  if (maintenance) {
    return { success: false, ...maintenance };
  }

  const supabase = await createSupabaseServerClient();
  // Ownership is RLS's `using (is_class_teacher(class_id))` on this table's
  // update policy -- a participant id from another teacher's class matches
  // no row, the same IDOR shape as every other mutation in this file.
  const { data, error } = await supabase
    .from("student_participants")
    .update({ status: "removed" })
    .eq("id", participantId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("removeParticipant failed:", error.message);
    return { success: false, error: GENERIC_ERROR };
  }
  if (!data) {
    return { success: false, error: GENERIC_ERROR };
  }

  return { success: true, data: null };
}
