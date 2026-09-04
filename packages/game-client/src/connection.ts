import { Client, type Room } from "colyseus.js";
import { TownRoomState, type JoinRoomOptionsInput } from "@classtown/shared-schema";
import type { ConnectionStatus } from "./types";

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
