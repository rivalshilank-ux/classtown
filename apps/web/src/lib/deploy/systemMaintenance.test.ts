import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { mockInsert, mockUpdate, mockMaybeSingle, mockFrom } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockSelect = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockEq = vi.fn(() => ({ select: mockSelect }));
  return {
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(() => ({ eq: mockEq })),
    mockMaybeSingle,
    mockFrom: vi.fn(() => ({ insert: mockInsert, update: mockUpdate })),
  };
});

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  disableSystemMaintenance,
  enableSystemMaintenance,
  recordSystemAuditLog,
} from "./systemMaintenance";

describe("recordSystemAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it("writes actor_type='system' with a null actor_id, bypassing record_audit_log() entirely", async () => {
    await recordSystemAuditLog({ action: "update.completed", riskLevel: "medium" });

    expect(mockFrom).toHaveBeenCalledWith("admin_audit_logs");
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_type: "system", actor_id: null, action: "update.completed" }),
    );
  });
});

describe("enableSystemMaintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a maintenance window via the service role and logs it", async () => {
    mockInsert.mockResolvedValue({ error: null });

    const result = await enableSystemMaintenance("점검 중입니다", "자동 배포");

    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ message: "점검 중입니다", reason: "자동 배포" }),
    );
  });

  it("returns false without throwing when the insert fails", async () => {
    mockInsert.mockResolvedValue({ error: { message: "boom" } });
    const result = await enableSystemMaintenance("점검 중입니다");
    expect(result).toBe(false);
  });
});

describe("disableSystemMaintenance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ends the active window and logs it", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "mw-1" }, error: null });

    const result = await disableSystemMaintenance();

    expect(result).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false }),
    );
  });

  it("returns true (nothing to do) when no window was active", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await disableSystemMaintenance();
    expect(result).toBe(true);
  });

  it("returns false without throwing on a query error", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    const result = await disableSystemMaintenance();
    expect(result).toBe(false);
  });
});
