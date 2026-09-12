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
      type: "joined" | "left" | "activity_completed";
      /** Known keys only -- see student_activity_events.payload's own comment. */
      payload?: Record<string, unknown>;
    },
  ): Promise<void>;

  addPlaySeconds(participantId: string, seconds: number): Promise<void>;

  /**
   * Whether an admin-started maintenance window is currently active. Checked
   * in onAuth to reject a *new* join -- never used to disconnect a player
   * already in the room, since a maintenance window starting mid-session
   * should not destroy anyone's in-progress game state.
   */
  isMaintenanceActive(): Promise<boolean>;

  /**
   * Undelivered `class_announcements` rows for any of the given classes, in
   * the order they were sent. The room calls this on a timer with exactly
   * the classIds it currently has a connected session for -- a class with no
   * students in the room right now is never queried.
   */
  pollPendingAnnouncements(
    classIds: readonly string[],
  ): Promise<{ id: string; classId: string; message: string }[]>;

  /** Marks announcements delivered so the next poll doesn't redeliver them. */
  markAnnouncementsDelivered(ids: readonly string[]): Promise<void>;
}
