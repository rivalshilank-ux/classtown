"use server";

import { headers } from "next/headers";
import { adminLoginSchema } from "@classtown/shared-schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/auth/formErrors";
import { recordAuditLog } from "@/lib/admin/audit";
import { verifyAdminCode } from "@/lib/auth/adminCode";
import { consumeRateLimit } from "@/lib/class/rateLimit";

export type AdminActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

const GENERIC_LOGIN_ERROR = "이메일 또는 비밀번호가 올바르지 않습니다.";
const NOT_ADMIN_ERROR = "관리자 계정이 아닙니다.";
const VALIDATION_ERROR = "입력값을 확인해 주세요.";
const INVALID_CODE_ERROR = "관리자 코드가 올바르지 않습니다.";
const RATE_LIMITED_ERROR = "잠시 후 다시 시도해 주세요.";

const CODE_ATTEMPTS_PER_WINDOW = 5;
const CODE_WINDOW_MS = 5 * 60_000;

async function clientKey(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}

export async function signInAdmin(input: unknown): Promise<AdminActionResult> {
  const parsed = adminLoginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: VALIDATION_ERROR,
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  // The Admin Code is a pre-gate in front of the real login below, not a
  // replacement for it -- see docs/adr/0006-hidden-admin-entry.md. Checked,
  // and rate-limited, before Supabase is ever touched: a wrong code never
  // attempts (or reveals anything about) real credentials, and never spends
  // Supabase Auth's own rate limit on a request that was never going
  // anywhere. Rate-limited by IP since the shortcut that reaches this page
  // is, by design, discoverable by anyone.
  const ip = await clientKey();
  if (!consumeRateLimit(`admin-login:${ip}`, CODE_ATTEMPTS_PER_WINDOW, CODE_WINDOW_MS)) {
    return { success: false, error: RATE_LIMITED_ERROR };
  }

  if (!verifyAdminCode(parsed.data.adminCode)) {
    return { success: false, error: INVALID_CODE_ERROR };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { success: false, error: GENERIC_LOGIN_ERROR };
  }

  // signInWithPassword succeeds for ANY valid Supabase credential, including a
  // teacher's. The admin_accounts row -- not the Supabase session -- is the
  // actual authorization boundary, so a non-admin who authenticates here is
  // signed back out immediately rather than left holding a live session that
  // only /admin/login happened to grant.
  const { data: profile, error: profileError } = await supabase
    .from("admin_accounts")
    .select("id, is_active")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { success: false, error: NOT_ADMIN_ERROR };
  }

  await recordAuditLog({ action: "admin.login" });

  return { success: true };
}

export async function signOutAdmin(): Promise<AdminActionResult> {
  const supabase = await createSupabaseServerClient();

  // Logged before signOut(), not after: record_audit_log() requires an
  // authenticated admin session (is_admin() checks auth.uid()), which no
  // longer exists once the session is torn down.
  await recordAuditLog({ action: "admin.logout" });

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: "로그아웃에 실패했습니다. 다시 시도해 주세요." };
  }

  return { success: true };
}
