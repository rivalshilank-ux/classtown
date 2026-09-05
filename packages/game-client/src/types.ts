import type { JoinTicketOptionsInput } from "@classtown/shared-schema";

export type { JoinTicketOptionsInput, MoveIntentInput } from "@classtown/shared-schema";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "joining"
  | "joined"
  | "error"
  | "disconnected";

export interface GameClientOptions {
  endpoint: string;
  joinOptions: JoinTicketOptionsInput;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (message: string) => void;
}

export interface GameClientHandle {
  destroy(): void;
}
