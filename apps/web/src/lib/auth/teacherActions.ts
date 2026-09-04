"use server";

import { teacherLoginSchema, teacherSignupSchema } from "@classtown/shared-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/auth/formErrors";

export type ActionResult =
  | { success: true; requiresEmailConfirmation: boolean }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

const GENERIC_LOGIN_ERROR = "이메일 또는 비밀번호가 올바르지 않습니다.";
const GENERIC_SIGNUP_ERROR = "회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.";
const EMAIL_TAKEN_ERROR = "이미 가입된 이메일입니다.";
const VALIDATION_ERROR = "입력값을 확인해 주세요.";

function isAlreadyRegisteredError(message: string): boolean {
  return /already registered|already exists|user already/i.test(message);
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
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, school_name: schoolName },
    },
  });

  if (error) {
    return {
      success: false,
      error: isAlreadyRegisteredError(error.message)
        ? EMAIL_TAKEN_ERROR
        : GENERIC_SIGNUP_ERROR,
    };
  }

  return { success: true, requiresEmailConfirmation: data.session === null };
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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { success: false, error: GENERIC_LOGIN_ERROR };
  }

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
