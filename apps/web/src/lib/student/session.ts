export interface StudentSession {
  classCode: string;
  nickname: string;
}

const STORAGE_KEY = "classtown.student";

function isStudentSession(value: unknown): value is StudentSession {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as StudentSession).classCode === "string" &&
    typeof (value as StudentSession).nickname === "string"
  );
}

export function saveStudentSession(session: StudentSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage can be unavailable (private mode, storage disabled).
    // The entry flow still works — it just won't be remembered across pages.
  }
}

export function getStudentSession(): StudentSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isStudentSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearStudentSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
