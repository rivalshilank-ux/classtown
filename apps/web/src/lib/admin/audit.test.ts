import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRpc = vi.fn();
const mockRange = vi.fn();
const mockOrder = vi.fn(() => ({ range: mockRange }));
const mockSelect = vi.fn(() => ({ order: mockOrder }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({ rpc: mockRpc, from: mockFrom }),
  ),
}));

import { AUDIT_PAGE_SIZE, listAuditLogs, recordAuditLog } from "./audit";

describe("recordAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the record_audit_log RPC with defaults filled in", async () => {
    mockRpc.mockResolvedValue({ data: {}, error: null });

    await recordAuditLog({ action: "admin.login" });

    expect(mockRpc).toHaveBeenCalledWith("record_audit_log", {
      p_action: "admin.login",
      p_target_type: undefined,
      p_target_id: undefined,
      p_risk_level: "low",
      p_status: "success",
      p_metadata: {},
      p_actor_type: "admin",
    });
  });

  it("passes through explicit risk level, status, target, and metadata", async () => {
    mockRpc.mockResolvedValue({ data: {}, error: null });

    await recordAuditLog({
      action: "class.archive",
      targetType: "class",
      targetId: "class-1",
      riskLevel: "medium",
      status: "failed",
      metadata: { reason: "duplicate" },
    });

    expect(mockRpc).toHaveBeenCalledWith("record_audit_log", {
      p_action: "class.archive",
      p_target_type: "class",
      p_target_id: "class-1",
      p_risk_level: "medium",
      p_status: "failed",
      p_metadata: { reason: "duplicate" },
      p_actor_type: "admin",
    });
  });

  it("passes actorType through as p_actor_type when AI Ops auto-executed the action", async () => {
    mockRpc.mockResolvedValue({ data: {}, error: null });

    await recordAuditLog({ action: "announcement.create", actorType: "ai" });

    expect(mockRpc).toHaveBeenCalledWith(
      "record_audit_log",
      expect.objectContaining({ p_actor_type: "ai" }),
    );
  });

  it("never throws when the RPC fails -- logging must not break the caller's action", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "not authorized" } });

    await expect(recordAuditLog({ action: "admin.login" })).resolves.toBeUndefined();
  });
});

describe("listAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps rows and paginates using AUDIT_PAGE_SIZE", async () => {
    mockRange.mockResolvedValue({
      data: [
        {
          id: "log-1",
          actor_type: "admin",
          actor_id: "admin-1",
          action: "admin.login",
          target_type: null,
          target_id: null,
          risk_level: "low",
          status: "success",
          metadata: {},
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      count: 1,
      error: null,
    });

    const result = await listAuditLogs(1);

    expect(mockFrom).toHaveBeenCalledWith("admin_audit_logs");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockRange).toHaveBeenCalledWith(0, AUDIT_PAGE_SIZE - 1);
    expect(result).toEqual({
      items: [
        {
          id: "log-1",
          actorType: "admin",
          actorId: "admin-1",
          action: "admin.login",
          targetType: null,
          targetId: null,
          riskLevel: "low",
          status: "success",
          metadata: {},
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 1,
    });
  });

  it("requests the correct range for page 2", async () => {
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });
    await listAuditLogs(2);
    expect(mockRange).toHaveBeenCalledWith(AUDIT_PAGE_SIZE, AUDIT_PAGE_SIZE * 2 - 1);
  });

  it("returns an empty page instead of throwing on a query error", async () => {
    mockRange.mockResolvedValue({ data: null, count: null, error: { message: "boom" } });
    const result = await listAuditLogs(1);
    expect(result).toEqual({ items: [], total: 0 });
  });
});
