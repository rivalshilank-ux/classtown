export type UserRole = "student" | "teacher" | "admin";

export interface BaseAccount {
  id: string;
  role: UserRole;
  createdAt: string;
}

export interface TeacherAccount extends BaseAccount {
  role: "teacher";
  name: string;
  schoolName: string;
  email: string;
  emailVerified: boolean;
  updatedAt: string;
}

/**
 * Students do not have accounts. A participant is a character sheet scoped to
 * one class, addressed by a server-generated code — no email, no password, no
 * `auth.users` row. See docs/adr/0002-class-and-student-participants.md.
 */
export interface StudentParticipant {
  id: string;
  classId: string;
  participantCode: string;
  nickname: string;
  status: "active" | "removed" | "transferred";
  lastSeenAt: string | null;
  createdAt: string;
}

export interface StudentProgression {
  participantId: string;
  xp: number;
  level: number;
  playSeconds: number;
}

export interface StudentSettings {
  locale: SupportedLocale;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

export type SupportedLocale = "ko" | "en" | "ja" | "zh";

export interface PublicPlayerInfo {
  sessionId: string;
  nickname: string;
  characterId: string;
  score: number;
}
