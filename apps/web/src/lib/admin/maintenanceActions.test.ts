import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  mockGetUser,
  mockInsert,
  mockUpdate,
  mockEq,
  mockMaybeSingle,
  mockFrom,
  mockRecordAuditLog,
} = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockSelectAfterUpdateEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockEq = vi.fn(() => ({ select: mockSelectAfterUpdateEq }));
  return {
    mockGetUser: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(() => ({ eq: mockEq })),
    mockEq,
    mockMaybeSingle,
    mockFrom: vi.fn(() => ({ insert: mockInsert, update: mockUpdate })),
    mockRecordAuditLog: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, from: mockFrom }),
  ),
}));

vi.mock("@/lib/admin/audit", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

import { disableMaintenance, enableMaintenance } from "./maintenanceActions";

describe("enableMaintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an empty message without touching supabase", async () => {
    const result = await enableMaintenance({ message: "" });
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("inserts a new active window owned by the current admin and logs it", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockInsert.mockResolvedValue({ error: null });

    const result = await enableMaintenance({ message: "점검 중입니다", reason: "DB 마이그레이션" });

    expect(result).toEqual({ success: true, data: null });
    expect(mockInsert).toHaveBeenCalledWith({
      message: "점검 중입니다",
      reason: "DB 마이그레이션",
      created_by: "admin-1",
    });
    expect(mockRecordAuditLog).toHaveBeenCalledWith({
      action: "maintenance.enable",
      targetType: "maintenance_window",
      riskLevel: "medium",
      metadata: { reason: "DB 마이그레이션" },
      actorType: "admin",
    });
  });

  it("surfaces a conflict-style error when the insert fails (e.g. one is already active)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockInsert.mockResolvedValue({ error: { message: "duplicate key" } });

    const result = await enableMaintenance({ message: "점검 중입니다" });

    expect(result.success).toBe(false);
    expect(mockRecordAuditLog).not.toHaveBeenCalled();
  });
});

describe("disableMaintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ends the active window and logs it", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "mw-1" }, error: null });

    const result = await disableMaintenance();

    expect(result).toEqual({ success: true, data: null });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false }),
    );
    expect(mockEq).toHaveBeenCalledWith("is_active", true);
    expect(mockRecordAuditLog).toHaveBeenCalledWith({
      action: "maintenance.disable",
      targetType: "maintenance_window",
      targetId: "mw-1",
      riskLevel: "medium",
      actorType: "admin",
    });
  });

  it("reports a clear error when there is no active window to end", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await disableMaintenance();

    expect(result.success).toBe(false);
    expect(mockRecordAuditLog).not.toHaveBeenCalled();
  });
});
