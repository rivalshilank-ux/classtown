"use server";

import { headers } from "next/headers";
import { studentJoinInputSchema } from "@classtown/shared-schema";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { consumeRateLimit } from "@/lib/class/rateLimit";

export type JoinClassResult =
  | {
      success: true;
      ticketId: string;
      nickname: string;
      participantCode: string;
      classCode: string;
    }
  | { success: false; error: string };

/**
 * One message for every rejection. A class that does not exist, one that is
 * archived, one that has closed joining, a participant code from another class
 * and a removed student all produce this, so the form cannot be used to work out
 * which class codes are real.
 */
const GENERIC_JOIN_ERROR = "참가 코드를 확인해 주세요.";
const RATE_LIMITED_ERROR = "잠시 후 다시 시도해 주세요.";
const UNAVAILABLE_ERROR = "지금은 입장할 수 없습니다. 잠시 후 다시 시도해 주세요.";

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
