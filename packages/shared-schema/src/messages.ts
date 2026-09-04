import { z } from "zod";

export const joinRoomOptionsSchema = z.object({
  joinCode: z.string().min(4).max(12),
  nickname: z.string().min(1).max(20),
});

export type JoinRoomOptionsInput = z.infer<typeof joinRoomOptionsSchema>;

export const moveIntentSchema = z.object({
  dx: z.number().min(-1).max(1),
  dy: z.number().min(-1).max(1),
});

export type MoveIntentInput = z.infer<typeof moveIntentSchema>;
