import type { Room } from "colyseus.js";
import { moveIntentSchema, type MoveIntentInput } from "@classtown/shared-schema";

/**
 * The only place a "move" message is ever sent. Re-validates the payload
 * through the same schema the server parses with, so a bug elsewhere in
 * the client can't silently start sending a different shape (e.g. an
 * absolute `{ x, y }` position) instead of a direction intent — the
 * client is never allowed to assert its own position.
 */
export function sendMoveIntent(room: Pick<Room, "send">, intent: MoveIntentInput): void {
  const validated = moveIntentSchema.parse(intent);
  room.send("move", validated);
}
