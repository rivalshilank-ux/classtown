import { z } from "zod";

/**
 * Validated shape of the options a client sends when joining a room.
 * The server (see apps/game-server) must always parse incoming data
 * through schemas like this instead of trusting client-supplied types —
 * this is the enforcement point for "never trust the client".
 */
export const joinRoomOptionsSchema = z.object({
  joinCode: z.string().min(4).max(12),
  nickname: z.string().min(1).max(20),
});

export type JoinRoomOptionsInput = z.infer<typeof joinRoomOptionsSchema>;

/**
 * Client -> server move intent. The server decides the resulting
 * authoritative position; this message is a request, not a fact.
 */
export const moveIntentSchema = z.object({
  dx: z.number().min(-1).max(1),
  dy: z.number().min(-1).max(1),
});

export type MoveIntentInput = z.infer<typeof moveIntentSchema>;
