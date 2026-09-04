import { Client, type Room } from "colyseus.js";
import { TownRoomState, type JoinRoomOptionsInput } from "@classtown/shared-schema";
import type { ConnectionStatus } from "./types";

/**
 * Connects to the game server and joins the `town` room, reporting status
 * transitions along the way. Throws (with the connection/join error) on
 * failure — the caller decides how to surface that as an "error" status.
 */
export async function connectToTownRoom(
  endpoint: string,
  joinOptions: JoinRoomOptionsInput,
  onStatusChange?: (status: ConnectionStatus) => void,
): Promise<Room<TownRoomState>> {
  onStatusChange?.("connecting");
  const client = new Client(endpoint);

  onStatusChange?.("joining");
  const room = await client.joinOrCreate<TownRoomState>("town", joinOptions);

  onStatusChange?.("joined");
  room.onLeave(() => {
    onStatusChange?.("disconnected");
  });

  return room;
}
