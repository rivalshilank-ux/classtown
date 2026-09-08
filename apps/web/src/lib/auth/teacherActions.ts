"use server";

import { teacherLoginSchema, teacherSignupSchema } from "@classtown/shared-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/auth/formErrors";

export type ActionResult =
  | { success: true; requiresEmailConfirmation: boolean }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

const GENERIC_LOGIN_ERROR = "이메일 또는 비밀번호가 올바르지 않습니다.";
const EMAIL_NOT_CONFIRMED_ERROR =
  "이메일 인증이 완료되지 않았습니다. 가입 시 받은 인증 메일의 링크를 확인해 주세요.";
const RATE_LIMITED_ERROR = "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
const TEMPORARY_LOGIN_ERROR = "일시적인 오류로 로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const GENERIC_SIGNUP_ERROR = "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.";
const EMAIL_TAKEN_ERROR = "이미 가입된 이메일입니다.";
const WEAK_PASSWORD_ERROR = "비밀번호가 보안 기준을 충족하지 않습니다. 다른 비밀번호를 사용해 주세요.";
const SIGNUP_RATE_LIMITED_ERROR = "가입 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
const VALIDATION_ERROR = "입력값을 확인해 주세요.";

const isDev = process.env.NODE_ENV !== "production";

function devLog(step: string, detail?: Record<string, unknown>) {
  if (isDev) {
    // Dev-only: never pass password/access_token/refresh_token/service_role_key here.
    console.debug(`[auth:teacher] ${step}`, detail ?? "");
  }
}

function isAlreadyRegisteredError(message: string): boolean {
  return /already registered|already exists|user already/i.test(message);
}

// Same shape of fix as resolveLoginError below: the previous implementation
// collapsed every signUp error other than "already registered" into one
// generic message, which also hid a genuine "Database error saving new
// user" (code unexpected_failure) -- the failure mode if the
// handle_new_teacher() trigger on auth.users ever breaks -- behind the same
// wording as a merely-weak password. Duck-typed on `code` for the same
// cross-module-identity reason as resolveLoginError.
function resolveSignupError(error: { code?: string; status?: number; name?: string; message: string }): string {
  devLog("signup failure", { code: error.code, status: error.status, name: error.name });
  switch (error.code) {
    case "email_exists":
    case "user_already_exists":
      return EMAIL_TAKEN_ERROR;
    case "weak_password":
      return WEAK_PASSWORD_ERROR;
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return SIGNUP_RATE_LIMITED_ERROR;
    default:
      // Covers signup_disabled, validation_failed, unexpected_failure (e.g. a
      // broken handle_new_teacher trigger), and anything unrecognized. Never
      // leak supabase's own wording to the client -- the dev log above still
      // shows exactly which one it was. The message regex is kept only as a
      // fallback for older/edge responses that carry no `code` at all.
      return isAlreadyRegisteredError(error.message) ? EMAIL_TAKEN_ERROR : GENERIC_SIGNUP_ERROR;
  }
}

// Maps a Supabase Auth error to a safe, user-facing message. The previous
// implementation collapsed every error (wrong password, unconfirmed email,
// rate limiting, a misconfigured project) into "invalid credentials", which
// made non-credential failures look like a wrong password to the user.
//
// Duck-typed on `code`/`status` rather than `instanceof AuthApiError`: the
// real supabase-js client always returns an AuthError-shaped object here
// (that's `resolveLoginError`'s actual input in production), and duck-typing
// avoids a brittle cross-module identity check while staying easy to test.
function resolveLoginError(error: { code?: string; status?: number; name?: string }): string {
  devLog("auth failure", { code: error.code, status: error.status, name: error.name });
  switch (error.code) {
    case "email_not_confirmed":
      return EMAIL_NOT_CONFIRMED_ERROR;
    case "over_request_rate_limit":
      return RATE_LIMITED_ERROR;
    case undefined:
    case "invalid_credentials":
      // No code at all (older/edge Auth responses) is treated the same as the
      // explicit "wrong password" code — the safe, ambiguous default.
      return GENERIC_LOGIN_ERROR;
    default:
      // Unrecognized Auth error (e.g. project/network misconfiguration) —
      // do NOT tell the teacher their password is wrong when it might not be.
      return TEMPORARY_LOGIN_ERROR;
  }
}

export async function signUpTeacher(input: unknown): Promise<ActionResult> {
  const parsed = teacherSignupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: VALIDATION_ERROR,
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  const { name, schoolName, email, password } = parsed.data;
  devLog("signup started");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, school_name: schoolName },
    },
  });

  if (error) {
    return { success: false, error: resolveSignupError(error) };
  }

  devLog("signup success", { userExists: Boolean(data?.user), sessionExists: Boolean(data?.session) });
  return { success: true, requiresEmailConfirmation: data?.session === null };
}

export async function signInTeacher(input: unknown): Promise<ActionResult> {
  const parsed = teacherLoginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: VALIDATION_ERROR,
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  devLog("login started");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { success: false, error: resolveLoginError(error) };
  }

  devLog("auth success", { userExists: Boolean(data?.user), sessionExists: Boolean(data?.session) });
  return { success: true, requiresEmailConfirmation: false };
}

export async function signOutTeacher(): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: "로그아웃에 실패했습니다. 다시 시도해 주세요." };
  }

  return { success: true, requiresEmailConfirmation: false };
}
