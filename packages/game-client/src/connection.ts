import { Client, type Room } from "colyseus.js";
import {
  TownRoomState,
  type JoinTicketOptionsInput,
} from "@classtown/shared-schema";
import type { ConnectionStatus } from "./types";

/**
 * The room is joined with a ticket and nothing else. Nickname and class are
 * resolved server-side from that ticket, so there is no identity here for a
 * tampered client to assert. Reports up to "joining" only -- "joined" is the
 * caller's call to make, once the Phaser scene is actually bound to the room.
 */
export async function connectToTownRoom(
  endpoint: string,
  joinOptions: JoinTicketOptionsInput,
  onStatusChange?: (status: ConnectionStatus) => void,
): Promise<Room<TownRoomState>> {
  onStatusChange?.("connecting");
  const client = new Client(endpoint);

  onStatusChange?.("joining");
  return client.joinOrCreate<TownRoomState>("town", joinOptions);
}

/**
 * A dropped WebSocket (WiFi blip, a laptop lid closing) and a deliberate
 * leave both end up calling this. Which one actually happened is a decision
 * the server already made -- TownRoom.onLeave only opens a reconnection
 * window for an unconsented drop -- so this never needs to inspect a close
 * code itself: reconnecting after a deliberate leave (or after the server's
 * grace window has expired) simply fails fast, same as any other rejected
 * connection.
 */
export async function reconnectToTownRoom(
  endpoint: string,
  reconnectionToken: string,
): Promise<Room<TownRoomState>> {
  const client = new Client(endpoint);
  return client.reconnect<TownRoomState>(reconnectionToken);
}
