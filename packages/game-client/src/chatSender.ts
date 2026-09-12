import type { Room } from "colyseus.js";
import { chatMessageSchema, type ChatMessageInput } from "@classtown/shared-schema";

/**
 * Validated client-side purely to save a round trip on an obviously empty or
 * over-long message; the server re-validates independently with the same
 * schema and is the only side that decides what actually gets broadcast.
 */
export function sendChatMessage(room: Pick<Room, "send">, input: ChatMessageInput): void {
  const validated = chatMessageSchema.parse(input);
  room.send("chat", validated);
}
