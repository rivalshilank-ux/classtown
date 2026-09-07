"use server";

import { z } from "zod";
import { headers } from "next/headers";
import {
  classCodeSchema,
  participantCodeSchema,
  studentJoinInputSchema,
} from "@classtown/shared-schema";
import { MAINTENANCE_MODE_ERROR_CODE } from "@classtown/shared-types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { consumeRateLimit } from "@/lib/class/rateLimit";
import { getActiveMaintenanceNotice } from "@/lib/site/maintenance";

export type JoinClassResult =
  | {
      success: true;
      ticketId: string;
      nickname: string;
      participantCode: string;
      classCode: string;
    }
  | { success: false; error: string; code?: typeof MAINTENANCE_MODE_ERROR_CODE };

/**
 * One message for every rejection. A class that does not exist, one that is
 * archived, one that has closed joining, a participant code from another class
 * and a removed student all produce this, so the form cannot be used to work out
 * which class codes are real.
 */
const GENERIC_JOIN_ERROR = "참가 코드를 확인해 주세요.";
const RATE_LIMITED_ERROR = "잠시 후 다시 시도해 주세요.";
const UNAVAILABLE_ERROR = "지금은 입장할 수 없습니다. 잠시 후 다시 시도해 주세요.";
const MAINTENANCE_ERROR = "현재 ClassTown은 점검 중입니다. 잠시 후 다시 이용해 주세요.";

const ATTEMPTS_PER_WINDOW = 10;
const WINDOW_MS = 60_000;

async function clientKey(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

export async function joinClass(input: unknown): Promise<JoinClassResult> {
  const parsed = studentJoinInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: GENERIC_JOIN_ERROR };
  }

  const { classCode, nickname, participantCode } = parsed.data;

  const ip = await clientKey();
  if (!consumeRateLimit(`join:ip:${ip}`, ATTEMPTS_PER_WINDOW, WINDOW_MS)) {
    return { success: false, error: RATE_LIMITED_ERROR };
  }
  if (!consumeRateLimit(`join:code:${classCode}`, ATTEMPTS_PER_WINDOW, WINDOW_MS)) {
    return { success: false, error: RATE_LIMITED_ERROR };
  }

  // Server-authoritative: checked here, not left to the client to decide
  // whether to even attempt a join. A student never has a Supabase session,
  // so this reads through the anon-scoped public RPC (see
  // 20260906060000_public_read_hardening.sql), not the service role below.
  if (await getActiveMaintenanceNotice()) {
    return { success: false, error: MAINTENANCE_ERROR, code: MAINTENANCE_MODE_ERROR_CODE };
  }

  const supabase = createSupabaseServiceClient();

  // Class lookup, participant resolution and ticket mint happen inside this one
  // function so they share a transaction; it returns no rows for every failure.
  const { data, error } = await supabase.rpc("join_class", {
    p_class_code: classCode,
    p_nickname: nickname ?? undefined,
    p_participant_code: participantCode ?? undefined,
  });

  if (error) {
    return { success: false, error: UNAVAILABLE_ERROR };
  }

  const row = data?.[0];
  if (!row) {
    return { success: false, error: GENERIC_JOIN_ERROR };
  }

  // The browser never receives participant_id — it holds a ticket instead, and
  // the game server resolves identity from that.
  return {
    success: true,
    ticketId: row.ticket_id,
    nickname: row.nickname,
    participantCode: row.participant_code,
    classCode,
  };
}

export type ProgressResult =
  | { success: true; xp: number; level: number }
  | { success: false; error: string };

const progressInputSchema = z.object({
  classCode: classCodeSchema,
  participantCode: participantCodeSchema,
});

/**
 * A student's own class/participant code (already sitting in their
 * sessionStorage from the join flow) is the lookup key -- the same shape
 * join_class() itself accepts, and the same one-generic-failure posture:
 * a wrong code, a removed participant, and a genuine database error are
 * all indistinguishable from the outside. xp/level are read-only here;
 * nothing this action does can write to student_progression.
 */
export async function getMyProgress(input: unknown): Promise<ProgressResult> {
  const parsed = progressInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: GENERIC_JOIN_ERROR };
  }

  const ip = await clientKey();
  if (!consumeRateLimit(`progress:ip:${ip}`, ATTEMPTS_PER_WINDOW, WINDOW_MS)) {
    return { success: false, error: RATE_LIMITED_ERROR };
  }

  const supabase = createSupabaseServiceClient();

  const { data: classRow } = await supabase
    .from("classes")
    .select("id")
    .eq("class_code", parsed.data.classCode)
    .maybeSingle();

  if (!classRow) {
    return { success: false, error: GENERIC_JOIN_ERROR };
  }

  const { data: participantRow } = await supabase
    .from("student_participants")
    .select("id")
    .eq("class_id", classRow.id)
    .eq("participant_code", parsed.data.participantCode)
    .eq("status", "active")
    .maybeSingle();

  if (!participantRow) {
    return { success: false, error: GENERIC_JOIN_ERROR };
  }

  const { data: progressionRow, error } = await supabase
    .from("student_progression")
    .select("xp, level")
    .eq("participant_id", participantRow.id)
    .maybeSingle();

  if (error || !progressionRow) {
    return { success: false, error: UNAVAILABLE_ERROR };
  }

  return { success: true, xp: progressionRow.xp, level: progressionRow.level };
}
