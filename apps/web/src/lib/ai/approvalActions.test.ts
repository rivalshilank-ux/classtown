import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetCurrentAdmin,
  mockUpdate,
  mockEqId,
  mockEqStatus,
  mockMaybeSingle,
  mockFrom,
  mockGetTool,
  mockFinalEq,
} = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockEqStatus = vi.fn(() => ({ select: mockSelect }));
  const mockEqId = vi.fn(() => ({ eq: mockEqStatus }));
  const mockUpdate = vi.fn(() => ({ eq: mockEqId }));

  const mockFinalEq = vi.fn();

  return {
    mockGetCurrentAdmin: vi.fn(),
    mockUpdate,
    mockEqId,
    mockEqStatus,
    mockMaybeSingle,
    mockFrom: vi.fn((): unknown => ({ update: mockUpdate })),
    mockGetTool: vi.fn(),
    mockFinalEq,
  };
});

vi.mock("@/lib/auth/getCurrentAdmin", () => ({
  getCurrentAdmin: mockGetCurrentAdmin,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock("@/lib/ai/toolRegistry", () => ({
  getTool: mockGetTool,
}));

import { approveApproval, rejectApproval } from "./approvalActions";

const ADMIN = { id: "admin-1" };

/** The claim update (from -> update -> eq(id) -> eq(status) -> select -> maybeSingle) is call #1 to `from`; the result-recording update (from -> update -> eq(id)) is call #2, with a distinct chain shape. */
function wireApproveCalls() {
  mockFrom
    .mockImplementationOnce(() => ({ update: mockUpdate }))
    .mockImplementationOnce(() => ({ update: () => ({ eq: mockFinalEq }) }));
}

describe("rejectApproval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentAdmin.mockResolvedValue(ADMIN);
  });

  it("fails without an admin session, without touching the database", async () => {
    mockGetCurrentAdmin.mockResolvedValue(null);
    const result = await rejectApproval("row-1");
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects a pending row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "row-1" }, error: null });

    const result = await rejectApproval("row-1");

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "rejected", decided_by: "admin-1" }),
    );
    expect(mockEqId).toHaveBeenCalledWith("id", "row-1");
    expect(mockEqStatus).toHaveBeenCalledWith("status", "pending");
  });

  it("reports already-decided when the pending guard matches no row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await rejectApproval("row-1");
    expect(result.success).toBe(false);
  });
});

describe("approveApproval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentAdmin.mockResolvedValue(ADMIN);
    mockFinalEq.mockResolvedValue({ error: null });
  });

  it("fails without an admin session, without touching the database", async () => {
    mockGetCurrentAdmin.mockResolvedValue(null);
    const result = await approveApproval("row-1");
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("reports already-decided when the claim guard matches no row, without calling any tool handler", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await approveApproval("row-1");

    expect(result.success).toBe(false);
    expect(mockGetTool).not.toHaveBeenCalled();
  });

  it("calls the real tool handler exactly once with actorType 'admin' and records success", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "row-1", tool_name: "enable_maintenance", input: { message: "m" } },
      error: null,
    });
    const handler = vi.fn().mockResolvedValue({ ok: true, data: { done: true } });
    mockGetTool.mockReturnValue({ handler });
    wireApproveCalls();

    const result = await approveApproval("row-1");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ message: "m" }, "admin");
    expect(result).toEqual({ success: true });
    expect(mockFinalEq).toHaveBeenCalledWith("id", "row-1");
  });

  it("marks the row failed and returns the handler's error when the tool reports failure", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "row-1", tool_name: "enable_maintenance", input: { message: "m" } },
      error: null,
    });
    const handler = vi.fn().mockResolvedValue({ ok: false, message: "이미 점검 중입니다." });
    mockGetTool.mockReturnValue({ handler });
    wireApproveCalls();

    const result = await approveApproval("row-1");

    expect(result).toEqual({ success: false, error: "이미 점검 중입니다." });
  });

  it("fails and never calls a handler when the proposed tool no longer exists in the registry", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "row-1", tool_name: "no_longer_registered", input: {} },
      error: null,
    });
    mockGetTool.mockReturnValue(undefined);
    wireApproveCalls();

    const result = await approveApproval("row-1");

    expect(result.success).toBe(false);
  });
});
