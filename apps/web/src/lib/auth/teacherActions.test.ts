import { beforeEach, describe, expect, it, vi } from "vitest";
import { signInTeacher, signOutTeacher, signUpTeacher } from "./teacherActions";

const mockAuth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve({ auth: mockAuth })),
}));

const VALID_SIGNUP = {
  name: "김선생",
  schoolName: "클래스타운초등학교",
  email: "teacher@example.com",
  password: "password1",
  confirmPassword: "password1",
};

describe("signUpTeacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid input without calling supabase", async () => {
    const result = await signUpTeacher({ ...VALID_SIGNUP, email: "not-an-email" });
    expect(result.success).toBe(false);
    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });

  it("reports a fieldError for the specific invalid field", async () => {
    const result = await signUpTeacher({ ...VALID_SIGNUP, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("calls supabase.auth.signUp with the validated, mapped fields", async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: {} }, error: null });

    const result = await signUpTeacher(VALID_SIGNUP);

    expect(result).toEqual({ success: true, requiresEmailConfirmation: false });
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: VALID_SIGNUP.email,
      password: VALID_SIGNUP.password,
      options: {
        data: { name: VALID_SIGNUP.name, school_name: VALID_SIGNUP.schoolName },
      },
    });
  });

  it("reports requiresEmailConfirmation when supabase returns no session", async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const result = await signUpTeacher(VALID_SIGNUP);
    expect(result).toEqual({ success: true, requiresEmailConfirmation: true });
  });

  it("maps an 'already registered' supabase error to a safe, specific message", async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: "User already registered" },
    });
    const result = await signUpTeacher(VALID_SIGNUP);
    expect(result).toEqual({ success: false, error: "이미 가입된 이메일입니다." });
  });

  it("never surfaces supabase's own error message for unrelated failures", async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: "some internal detail that must not leak" },
    });
    const result = await signUpTeacher(VALID_SIGNUP);
    expect(result).toEqual({
      success: false,
      error: "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    });
  });

  it("maps code: email_exists to the same safe 'already registered' message", async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: "A user with this email address has already been registered", code: "email_exists", status: 422 },
    });
    const result = await signUpTeacher(VALID_SIGNUP);
    expect(result).toEqual({ success: false, error: "이미 가입된 이메일입니다." });
  });

  it("reports a distinct message when supabase rejects the password as too weak", async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: "Password should contain at least one special character", code: "weak_password", status: 422 },
    });
    const result = await signUpTeacher(VALID_SIGNUP);
    expect(result).toEqual({
      success: false,
      error: "비밀번호가 보안 기준을 충족하지 않습니다. 다른 비밀번호를 사용해 주세요.",
    });
  });

  it("reports a distinct message when supabase is rate-limiting signups", async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: "Email rate limit exceeded", code: "over_email_send_rate_limit", status: 429 },
    });
    const result = await signUpTeacher(VALID_SIGNUP);
    expect(result).toEqual({
      success: false,
      error: "가입 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    });
  });

  it("falls back to the generic message (not a leaked internal detail) for a database-side failure", async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: "Database error saving new user", code: "unexpected_failure", status: 500 },
    });
    const result = await signUpTeacher(VALID_SIGNUP);
    expect(result).toEqual({
      success: false,
      error: "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.",
    });
  });
});

describe("signInTeacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid input without calling supabase", async () => {
    const result = await signInTeacher({ email: "", password: "" });
    expect(result.success).toBe(false);
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("succeeds with valid credentials", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null });
    const result = await signInTeacher({
      email: "teacher@example.com",
      password: "anything",
    });
    expect(result).toEqual({ success: true, requiresEmailConfirmation: false });
  });

  it("returns a generic message on invalid credentials, never supabase's own wording", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    const result = await signInTeacher({
      email: "teacher@example.com",
      password: "wrong",
    });
    expect(result).toEqual({
      success: false,
      error: "이메일 또는 비밀번호가 올바르지 않습니다.",
    });
  });

  it("returns the same generic credentials message when supabase sets code: invalid_credentials", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials", code: "invalid_credentials", status: 400 },
    });
    const result = await signInTeacher({
      email: "teacher@example.com",
      password: "wrong",
    });
    expect(result).toEqual({
      success: false,
      error: "이메일 또는 비밀번호가 올바르지 않습니다.",
    });
  });

  it("does NOT report a credentials error when the real cause is an unconfirmed email", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: "Email not confirmed", code: "email_not_confirmed", status: 400 },
    });
    const result = await signInTeacher({
      email: "teacher@example.com",
      password: "correct-password",
    });
    expect(result).toEqual({
      success: false,
      error: "이메일 인증이 완료되지 않았습니다. 가입 시 받은 인증 메일의 링크를 확인해 주세요.",
    });
  });

  it("does NOT report a credentials error when supabase is rate-limiting the request", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: "Request rate limit reached", code: "over_request_rate_limit", status: 429 },
    });
    const result = await signInTeacher({
      email: "teacher@example.com",
      password: "correct-password",
    });
    expect(result).toEqual({
      success: false,
      error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
    });
  });

  it("does NOT report a credentials error for an unrecognized/config-shaped auth error", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid API key", code: "invalid_api_key", status: 401 },
    });
    const result = await signInTeacher({
      email: "teacher@example.com",
      password: "correct-password",
    });
    expect(result).toEqual({
      success: false,
      error: "일시적인 오류로 로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    });
  });
});

describe("signOutTeacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls supabase.auth.signOut and reports success", async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    const result = await signOutTeacher();
    expect(result).toEqual({ success: true, requiresEmailConfirmation: false });
    expect(mockAuth.signOut).toHaveBeenCalled();
  });
});
