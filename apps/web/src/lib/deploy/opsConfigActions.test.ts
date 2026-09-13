import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCurrentAdmin, mockRecordAuditLog, mockEq, mockFrom } = vi.hoisted(() => {
  const mockEq = vi.fn();
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  return {
    mockGetCurrentAdmin: vi.fn(),
    mockRecordAuditLog: vi.fn(),
    mockEq,
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

import { updateOpsConfig } from "./opsConfigActions";

const VALID_INPUT = {
  autoUpdateEnabled: true,
  autoAnnouncementEnabled: false,
  autoRollbackEnabled: false,
  autoHealthReportEnabled: false,
};

describe("updateOpsConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentAdmin.mockResolvedValue({ id: "admin-1" });
  });

  it("rejects invalid input without touching the database", async () => {
    const result = await updateOpsConfig({ autoUpdateEnabled: "yes" });
    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("fails without an admin session", async () => {
    mockGetCurrentAdmin.mockResolvedValue(null);
    const result = await updateOpsConfig(VALID_INPUT);
    expect(result.success).toBe(false);
  });

  it("updates the flags and logs at high risk (this flips real automation on/off)", async () => {
    mockEq.mockResolvedValue({ error: null });

    const result = await updateOpsConfig(VALID_INPUT);

    expect(result).toEqual({ success: true });
    expect(mockRecordAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ops_config.update", riskLevel: "high" }),
    );
  });
});
