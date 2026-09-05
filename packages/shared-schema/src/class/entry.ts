import { z } from "zod";

/**
 * Entry codes are read off a whiteboard by children, so the alphabet drops every
 * lookalike pair (0/O, 1/I/L) and U. Kept in sync with the CHECK constraint in
 * supabase/migrations/20260905020000_classes.sql.
 */
export const ENTRY_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const ENTRY_CODE_LENGTH = 6;

const ENTRY_CODE_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$/;

/** Codes are displayed as `ABC-123` but stored and compared without the separator. */
function normalizeEntryCode(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function formatEntryCode(code: string): string {
  return code.length === ENTRY_CODE_LENGTH
    ? `${code.slice(0, 3)}-${code.slice(3)}`
    : code;
}

export const classCodeSchema = z
  .string()
  .transform(normalizeEntryCode)
  .pipe(
    z
      .string()
      .regex(ENTRY_CODE_PATTERN, "참가 코드는 영문·숫자 6자리입니다."),
  );

export const participantCodeSchema = z
  .string()
  .transform(normalizeEntryCode)
  .pipe(
    z
      .string()
      .regex(ENTRY_CODE_PATTERN, "학생 코드는 영문·숫자 6자리입니다."),
  );

export const nicknameSchema = z
  .string()
  .trim()
  .min(1, "닉네임을 입력해 주세요.")
  .max(20, "닉네임은 20자 이하로 입력해 주세요.");

export const classNameSchema = z
  .string()
  .trim()
  .min(1, "학급 이름을 입력해 주세요.")
  .max(60, "학급 이름은 60자 이하로 입력해 주세요.");

/** What the student entry form submits in `open` mode. */
export const openJoinInputSchema = z.object({
  classCode: classCodeSchema,
  nickname: nicknameSchema,
});

/** What the student entry form submits in `roster` mode. */
export const rosterJoinInputSchema = z.object({
  classCode: classCodeSchema,
  participantCode: participantCodeSchema,
});

export const studentJoinInputSchema = z.object({
  classCode: classCodeSchema,
  nickname: nicknameSchema.optional(),
  participantCode: participantCodeSchema.optional(),
});

export type StudentJoinInput = z.infer<typeof studentJoinInputSchema>;

/**
 * The entire Colyseus join payload. The browser sends a ticket and nothing else:
 * class and participant are read from the ticket row server-side, so there is no
 * client-supplied identity for the room to accidentally trust.
 */
export const joinTicketOptionsSchema = z.object({
  ticket: z.uuid(),
});

export type JoinTicketOptionsInput = z.infer<typeof joinTicketOptionsSchema>;

/** What the join server action hands back to the browser. Never a participant id. */
export const studentJoinResultSchema = z.object({
  ticketId: z.uuid(),
  nickname: nicknameSchema,
  participantCode: z.string().regex(ENTRY_CODE_PATTERN),
  classCode: z.string().regex(ENTRY_CODE_PATTERN),
});

export type StudentJoinResult = z.infer<typeof studentJoinResultSchema>;
