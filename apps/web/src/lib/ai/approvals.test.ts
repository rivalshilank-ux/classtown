import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockOrder = vi.fn();
const mockEq = vi.fn(() => ({ order: mockOrder }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

import { listPendingApprovals } from "./approvals";

describe("listPendingApprovals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("only queries pending rows, oldest first", async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });
    await listPendingApprovals();
    expect(mockEq).toHaveBeenCalledWith("status", "pending");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("maps rows to the PendingApproval shape", async () => {
    mockOrder.mockResolvedValue({
      data: [
        {
          id: "row-1",
          tool_name: "enable_maintenance",
          risk_level: "medium",
          input: { message: "점검" },
          status: "pending",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const result = await listPendingApprovals();

    expect(result).toEqual([
      {
        id: "row-1",
        toolName: "enable_maintenance",
        riskLevel: "medium",
        input: { message: "점검" },
        status: "pending",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ]);
  });

  it("returns an empty list instead of throwing on a query error", async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await listPendingApprovals()).toEqual([]);
  });
});
