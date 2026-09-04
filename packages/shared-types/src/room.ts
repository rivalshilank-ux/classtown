/**
 * Options a client sends when joining a Colyseus room.
 * The server must independently validate the join code / auth token —
 * this shape only describes wire format, not trust.
 */
export interface JoinRoomOptions {
  joinCode: string;
  nickname: string;
}

export type RoomLifecycleStatus =
  | "waiting"
  | "in_progress"
  | "paused"
  | "ended";
