import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { getMyProgress, joinClass } from "./studentActions";
import { resetRateLimits } from "./rateLimit";

interface QueryResult {
  data?: unknown;
  error?: unknown;
}

/** Universal chainable + thenable stub -- every getMyProgress lookup is a
 * plain .select().eq()...maybeSingle() chain, so one shape covers all three
 * tables it touches. */
function createQueryStub(getResult: () => QueryResult) {
  const methods = ["select", "eq", "maybeSingle"] as const;
  const stub: Record<string, unknown> = {};
  for (const method of methods) {
    stub[method] = vi.fn(() => stub);
  }
  stub.then = (onFulfilled: (v: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(getResult()).then(onFulfilled, onRejected);
  return stub;
}

// vi.mock calls are hoisted above every other top-level statement -- with
// more than one in a file, the mocked variables need vi.hoisted() or the
// factory below runs before its `const` initializer does (a TDZ error).
const { mockRpc, mockFrom, mockGetActiveMaintenanceNotice } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockGetActiveMaintenanceNotice: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => ({ rpc: mockRpc, from: mockFrom })),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() =>
    Promise.resolve({ get: (_name: string) => "203.0.113.5" }),
  ),
}));

vi.mock("@/lib/site/maintenance", () => ({
  getActiveMaintenanceNotice: mockGetActiveMaintenanceNotice,
}));

const SUCCESS_ROW = {
  ticket_id: "11111111-1111-4111-8111-111111111111",
  participant_id: "22222222-2222-4222-8222-222222222222",
  participant_code: "ABC234",
  nickname: "민지",
  class_id: "33333333-3333-4333-8333-333333333333",
};

/** The one message every rejection has to produce. */
const GENERIC = "참가 코드를 확인해 주세요.";

describe("joinClass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    mockGetActiveMaintenanceNotice.mockResolvedValue(null);
  });

  it("blocks a join with a server-authoritative check when maintenance is active, without calling the database", async () => {
    mockGetActiveMaintenanceNotice.mockResolvedValue({
      message: "점검 중",
      startsAt: "2026-01-01T00:00:00Z",
    });

    const result = await joinClass({ classCode: "ABC234", nickname: "민지" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("MAINTENANCE_MODE");
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("normalizes a dashed, lowercase class code before sending it", async () => {
    mockRpc.mockResolvedValue({ data: [SUCCESS_ROW], error: null });

    await joinClass({ classCode: "abc-234", nickname: "민지" });

    expect(mockRpc).toHaveBeenCalledWith(
      "join_class",
      expect.objectContaining({ p_class_code: "ABC234" }),
    );
  });

  it("returns the ticket but never the participant id", async () => {
    mockRpc.mockResolvedValue({ data: [SUCCESS_ROW], error: null });

    const result = await joinClass({ classCode: "ABC234", nickname: "민지" });

    expect(result).toEqual({
      success: true,
      ticketId: SUCCESS_ROW.ticket_id,
      nickname: "민지",
      participantCode: "ABC234",
      classCode: "ABC234",
    });
    expect(JSON.stringify(result)).not.toContain(SUCCESS_ROW.participant_id);
  });

  it("rejects a malformed class code without calling the database", async () => {
    const result = await joinClass({ classCode: "!!", nickname: "민지" });

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("gives the same message whether the class is missing, closed, or the code is wrong", async () => {
    // All of those come back from the database as an empty result set.
    mockRpc.mockResolvedValue({ data: [], error: null });

    const missing = await joinClass({ classCode: "AAAAAA", nickname: "a" });
    const wrongCode = await joinClass({
      classCode: "BBBBBB",
      participantCode: "CCCCCC",
    });

    expect(missing).toEqual({ success: false, error: GENERIC });
    expect(wrongCode).toEqual({ success: false, error: GENERIC });
  });

  it("does not leak a database error to the student", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'relation "classes" does not exist' },
    });

    const result = await joinClass({ classCode: "ABC234", nickname: "민지" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).not.toContain("relation");
    }
  });

  it("stops calling the database once the rate limit is exhausted", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    for (let i = 0; i < 10; i += 1) {
      await joinClass({ classCode: "ABC234", nickname: "민지" });
    }
    expect(mockRpc).toHaveBeenCalledTimes(10);

    const blocked = await joinClass({ classCode: "ABC234", nickname: "민지" });
    expect(blocked).toEqual({
      success: false,
      error: "잠시 후 다시 시도해 주세요.",
    });
    expect(mockRpc).toHaveBeenCalledTimes(10);
  });

  it("passes a participant code through for a returning student", async () => {
    mockRpc.mockResolvedValue({ data: [SUCCESS_ROW], error: null });

    await joinClass({ classCode: "ABC234", participantCode: "xyz-789" });

    expect(mockRpc).toHaveBeenCalledWith(
      "join_class",
      expect.objectContaining({ p_participant_code: "XYZ789" }),
    );
  });
});

describe("getMyProgress", () => {
  const CLASS_ROW = { id: "class-1" };
  const PARTICIPANT_ROW = { id: "participant-1" };

  let classResult: QueryResult;
  let participantResult: QueryResult;
  let progressionResult: QueryResult;

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();

    classResult = { data: CLASS_ROW, error: null };
    participantResult = { data: PARTICIPANT_ROW, error: null };
    progressionResult = { data: { xp: 250, level: 3 }, error: null };

    // Each lookup this action makes is a fresh .from(table) call; return a
    // stub resolving to that table's own configured result.
    mockFrom.mockImplementation((table: string) => {
      if (table === "classes") return createQueryStub(() => classResult);
      if (table === "student_participants") return createQueryStub(() => participantResult);
      if (table === "student_progression") return createQueryStub(() => progressionResult);
      throw new Error(`unexpected table: ${table}`);
    });
  });

  it("rejects a malformed input without calling the database", async () => {
    const result = await getMyProgress({ classCode: "!!", participantCode: "ABC234" });

    expect(result).toEqual({ success: false, error: GENERIC });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns xp and level for a valid, active participant", async () => {
    const result = await getMyProgress({ classCode: "ABC234", participantCode: "XYZ789" });

    expect(result).toEqual({ success: true, xp: 250, level: 3 });
  });

  it("gives the same generic message for an unknown class code as for a wrong participant code", async () => {
    classResult = { data: null, error: null };
    const unknownClass = await getMyProgress({ classCode: "AAAAAA", participantCode: "XYZ789" });
    expect(unknownClass).toEqual({ success: false, error: GENERIC });

    classResult = { data: CLASS_ROW, error: null };
    participantResult = { data: null, error: null };
    const wrongParticipant = await getMyProgress({ classCode: "ABC234", participantCode: "ZZZZZZ" });
    expect(wrongParticipant).toEqual({ success: false, error: GENERIC });
  });

  it("never reveals a removed participant's progress", async () => {
    // The lookup itself filters on status = 'active', so a removed
    // participant simply matches no row -- same as a wrong code.
    participantResult = { data: null, error: null };

    const result = await getMyProgress({ classCode: "ABC234", participantCode: "XYZ789" });

    expect(result).toEqual({ success: false, error: GENERIC });
  });

  it("stops calling the database once the rate limit is exhausted", async () => {
    for (let i = 0; i < 10; i += 1) {
      await getMyProgress({ classCode: "ABC234", participantCode: "XYZ789" });
    }
    expect(mockFrom).toHaveBeenCalled();

    const callsBeforeBlock = mockFrom.mock.calls.length;
    const blocked = await getMyProgress({ classCode: "ABC234", participantCode: "XYZ789" });

    expect(blocked).toEqual({ success: false, error: "잠시 후 다시 시도해 주세요." });
    expect(mockFrom).toHaveBeenCalledTimes(callsBeforeBlock);
  });
});
