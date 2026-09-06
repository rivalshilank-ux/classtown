import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ rpc: mockRpc })),
}));

import { getActiveMaintenanceNotice } from "./maintenance";

describe("getActiveMaintenanceNotice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the narrow public RPC, not the base table", async () => {
    mockRpc.mockResolvedValue({
      data: [{ message: "점검 중입니다", starts_at: "2026-01-01T00:00:00Z" }],
      error: null,
    });

    const result = await getActiveMaintenanceNotice();

    expect(mockRpc).toHaveBeenCalledWith("get_active_maintenance_notice");
    expect(result).toEqual({ message: "점검 중입니다", startsAt: "2026-01-01T00:00:00Z" });
  });

  it("returns null when there is no active window", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    expect(await getActiveMaintenanceNotice()).toBeNull();
  });

  it("returns null instead of throwing on an RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await getActiveMaintenanceNotice()).toBeNull();
  });
});
