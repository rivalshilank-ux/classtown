import { beforeEach, describe, expect, it, vi } from "vitest";
import { SECONDS_PER_XP, XP_PER_LEVEL } from "@classtown/shared-schema";

interface QueryResult {
  data?: unknown;
  error?: unknown;
}

let selectSingleResult: QueryResult;
let updateEqResult: QueryResult;
let updateInResult: QueryResult;
let insertResult: QueryResult;
let rpcResult: QueryResult;

// student_progression's read chain: .select().eq().single()
const mockSingle = vi.fn(() => Promise.resolve(selectSingleResult));
const mockSelectEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockSelectEq }));

// The two distinct .update() shapes this module uses: ...eq() (addPlaySeconds)
// and ...in() (markSeen). Both hang off the same mockUpdate call.
const mockUpdateEq = vi.fn(() => Promise.resolve(updateEqResult));
const mockUpdateIn = vi.fn(() => Promise.resolve(updateInResult));
const mockUpdate = vi.fn((_payload: Record<string, unknown>) => ({
  eq: mockUpdateEq,
  in: mockUpdateIn,
}));

// student_activity_events' write: .insert()
const mockInsert = vi.fn(() => Promise.resolve(insertResult));

const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate, insert: mockInsert }));
const mockRpc = vi.fn(() => Promise.resolve(rpcResult));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

// Imported after the mock so createClient resolves to the stub above.
const { createSupabasePersistence } = await import("./supabasePersistence.js");

describe("supabasePersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    selectSingleResult = { data: null, error: null };
    updateEqResult = { data: null, error: null };
    updateInResult = { data: null, error: null };
    insertResult = { data: null, error: null };
    rpcResult = { data: null, error: null };
  });

  describe("consumeJoinTicket", () => {
    it("resolves identity from the RPC's returned row", async () => {
      rpcResult = {
        data: [{ participant_id: "p1", class_id: "c1", nickname: "Alex" }],
        error: null,
      };

      const persistence = createSupabasePersistence();
      const identity = await persistence.consumeJoinTicket("ticket-1");

      expect(identity).toEqual({ participantId: "p1", classId: "c1", nickname: "Alex" });
      expect(mockRpc).toHaveBeenCalledWith("consume_join_ticket", { p_ticket_id: "ticket-1" });
    });

    it("returns null without throwing on an RPC error", async () => {
      rpcResult = { data: null, error: { message: "boom" } };
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const persistence = createSupabasePersistence();
      const identity = await persistence.consumeJoinTicket("ticket-1");

      expect(identity).toBeNull();
      consoleSpy.mockRestore();
    });

    it("returns null when the ticket resolves to no row (invalid/expired/consumed)", async () => {
      rpcResult = { data: [], error: null };
      const persistence = createSupabasePersistence();
      expect(await persistence.consumeJoinTicket("ticket-1")).toBeNull();
    });
  });

  describe("markSeen", () => {
    it("does nothing for an empty participant list", async () => {
      const persistence = createSupabasePersistence();
      await persistence.markSeen([]);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("updates last_seen_at for every participant in one statement", async () => {
      const persistence = createSupabasePersistence();

      await persistence.markSeen(["p1", "p2"]);

      expect(mockFrom).toHaveBeenCalledWith("student_participants");
      const updatePayload = mockUpdate.mock.calls[0]?.[0];
      expect(typeof updatePayload?.last_seen_at).toBe("string");
      expect(mockUpdateIn).toHaveBeenCalledWith("id", ["p1", "p2"]);
    });

    it("logs but does not throw if the update fails", async () => {
      updateInResult = { data: null, error: { message: "boom" } };
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const persistence = createSupabasePersistence();
      await expect(persistence.markSeen(["p1"])).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith("markSeen failed:", "boom");

      consoleSpy.mockRestore();
    });
  });

  describe("recordEvent", () => {
    it("inserts the event with the expected shape", async () => {
      const persistence = createSupabasePersistence();

      await persistence.recordEvent({ participantId: "p1", classId: "c1", type: "joined" });

      expect(mockFrom).toHaveBeenCalledWith("student_activity_events");
      expect(mockInsert).toHaveBeenCalledWith({
        participant_id: "p1",
        class_id: "c1",
        event_type: "joined",
      });
    });
  });

  describe("isMaintenanceActive", () => {
    it("returns true when the public RPC reports an active window", async () => {
      rpcResult = { data: [{ message: "점검 중", starts_at: "2026-01-01T00:00:00Z" }], error: null };
      const persistence = createSupabasePersistence();
      expect(await persistence.isMaintenanceActive()).toBe(true);
    });

    it("returns false when no window is active", async () => {
      rpcResult = { data: [], error: null };
      const persistence = createSupabasePersistence();
      expect(await persistence.isMaintenanceActive()).toBe(false);
    });

    it("fails open (false) instead of throwing on an RPC error", async () => {
      rpcResult = { data: null, error: { message: "unreachable" } };
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const persistence = createSupabasePersistence();
      expect(await persistence.isMaintenanceActive()).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe("addPlaySeconds", () => {
    it("does nothing for zero or negative seconds", async () => {
      const persistence = createSupabasePersistence();
      await persistence.addPlaySeconds("p1", 0);
      await persistence.addPlaySeconds("p1", -5);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("does nothing if the current play_seconds can't be read", async () => {
      selectSingleResult = { data: null, error: { message: "not found" } };
      const persistence = createSupabasePersistence();

      await persistence.addPlaySeconds("p1", 30);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("writes xp/level derived fresh from the new cumulative play_seconds, never incremented separately", async () => {
      selectSingleResult = { data: { play_seconds: SECONDS_PER_XP * (XP_PER_LEVEL - 1) }, error: null };
      const persistence = createSupabasePersistence();

      // Crossing exactly one full level's worth of XP.
      await persistence.addPlaySeconds("p1", SECONDS_PER_XP);

      const expectedTotal = SECONDS_PER_XP * XP_PER_LEVEL;
      expect(mockFrom).toHaveBeenCalledWith("student_progression");
      expect(mockUpdate).toHaveBeenCalledWith({
        play_seconds: expectedTotal,
        xp: XP_PER_LEVEL,
        level: 2,
      });
      expect(mockUpdateEq).toHaveBeenCalledWith("participant_id", "p1");
    });

    it("logs but does not throw if the write fails", async () => {
      selectSingleResult = { data: { play_seconds: 0 }, error: null };
      updateEqResult = { data: null, error: { message: "boom" } };
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const persistence = createSupabasePersistence();
      await expect(persistence.addPlaySeconds("p1", 10)).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith("addPlaySeconds failed:", "boom");

      consoleSpy.mockRestore();
    });
  });
});
