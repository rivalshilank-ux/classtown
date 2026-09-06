import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock calls are hoisted above every other top-level statement, including
// plain `const`s -- with more than one in a file, the mocked variables must
// be declared via vi.hoisted() or the factory below runs before its `const`
// initializer does (a TDZ error).
const {
  mockSignInWithPassword,
  mockSignOut,
  mockFrom,
  mockSingle,
  mockRecordAuditLog,
  mockVerifyAdminCode,
  mockConsumeRateLimit,
} = vi.hoisted(() => {
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  return {
    mockSignInWithPassword: vi.fn(),
    mockSignOut: vi.fn(),
    mockFrom: vi.fn(() => ({ select: mockSelect })),
    mockSingle,
    mockRecordAuditLog: vi.fn(),
    mockVerifyAdminCode: vi.fn(),
    mockConsumeRateLimit: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() =>
    Promise.resolve({
      auth: { signInWithPassword: mockSignInWithPassword, signOut: mockSignOut },
      from: mockFrom,
    }),
  ),
}));

vi.mock("@/lib/admin/audit", () => ({
  recordAuditLog: mockRecordAuditLog,
}));

vi.mock("@/lib/auth/adminCode", () => ({
  verifyAdminCode: mockVerifyAdminCode,
}));

vi.mock("@/lib/class/rateLimit", () => ({
  consumeRateLimit: mockConsumeRateLimit,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve({ get: () => "203.0.113.5" })),
}));

import { signInAdmin, signOutAdmin } from "./adminActions";

const VALID_LOGIN = { adminCode: "the-code", email: "admin@example.com", password: "password1" };

describe("signInAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsumeRateLimit.mockReturnValue(true);
    mockVerifyAdminCode.mockReturnValue(true);
  });

  it("rejects invalid input without calling supabase", async () => {
    const result = await signInAdmin({ adminCode: "x", email: "not-an-email", password: "" });
    expect(result.success).toBe(false);
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects when rate-limited, without checking the admin code or calling supabase", async () => {
    mockConsumeRateLimit.mockReturnValue(false);

    const result = await signInAdmin(VALID_LOGIN);

    expect(result.success).toBe(false);
    expect(mockVerifyAdminCode).not.toHaveBeenCalled();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("rejects an incorrect admin code without ever calling supabase", async () => {
    mockVerifyAdminCode.mockReturnValue(false);

    const result = await signInAdmin(VALID_LOGIN);

    expect(result.success).toBe(false);
    expect(mockVerifyAdminCode).toHaveBeenCalledWith("the-code");
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("succeeds when the admin code is correct and the authenticated user has an active admin_accounts row", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
    mockSingle.mockResolvedValue({ data: { id: "admin-1", is_active: true }, error: null });

    const result = await signInAdmin(VALID_LOGIN);

    expect(result).toEqual({ success: true });
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "password1",
    });
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockRecordAuditLog).toHaveBeenCalledWith({ action: "admin.login" });
  });

  it("signs the session back out and fails when there is no admin_accounts row (e.g. a teacher)", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "teacher-1" } },
      error: null,
    });
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const result = await signInAdmin(VALID_LOGIN);

    expect(result.success).toBe(false);
    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(mockRecordAuditLog).not.toHaveBeenCalled();
  });

  it("signs the session back out and fails when the admin account is deactivated", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
    mockSingle.mockResolvedValue({ data: { id: "admin-1", is_active: false }, error: null });

    const result = await signInAdmin(VALID_LOGIN);

    expect(result.success).toBe(false);
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("reports a generic error when the credentials themselves are wrong", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const result = await signInAdmin(VALID_LOGIN);

    expect(result.success).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("signOutAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs the session out", async () => {
    mockSignOut.mockResolvedValue({ error: null });
    const result = await signOutAdmin();
    expect(result).toEqual({ success: true });
  });

  it("records the audit log before tearing down the session", async () => {
    const callOrder: string[] = [];
    mockRecordAuditLog.mockImplementation(() => {
      callOrder.push("audit");
      return Promise.resolve();
    });
    mockSignOut.mockImplementation(() => {
      callOrder.push("signOut");
      return Promise.resolve({ error: null });
    });

    await signOutAdmin();

    expect(mockRecordAuditLog).toHaveBeenCalledWith({ action: "admin.logout" });
    expect(callOrder).toEqual(["audit", "signOut"]);
  });
});
