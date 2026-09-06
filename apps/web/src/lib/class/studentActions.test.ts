import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { joinClass } from "./studentActions";
import { resetRateLimits } from "./rateLimit";

// vi.mock calls are hoisted above every other top-level statement -- with
// more than one in a file, the mocked variables need vi.hoisted() or the
// factory below runs before its `const` initializer does (a TDZ error).
const { mockRpc, mockGetActiveMaintenanceNotice } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockGetActiveMaintenanceNotice: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => ({ rpc: mockRpc })),
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
