import type { JoinRoomOptionsInput } from "@classtown/shared-schema";

export type { JoinRoomOptionsInput, MoveIntentInput } from "@classtown/shared-schema";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "joining"
  | "joined"
  | "error"
  | "disconnected";

export interface GameClientOptions {
  endpoint: string;
  joinOptions: JoinRoomOptionsInput;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (message: string) => void;
}

export interface GameClientHandle {
  destroy(): void;
}
