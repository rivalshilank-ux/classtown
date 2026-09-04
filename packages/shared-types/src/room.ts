export interface JoinRoomOptions {
  joinCode: string;
  nickname: string;
}

export type RoomLifecycleStatus =
  | "waiting"
  | "in_progress"
  | "paused"
  | "ended";
