import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCurrentAdmin, mockRecordAuditLog, mockUpdate, mockEqStatus, mockMaybeSingle, mockFrom } =
  vi.hoisted(() => {
    const mockMaybeSingle = vi.fn();
    const mockSelect = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
    const mockEqStatus = vi.fn(() => ({ select: mockSelect }));
    const mockEqIn = vi.fn(() => ({ select: mockSelect }));
    const mockEqId = vi.fn(() => ({ eq: mockEqStatus, in: mockEqIn }));
    const mockUpdate = vi.fn(() => ({ eq: mockEqId }));
    return {
      mockGetCurrentAdmin: vi.fn(),
      mockRecordAuditLog: vi.fn(),
      mockUpdate,
      mockEqStatus,
      mockMaybeSingle,
      mockFrom: vi.fn(() => ({ update: mockUpdate })),
    };
  });

vi.mock("@/lib/auth/getCurrentAdmin", () => ({
  getCurrentAdmin: mockGetCurrentAdmin,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

vi.mock("@/lib/admin/audit", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

import { approveUpdatePlan, cancelUpdatePlan } from "./updatePlanActions";

const ADMIN = { id: "admin-1" };

describe("approveUpdatePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentAdmin.mockResolvedValue(ADMIN);
  });

  it("fails without an admin session, without touching the database", async () => {
    mockGetCurrentAdmin.mockResolvedValue(null);
    const result = await approveUpdatePlan("plan-1");
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("approves a planned row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "plan-1" }, error: null });

    const result = await approveUpdatePlan("plan-1");

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved", approved_by: "admin-1" }),
    );
    expect(mockEqStatus).toHaveBeenCalledWith("status", "planned");
    expect(mockRecordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "update_plan.approve", riskLevel: "high" }),
    );
  });

  it("reports already-decided when the guard matches no row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await approveUpdatePlan("plan-1");
    expect(result.success).toBe(false);
    expect(mockRecordAuditLog).not.toHaveBeenCalled();
  });
});

describe("cancelUpdatePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentAdmin.mockResolvedValue(ADMIN);
  });

  it("cancels a planned or approved row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "plan-1" }, error: null });

    const result = await cancelUpdatePlan("plan-1");

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith({ status: "cancelled" });
  });

  it("reports already-decided when the guard matches no row", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await cancelUpdatePlan("plan-1");
    expect(result.success).toBe(false);
  });
});
