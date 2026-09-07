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

export const interactMessageSchema = z.object({
  pointId: z.string().min(1).max(64),
});

export type InteractMessageInput = z.infer<typeof interactMessageSchema>;

/** Server -> client, sent privately in reply to an "interact" message. */
export interface InteractResult {
  ok: boolean;
  pointId: string;
  reason?: "unknown_point" | "out_of_range" | "cooldown";
  label?: string;
  alreadyDiscovered?: boolean;
  discoveredIds?: string[];
  totalCount?: number;
}

/** Server -> client, sent privately right after join so a reconnecting or
 * returning player's client can restore its discovery UI without having to
 * re-interact with anything already found. */
export interface DiscoveryProgress {
  discoveredIds: string[];
  totalCount: number;
}

/** Server -> all clients, broadcast whenever anyone discovers a new point --
 * the "friend sees you discover something" multiplayer moment. Carries only
 * what's needed to render an ambient bubble over that player; nobody else's
 * full progress is exposed. */
export interface PlayerDiscoveryEvent {
  sessionId: string;
  nickname: string;
  label: string;
}

/** Server -> all clients, broadcast once when a player finds every point. */
export interface TourCompletedEvent {
  sessionId: string;
  nickname: string;
}
