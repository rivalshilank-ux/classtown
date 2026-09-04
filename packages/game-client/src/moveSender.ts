import type { Room } from "colyseus.js";
import { moveIntentSchema, type MoveIntentInput } from "@classtown/shared-schema";

export function sendMoveIntent(room: Pick<Room, "send">, intent: MoveIntentInput): void {
  const validated = moveIntentSchema.parse(intent);
  room.send("move", validated);
}
