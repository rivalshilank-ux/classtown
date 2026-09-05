export interface JoinIdentity {
  participantId: string;
  classId: string;
  nickname: string;
}

/**
 * Everything the room is allowed to do to durable storage. Deliberately narrow:
 * there is no method here that could persist a position, and none that takes an
 * identity the client supplied.
 */
export interface ClassPersistence {
  /**
   * Exchanges a single-use ticket for the identity it authorizes, or null if the
   * ticket is unknown, expired, already used, or its class is no longer joinable.
   */
  consumeJoinTicket(ticketId: string): Promise<JoinIdentity | null>;

  /** Coarse presence. Called on join, on leave, and on the room heartbeat. */
  markSeen(participantIds: readonly string[]): Promise<void>;

  recordEvent(
    event: {
      participantId: string;
      classId: string;
      type: "joined" | "left";
    },
  ): Promise<void>;

  addPlaySeconds(participantId: string, seconds: number): Promise<void>;
}
