import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    }),
  ),
}));

import { getCurrentAdmin } from "./getCurrentAdmin";

describe("getCurrentAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when there is no session, without querying the database", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await getCurrentAdmin();
    expect(result).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("scopes the profile query to the current user's own id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockSingle.mockResolvedValue({
      data: {
        id: "admin-1",
        name: "관리자",
        email: "admin@example.com",
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
      error: null,
    });

    const result = await getCurrentAdmin();

    expect(mockFrom).toHaveBeenCalledWith("admin_accounts");
    expect(mockEq).toHaveBeenCalledWith("id", "admin-1");
    expect(result).toEqual({
      id: "admin-1",
      role: "admin",
      name: "관리자",
      email: "admin@example.com",
      isActive: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    });
  });

  it("returns null when a teacher (no admin_accounts row) is authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "teacher-1" } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    const result = await getCurrentAdmin();
    expect(result).toBeNull();
  });

  it("returns null when the admin account has been deactivated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-1" } } });
    mockSingle.mockResolvedValue({
      data: {
        id: "admin-1",
        name: "관리자",
        email: "admin@example.com",
        is_active: false,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
      error: null,
    });
    const result = await getCurrentAdmin();
    expect(result).toBeNull();
  });
});
