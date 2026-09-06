import { z } from "zod";

// No signup schema: there is no public admin signup route. Admin accounts are
// provisioned only via apps/web/scripts/create-admin.ts.
//
// adminCode is a separate, shared pre-gate in front of this real login (see
// docs/adr/0006-hidden-admin-entry.md) -- verified server-side against
// ADMIN_CODE_HASH before email/password are ever checked. It is not itself
// an admin credential.
export const adminLoginSchema = z.object({
  adminCode: z.string().min(1, "관리자 코드를 입력해 주세요."),
  email: z
    .string()
    .trim()
    .min(1, "이메일을 입력해 주세요.")
    .email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
