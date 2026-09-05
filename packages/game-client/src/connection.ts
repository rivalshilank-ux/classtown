import { Client, type Room } from "colyseus.js";
import {
  TownRoomState,
  type JoinTicketOptionsInput,
} from "@classtown/shared-schema";
import type { ConnectionStatus } from "./types";

/**
 * The room is joined with a ticket and nothing else. Nickname and class are
 * resolved server-side from that ticket, so there is no identity here for a
 * tampered client to assert.
 */
export async function connectToTownRoom(
  endpoint: string,
  joinOptions: JoinTicketOptionsInput,
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
