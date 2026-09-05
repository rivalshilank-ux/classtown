import { z } from "zod";

/**
 * @deprecated The Colyseus join contract is now `joinTicketOptionsSchema` in
 * ./class/entry.ts — a room must not accept a class code or nickname from the
 * client, because that is the client asserting its own identity. Kept while the
 * remaining call sites migrate; do not use it for new code.
 */
export const joinRoomOptionsSchema = z.object({
  joinCode: z
    .string()
    .min(4, "참가 코드는 4~12자로 입력해 주세요.")
    .max(12, "참가 코드는 4~12자로 입력해 주세요."),
  nickname: z
    .string()
    .min(1, "닉네임을 입력해 주세요.")
    .max(20, "닉네임은 20자 이하로 입력해 주세요."),
});

export type JoinRoomOptionsInput = z.infer<typeof joinRoomOptionsSchema>;

export const moveIntentSchema = z.object({
  dx: z.number().min(-1).max(1),
  dy: z.number().min(-1).max(1),
});

export type MoveIntentInput = z.infer<typeof moveIntentSchema>;
