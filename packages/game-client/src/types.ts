import type { JoinRoomOptionsInput } from "@classtown/shared-schema";

export type { JoinRoomOptionsInput, MoveIntentInput } from "@classtown/shared-schema";

/**
 * Connection lifecycle as observed by the game client.
 *
 * `connecting` and `joining` both fall within the single
 * `client.joinOrCreate()` call this phase uses — colyseus.js doesn't expose
 * a separate "socket open, not yet joined" callback through that API, so
 * they aren't independently observable yet. Kept as distinct states (rather
 * than merged into one) so this type doesn't need to change when a later
 * phase splits connect/join into two real steps.
 */
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "joining"
  | "joined"
  | "error"
  | "disconnected";

export interface GameClientOptions {
  /** Colyseus server endpoint, e.g. "ws://localhost:2567". Read this from an env var at the call site — never hardcode it. */
  endpoint: string;
  joinOptions: JoinRoomOptionsInput;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (message: string) => void;
}

export interface GameClientHandle {
  destroy(): void;
}
