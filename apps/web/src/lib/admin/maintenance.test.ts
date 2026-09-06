import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockMaybeSingle = vi.fn();
const mockRange = vi.fn();
const mockOrder = vi.fn(() => ({ range: mockRange }));
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq, order: mockOrder }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

import {
  getCurrentMaintenanceWindow,
  listMaintenanceHistory,
  MAINTENANCE_HISTORY_PAGE_SIZE,
} from "./maintenance";

describe("getCurrentMaintenanceWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the active window when one exists", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "mw-1",
        is_active: true,
        message: "점검 중입니다",
        reason: "DB 마이그레이션",
        starts_at: "2026-01-01T00:00:00Z",
        ends_at: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });

    const result = await getCurrentMaintenanceWindow();

    expect(mockEq).toHaveBeenCalledWith("is_active", true);
    expect(result).toEqual({
      id: "mw-1",
      isActive: true,
      message: "점검 중입니다",
      reason: "DB 마이그레이션",
      startsAt: "2026-01-01T00:00:00Z",
      endsAt: null,
      createdAt: "2026-01-01T00:00:00Z",
    });
  });

  it("returns null when there is no active window", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await getCurrentMaintenanceWindow();
    expect(result).toBeNull();
  });
});

describe("listMaintenanceHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("paginates using MAINTENANCE_HISTORY_PAGE_SIZE", async () => {
    mockRange.mockResolvedValue({ data: [], count: 0, error: null });
    await listMaintenanceHistory(2);
    expect(mockRange).toHaveBeenCalledWith(
      MAINTENANCE_HISTORY_PAGE_SIZE,
      MAINTENANCE_HISTORY_PAGE_SIZE * 2 - 1,
    );
  });

  it("returns an empty page instead of throwing on a query error", async () => {
    mockRange.mockResolvedValue({ data: null, count: null, error: { message: "boom" } });
    const result = await listMaintenanceHistory();
    expect(result).toEqual({ items: [], total: 0 });
  });
});
