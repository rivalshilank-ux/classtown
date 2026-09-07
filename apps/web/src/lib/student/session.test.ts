import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStudentSession,
  clearStudentTicket,
  getStudentSession,
  saveStudentSession,
  type StudentSession,
} from "./session";

/**
 * No jsdom in this project (see adminShortcutDetector.test.ts) -- a minimal
 * in-memory stand-in for sessionStorage is enough to exercise the real
 * save/get/clear code paths without pulling in a DOM environment.
 */
function createFakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

const SESSION: StudentSession = {
  ticketId: "11111111-1111-4111-8111-111111111111",
  nickname: "Alex",
  participantCode: "ABC234",
  classCode: "XYZ789",
};

describe("student session", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createFakeStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when nothing has been saved", () => {
    expect(getStudentSession()).toBeNull();
  });

  it("round-trips a saved session", () => {
    saveStudentSession(SESSION);
    expect(getStudentSession()).toEqual(SESSION);
  });

  it("rejects malformed stored data instead of returning it as-is", () => {
    sessionStorage.setItem("classtown.student", JSON.stringify({ nickname: "Alex" }));
    expect(getStudentSession()).toBeNull();
  });

  it("rejects non-JSON garbage instead of throwing", () => {
    sessionStorage.setItem("classtown.student", "not json");
    expect(getStudentSession()).toBeNull();
  });

  it("never throws when sessionStorage itself is unavailable (e.g. private mode)", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
      removeItem: () => {
        throw new Error("SecurityError");
      },
    });

    expect(() => saveStudentSession(SESSION)).not.toThrow();
    expect(getStudentSession()).toBeNull();
    expect(() => clearStudentSession()).not.toThrow();
  });

  describe("clearStudentTicket", () => {
    it("blanks only the ticket id, keeping nickname/classCode/participantCode -- what lets a returning student rejoin as the same character", () => {
      saveStudentSession(SESSION);

      clearStudentTicket();

      expect(getStudentSession()).toEqual({ ...SESSION, ticketId: "" });
    });

    it("does nothing when there is no session to clear", () => {
      clearStudentTicket();
      expect(getStudentSession()).toBeNull();
    });
  });

  describe("clearStudentSession", () => {
    it("removes the whole session, not just the ticket", () => {
      saveStudentSession(SESSION);

      clearStudentSession();

      expect(getStudentSession()).toBeNull();
    });
  });
});
