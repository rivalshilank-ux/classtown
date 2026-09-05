export type ClassJoinMode = "open" | "roster";

export interface ClassRecord {
  id: string;
  name: string;
  classCode: string;
  joinMode: ClassJoinMode;
  joinOpen: boolean;
  archivedAt: string | null;
  createdAt: string;
}

/** The two counts on the dashboard's class card. */
export interface ClassSummary {
  studentCount: number;
  onlineCount: number;
}

/** One row of the dashboard roster: participant joined to its progression. */
export interface RosterEntry {
  id: string;
  nickname: string;
  participantCode: string;
  status: "active" | "removed" | "transferred";
  lastSeenAt: string | null;
  level: number;
  xp: number;
}

export type ActivityEventType = "joined" | "left";

export interface ActivityEntry {
  eventType: ActivityEventType;
  nickname: string;
  occurredAt: string;
}
