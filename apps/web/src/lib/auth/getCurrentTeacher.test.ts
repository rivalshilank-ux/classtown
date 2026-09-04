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

import { getCurrentTeacher } from "./getCurrentTeacher";

describe("getCurrentTeacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when there is no session, without querying the database", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const result = await getCurrentTeacher();
    expect(result).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("scopes the profile query to the current user's own id", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email_confirmed_at: "2026-01-01T00:00:00Z" } },
    });
    mockSingle.mockResolvedValue({
      data: {
        id: "user-1",
        name: "김선생",
        school_name: "클래스타운초등학교",
        email: "teacher@example.com",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
      },
      error: null,
    });

    const result = await getCurrentTeacher();

    expect(mockFrom).toHaveBeenCalledWith("teacher_accounts");
    expect(mockEq).toHaveBeenCalledWith("id", "user-1");
    expect(result).toEqual({
      id: "user-1",
      role: "teacher",
      name: "김선생",
      schoolName: "클래스타운초등학교",
      email: "teacher@example.com",
      emailVerified: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    });
  });

  it("reports emailVerified: false when the auth user hasn't confirmed their email", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email_confirmed_at: null } },
    });
    mockSingle.mockResolvedValue({
      data: {
        id: "user-1",
        name: "김선생",
        school_name: "학교",
        email: "teacher@example.com",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });

    const result = await getCurrentTeacher();
    expect(result?.emailVerified).toBe(false);
  });

  it("returns null when the profile row can't be found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });
    const result = await getCurrentTeacher();
    expect(result).toBeNull();
  });
});
