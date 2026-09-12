import type {
  AnnouncementEvent,
  ChatBroadcastEvent,
  ChatRejection,
  JoinTicketOptionsInput,
} from "@classtown/shared-schema";

export type { JoinTicketOptionsInput, MoveIntentInput } from "@classtown/shared-schema";
export type { AnnouncementEvent, ChatBroadcastEvent, ChatRejection } from "@classtown/shared-schema";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "joining"
  | "joined"
  | "reconnecting"
  | "error"
  | "disconnected";

export interface GameClientOptions {
  endpoint: string;
  joinOptions: JoinTicketOptionsInput;
  onStatusChange?: (status: ConnectionStatus) => void;
  onError?: (message: string) => void;
  onChatMessage?: (event: ChatBroadcastEvent) => void;
  onChatRejected?: (event: ChatRejection) => void;
  onAnnouncement?: (event: AnnouncementEvent) => void;
}

export interface GameClientHandle {
  destroy(): void;
  /** No-op while not yet connected to a room -- there is nothing to send to. */
  sendChat(text: string): void;
}
