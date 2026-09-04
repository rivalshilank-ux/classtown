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

export interface PublicPlayerInfo {
  sessionId: string;
  nickname: string;
  characterId: string;
  score: number;
}
