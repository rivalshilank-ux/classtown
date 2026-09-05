/**
 * What the browser is allowed to hold between the entry form and the game.
 *
 * Note what is absent: there is no participant id and no class id. The ticket is
 * the only thing that confers identity, it is single-use, and it expires in two
 * minutes — so a copied session object is worth nothing after the first join.
 */
export interface StudentSession {
  ticketId: string;
  nickname: string;
  participantCode: string;
  classCode: string;
}

const STORAGE_KEY = "classtown.student";

function isStudentSession(value: unknown): value is StudentSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.ticketId === "string" &&
    typeof candidate.nickname === "string" &&
    typeof candidate.participantCode === "string" &&
    typeof candidate.classCode === "string"
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

/**
 * A ticket is spent the moment the game server accepts it, so the copy in
 * storage is dead weight afterwards. Clearing it keeps a refresh from retrying a
 * ticket that can only fail.
 */
export function clearStudentTicket(): void {
  const session = getStudentSession();
  if (!session) {
    return;
  }
  saveStudentSession({ ...session, ticketId: "" });
}

export function clearStudentSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
