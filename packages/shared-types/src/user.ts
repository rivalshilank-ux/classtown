export type UserRole = "student" | "teacher" | "admin";

export interface BaseAccount {
  id: string;
  role: UserRole;
  createdAt: string;
}

/**
 * Full teacher profile — server/teacher-facing only.
 * Never sent to student clients as-is.
 */
export interface TeacherAccount extends BaseAccount {
  role: "teacher";
  name: string;
  schoolName: string;
  email: string;
  emailVerified: boolean;
  updatedAt: string;
}

/**
 * Full student profile — server-facing only.
 * Never sent to other students; see PublicPlayerInfo for what peers can see.
 */
export interface StudentAccount extends BaseAccount {
  role: "student";
  nickname: string;
  email: string;
  emailVerified: boolean;
  settings: StudentSettings;
}

export interface StudentSettings {
  locale: SupportedLocale;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

export type SupportedLocale = "ko" | "en" | "ja" | "zh";

/**
 * What a student's client is allowed to know about another player in the
 * same room. Deliberately excludes email, auth identifiers, and any other
 * account data — enforced at the type level so server code can't leak
 * private fields by accident when building room broadcast payloads.
 */
export interface PublicPlayerInfo {
  sessionId: string;
  nickname: string;
  characterId: string;
  score: number;
}
